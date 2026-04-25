# Dev Plan — AI-Based File Transformation (Hobby-compatible)

**Version:** 1.0
**Date:** April 16, 2026
**Status:** `planned`
**Owner:** Engineering
**Related documents:**
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — current architecture
- [`docs/dev-plan-ai-augmented-rules.md`](./dev-plan-ai-augmented-rules.md) — Phase 1 work that established the chunked-batch pattern this plan reuses
- [`docs/guides/AI-rules-setup.md`](./guides/AI-rules-setup.md) — companion guide for the rule pipeline
- [`docs/dev-history.md`](./dev-history.md) — development log (entry v5 to be added)

---

## 1. Context

### Problem

The current upload pipeline in `src/app/api/files/upload/route.ts` uses a strict regex (`identifyFile()`) to identify the account code and period from a CSV file's first line. The regex is anchored to the canonical 1C OSV header format:

```
по счету 62 за 2025 г.;
```

If a customer exports a slightly different header — different 1C version, custom report template, alternative wording, extra metadata rows, or a different separator — the regex returns null, the file is stored with `parseStatus: 'warning'`, and the analysis route silently skips it. The user sees an empty inbox with no actionable error.

Two prompts already exist in the codebase as **stubs** for this exact use case but are not wired into any code path:

- `file_recognition` — identify account code, period, document type from a CSV preview
- `data_extraction` — extract full structured `ParsedAccountData` from non-canonical CSVs

The `uploaded-files` collection already has the necessary infrastructure:

- `parseStatus` enum (`pending`, `recognizing`, `parsing`, `success`, `warning`, `error`)
- `aiRecognitionLog` (JSON field) for AI call logs
- `parsedData` (JSON, currently `{ raw: string }`) — can be extended

### Goal

Add a **deterministic-first, AI-fallback** file transformation pipeline that:

1. Tries the existing regex parser first (free, instant, reliable for canonical 1C exports)
2. Falls back to an AI **recognition** step when the regex fails — solves the most common case (header variations) cheaply
3. Falls back to a full AI **extraction** step when even with hints the structured parse fails — handles truly unusual CSV layouts
4. Caches AI results so analysis re-runs are free
5. **Stays within Vercel Hobby's 10-second function timeout** by chunking the AI work the same way the rule pipeline does (client polls a batch endpoint)
6. Degrades gracefully — if AI is disabled or unavailable, the system behaves exactly as today (no regression)

### Non-goals

- Replacing the deterministic `parseOSVFile` for canonical files (it's free and reliable; only fall back when needed)
- Building a generic CSV parser for arbitrary financial systems (scope is "1C OSV variants")
- Streaming AI responses (would help latency but doesn't extend Vercel function timeouts)
- Background queue infrastructure (Inngest/Vercel Queue) — chunked polling is sufficient

---

## 2. Target Architecture

### Current flow

```
POST /api/files/upload (synchronous, ~1-2 s)
   │
   ├─ for each file:
   │   ├─ identifyFile() (regex on first line)
   │   ├─ store as uploaded-files with parsedData={raw}
   │   │   parseStatus = 'success' if regex matched, 'warning' otherwise
   │   └─ NO actual structured parse here — happens later in /api/analysis/run
   │
   └─ return list of uploaded files

POST /api/analysis/run
   ├─ for each file:
   │   ├─ parseOSVFile(raw) (full structured parse)
   │   └─ if parse throws → push to parseErrors, skip file
   └─ if zero files parsed → return error "Не удалось распознать ни одного файла"
```

**Failure mode:** unusual headers → regex returns null → stored as `warning` → `parseOSVFile` throws → file silently dropped from analysis.

### Target flow (Hobby-compatible)

```
POST /api/files/upload (synchronous, fast — no AI)
   │
   ├─ for each file:
   │   ├─ Try identifyFile() (regex)
   │   ├─ If matched → try parseOSVFile()
   │   │   ├─ Success → parseStatus='success', store parsedData={raw, parsed}
   │   │   └─ Throws → parseStatus='needs_ai_recognition', store parsedData={raw}
   │   └─ If regex failed → parseStatus='needs_ai_recognition', store parsedData={raw}
   │
   └─ return { files, needsAi: <count needing AI> }

Client polls POST /api/files/ai-recognize-batch (when needsAi > 0)
   │  Batch size: 2 files per call (each call ≤ 7 s wall time)
   │
   ├─ for each file with parseStatus='needs_ai_recognition':
   │   ├─ callAI({ promptKey: 'file_recognition', preview: first 50 lines })
   │   │   ├─ Returns { accountCode, period, documentType, columnFormat? }
   │   │   ├─ Cost: ~$0.005, latency: 2-3 s
   │   │   └─ Stored in aiRecognitionLog
   │   │
   │   ├─ Re-attempt parseOSVFile() with AI-provided hints
   │   │   ├─ Success → parseStatus='success', store parsedData={raw, parsed, aiHints}
   │   │   └─ Fails → parseStatus='needs_ai_extraction'
   │   │
   │   └─ Update uploaded-files record
   │
   └─ return { processed, remaining, failed, done }

Client polls POST /api/files/ai-extract/[id] (when needs_ai_extraction items remain)
   │  ONE FILE PER CALL — extraction is the expensive step
   │
   ├─ Truncate file content if > 100 KB (with warning logged)
   ├─ callAI({ promptKey: 'data_extraction', accountCode, period, data })
   │   ├─ Returns full ParsedAccountData JSON
   │   ├─ Cost: ~$0.10 - $0.30 per file (depends on size)
   │   └─ Latency: 5-9 s — must fit 10 s timeout
   │
   ├─ validateParsedAccountData() — schema check + numeric sanity
   │   ├─ Valid → parseStatus='success', store parsedData={raw, aiParsed: ParsedAccountData}
   │   └─ Invalid → parseStatus='error', store reason
   │
   └─ return { ok, fileId, parseStatus }

POST /api/analysis/run (unchanged interface, smarter internals)
   │
   ├─ for each uploaded-file:
   │   ├─ Prefer parsedData.parsed (deterministic)
   │   ├─ Else parsedData.aiParsed (AI extraction, cached)
   │   ├─ Else try parseOSVFile(raw) on the fly (last-ditch)
   │   └─ Else skip with warning
   │
   └─ runRulesEngine() + persist as before
```

### Why this fits Vercel Hobby

| Endpoint | Wall time per call | Fits 10s? |
|----------|-------------------|-----------|
| `POST /api/files/upload` | ~1-2 s (no AI) | ✅ |
| `POST /api/files/ai-recognize-batch` (2 files) | ~5-7 s | ✅ |
| `POST /api/files/ai-extract/[id]` (1 file) | ~5-9 s | ✅ (with file size cap) |

For a typical 7-file upload with 3 needing AI:
- Upload: 1 call, ~2 s
- Recognition: 2 calls (3 files batched at 2/call), ~12 s perceived (with progress)
- Extraction: rare, only if recognition + lenient parser fail — 1 call per problem file

**Critical constraint:** `data_extraction` is the only step at risk of timing out. Mitigations:
- Hard 100 KB file size cap before sending; truncate + warn
- 9 s per-call timeout in the analyzer (under Hobby's 10 s)
- Always retain `parsedData.raw`, so a future re-attempt is possible
- Mark file `parseStatus='error'` rather than failing the whole analysis

---

## 3. Type Changes

Extend `parsedData` shape (it's a JSON field — no schema migration needed, just convention):

```typescript
// src/types/index.ts
export interface UploadedFileParsedData {
  raw: string                          // original file content (always present)
  parsed?: ParsedAccountData           // deterministic regex parse result (preferred)
  aiParsed?: ParsedAccountData         // AI extraction result (used when parsed missing)
  aiHints?: {                          // AI recognition output, may help re-parse
    accountCode: string
    period: string
    documentType: string
    columnFormat?: '7-col' | '8-col' | 'unknown'
  }
  truncated?: boolean                  // true if file was clipped before AI extraction
  truncatedAtBytes?: number
}

export interface AIRecognitionLog {
  attemptedAt: string                  // ISO date
  promptKey: 'file_recognition' | 'data_extraction'
  success: boolean
  durationMs: number
  inputBytes: number
  rawResponse?: string                 // first 500 chars for debugging
  error?: string
}
```

### Validator interface

```typescript
// src/lib/parser/validate.ts (new)
export function validateParsedAccountData(data: unknown): data is ParsedAccountData
```

Schema check + numeric sanity (sum of entity balances ≈ totals, account code is one of the 7 supported, etc.).

---

## 4. Files Affected

### New files

| Path | Purpose |
|------|---------|
| `src/lib/ai/file-extractor.ts` | Two functions: `aiIdentifyFile()` and `aiExtractData()`; wraps `callAI` with timeouts and validation |
| `src/lib/parser/validate.ts` | `validateParsedAccountData()` — schema + sanity check on AI output |
| `src/lib/parser/lenient-parser.ts` | `parseOSVFileWithHints()` — tolerant variant accepting AI-recognized accountCode/period to bypass header regex |
| `src/app/api/files/ai-recognize-batch/route.ts` | Batch endpoint — process 2 files per call: AI recognize + retry parse |
| `src/app/api/files/ai-extract/[id]/route.ts` | Single-file endpoint — full AI extraction for one file |
| `src/app/api/files/status/route.ts` | Returns aggregated upload status: `{ total, parsed, needsAi, failed }` |

### Modified files

| Path | Change |
|------|--------|
| `src/types/index.ts` | Add `UploadedFileParsedData`, `AIRecognitionLog` types |
| `src/lib/ai/prompts.ts` | **Rewrite** `data_extraction` system prompt to emit canonical `ParsedAccountData` JSON shape (current stub is too loose) |
| `src/app/api/files/upload/route.ts` | Try `parseOSVFile` synchronously; mark files needing AI; return `needsAi` count |
| `src/app/api/analysis/run/route.ts` | Prefer `parsedData.parsed` → `parsedData.aiParsed` → re-parse → skip |
| `src/lib/demo.ts` | No change (demo data is canonical) |
| `src/collections/UploadedFiles.ts` | Add `truncated` and `aiExtractFailedAt` fields if needed for UI |
| `src/globals/GlobalSettings.ts` | Add `aiFileExtractionEnabled`, `aiFileExtractionMaxKB`, `aiFileBatchSize` |
| `src/app/(frontend)/app/onboarding/page.tsx` | Show recognition/extraction progress; allow user to dismiss failed files |
| `docs/ARCHITECTURE.md` | Update file ingestion section |
| `docs/dev-history.md` | Add v5 entry |
| `docs/guides/` | Add `AI-file-extraction-setup.md` companion guide |

---

## 5. Implementation Phases

### Phase 0 — Preparation (0.5 day)

- [ ] Add `UploadedFileParsedData` and `AIRecognitionLog` types to `src/types/index.ts`
- [ ] Add `aiFileExtractionEnabled` (default `false`), `aiFileExtractionMaxKB` (default `100`), `aiFileBatchSize` (default `2`) to `GlobalSettings`
- [ ] Run `npm run generate:types`
- [ ] Verify two existing prompts (`file_recognition`, `data_extraction`) are seeded in DB; if not, hit `/api/ai/seed-prompts`

### Phase 1 — AI Recognition (2 days)

This phase fixes 80% of failures (header variations) at low cost and low risk.

- [ ] Rewrite `data_extraction` system prompt in `src/lib/ai/prompts.ts` to emit strict `ParsedAccountData` JSON (defer wiring of extraction to Phase 2)
- [ ] Strengthen `file_recognition` prompt to also report `columnFormat: '7-col' | '8-col' | 'unknown'`
- [ ] Create `src/lib/parser/validate.ts` with `validateParsedAccountData()`
- [ ] Create `src/lib/parser/lenient-parser.ts`:
  - `parseOSVFileWithHints(content, hints)` — version that accepts external `accountCode` + `period` + `columnFormat`, bypassing the first-line regex
  - Reuses the same column parsers from `osv-parser.ts`
- [ ] Create `src/lib/ai/file-extractor.ts`:
  - `aiIdentifyFile(content, filename, userId)` → calls `file_recognition` prompt with first 50 lines
  - 5 s per-call timeout (well under Hobby budget)
  - Returns `{ accountCode, period, documentType, columnFormat } | null`
- [ ] Update `POST /api/files/upload`:
  - For each file: try `identifyFile` (regex) + `parseOSVFile`. On success store `parsedData.parsed`
  - On failure store `parsedData.raw` only and set `parseStatus='needs_ai_recognition'`
  - Return `{ files, needsAi }`
  - **No AI calls from this endpoint** — keep it under 2 s
- [ ] Create `POST /api/files/ai-recognize-batch`:
  - Find next 2 files where `parseStatus='needs_ai_recognition'`
  - For each: `aiIdentifyFile()` → if success, `parseOSVFileWithHints()` → if success, set `parseStatus='success'`, store `parsedData.parsed` and `aiHints`
  - On parse failure post-AI: set `parseStatus='needs_ai_extraction'` (Phase 2 territory) — for Phase 1, leave them as `warning` so they're handled in Phase 2
  - Concurrency: 2 (parallel AI calls)
  - Total wall time budget: 7 s
  - Return `{ processed, recovered, remaining, failed, done }`
- [ ] Create `GET /api/files/status`:
  - Aggregate counts of uploaded files by `parseStatus` for the current user
- [ ] Update `POST /api/analysis/run`:
  - Read `parsedData.parsed` first; if absent, try `parseOSVFile(parsedData.raw)` as fallback (existing behavior)
  - Skip files with `parseStatus='error'`
- [ ] Update onboarding UI:
  - Show "Распознаём X файлов..." progress when `needsAi > 0`
  - Poll `/api/files/ai-recognize-batch` until `done: true`
  - Display per-file status icons (success / warning / error)

**Validation checklist for Phase 1:**

- Test with canonical 1C export → `parseOSVFile` succeeds, no AI call ever made
- Test with file having modified header text (e.g., "Оборотно-сальдовая ведомость по счёту 62 за период 01.01.2025-31.12.2025") → regex fails, AI recognition recovers, lenient parser succeeds
- Test with `aiFileExtractionEnabled: false` → unrecognized files keep `parseStatus='warning'`, no AI call made, analysis runs with successfully-parsed files only
- Test with missing `ANTHROPIC_API_KEY` → batch endpoint returns gracefully, files marked as recognition-failed
- Test with truly malformed file → recognition succeeds but lenient parser still fails → marked `needs_ai_extraction` (deferred to Phase 2)

### Phase 2 — AI Full Extraction (2 days)

For the rare cases where AI recognition succeeds but the lenient parser still can't extract data (custom column orders, embedded subtotals, etc.).

- [ ] Add `aiExtractData(content, accountCode, period, userId)` to `src/lib/ai/file-extractor.ts`:
  - 9 s per-call timeout (1 s safety buffer below Hobby limit)
  - Truncate `content` to `aiFileExtractionMaxKB` if larger; record `truncatedAtBytes` in `parsedData`
  - Returns `ParsedAccountData | null` (null on validation failure)
- [ ] Create `POST /api/files/ai-extract/[id]`:
  - Single file per call (extraction can be slow)
  - Authorize: must be owner or admin
  - Run AI extraction; on success store `parsedData.aiParsed`, set `parseStatus='success'`
  - On failure set `parseStatus='error'`, store `parseErrors`
  - Append to `aiRecognitionLog`
- [ ] Update `POST /api/analysis/run`:
  - Read order: `parsedData.parsed` → `parsedData.aiParsed` → `parseOSVFile(raw)` fallback
- [ ] Update onboarding UI:
  - For files in `needs_ai_extraction`: trigger `/api/files/ai-extract/[id]` one at a time
  - Show file size warning if > 100 KB ("Файл будет обрезан для AI-извлечения")
  - Display extraction progress per file
- [ ] Add admin retry endpoint `POST /api/files/[id]/retry-extraction` for manual re-attempts after a prompt fix

**Validation checklist for Phase 2:**

- Custom column-order CSV → recognition + lenient parser fail → AI extraction succeeds, validates, runs through analysis
- 200 KB file → truncated to 100 KB, warning shown, extraction succeeds with caveat
- AI returns malformed JSON → validation rejects, file marked error, raw still available for manual review
- AI extraction times out at 9 s → file marked error, retry button surfaces in UI

### Phase 3 — Hardening (1 day)

- [ ] Add per-user daily AI extraction quota (e.g., 20 files/day default) to prevent runaway costs from one user uploading many large files
- [ ] Surface `aiRecognitionLog` in admin panel via custom field component (read-only viewer)
- [ ] Add `analysis-results.aiFileExtractionCost` aggregating costs from this pipeline
- [ ] Add observability: track recognition success rate, lenient parse success rate (post-recognition), extraction success rate
- [ ] Document the prompt authoring patterns in `docs/guides/AI-file-extraction-setup.md`
- [ ] Update `docs/dev-history.md` entry status to `shipped`

---

## 6. Cost Model

### Per-call assumptions

| Step | Input tokens | Output tokens | Cost per call |
|------|-------------|---------------|---------------|
| `file_recognition` | ~1,000 (50 lines) | ~150 (small JSON) | ~$0.005 |
| `data_extraction` | 5,000-15,000 (full file) | 3,000-12,000 (entities JSON) | $0.06 - $0.23 |

### Per-upload estimates

Assume a 7-file upload (typical onboarding):

| Scenario | AI calls | Total cost |
|----------|----------|------------|
| All canonical (regex works) | 0 | $0.00 |
| Header variation, lenient parse OK | 7 × recognition | ~$0.04 |
| Mix: 5 canonical + 2 needing recognition | 2 × recognition | ~$0.01 |
| Worst case: all need full extraction | 7 × recognition + 7 × extraction | ~$1.00 - $1.60 |

**Realistic average per onboarding:** $0.05 - $0.15. Recognition is cheap and handles most cases; extraction is expensive but rarely triggered.

### Budget projection

For 100 active users completing onboarding monthly: ~$10/month. Negligible compared to the rule analysis pipeline.

### Cost mitigations (built into design)

- Deterministic-first: free path always tried before any AI call
- Recognition before extraction: cheap step gates the expensive step
- File size cap (100 KB default): caps maximum extraction cost
- Per-user daily quota (Phase 3): hard cap on runaway users
- Caching in `parsedData.aiParsed`: extraction runs once per file, ever

---

## 7. Vercel Compatibility

### Wall time per endpoint on Hobby (10 s timeout)

| Endpoint | Files per call | Operations | Wall time | Buffer |
|----------|----------------|------------|-----------|--------|
| `/api/files/upload` (10 files) | 10 | regex + parseOSVFile per file (~50ms each) | ~1.5 s | 8.5 s |
| `/api/files/ai-recognize-batch` | 2 | 2 × (recognize + lenient parse) | ~6 s | 4 s |
| `/api/files/ai-extract/[id]` | 1 | 1 × extract + validate | ~7 s | 3 s |
| `/api/files/status` | — | 1 aggregate query | <500 ms | — |

Per-call timeouts in code:
- Recognition: 5 s
- Extraction: 9 s

### Wall time per onboarding (perceived by user)

For a 7-file upload with 2 files needing AI recognition:

```
Upload                  ~2 s
Recognition (1 batch)   ~6 s
Total perceived         ~8 s   (with progress indicator)
```

For the worst case (7 files, all needing extraction):

```
Upload                          ~2 s
Recognition (4 batches)         ~24 s   (2 files per batch)
Extraction (7 sequential)       ~49 s
Total perceived                 ~75 s   (with per-file progress)
```

A 75 s onboarding is acceptable when each step shows clear progress. It's also rare — most uploads complete under 10 s with no AI involvement.

### Pro tier comparison

If you upgrade to Pro (60 s default):
- Upload could optionally do AI inline for small uploads
- Recognition batch could process 5-8 files per call
- Extraction could process 2-3 files per call

Recommendation: keep the chunked design even on Pro — better UX, fault tolerance, and same code path.

---

## 8. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | AI extraction times out on Hobby for large files | High | High | 100 KB hard cap + truncation; 9 s per-call timeout; clear "file too large" warning in UI |
| 2 | AI hallucinates wrong account totals | Medium | High | `validateParsedAccountData()` checks: account code in known set, totals match sum of entities (±1% tolerance), no negative-where-positive expected |
| 3 | Cost spike from one user uploading 100 large files | Low | High | Per-user daily quota (Phase 3); per-upload max 10 files (already enforced) |
| 4 | Extraction succeeds but produces subtly wrong numbers | Medium | Critical | Validator catches gross errors; surface `aiParsed` in admin with diff vs `raw` for manual review; mark recommendations from AI-extracted data with a badge |
| 5 | Anthropic rate limit during burst | Low | Medium | Concurrency cap of 2 in batch endpoints; respect `Retry-After` |
| 6 | User uploads non-1C file entirely (e.g., random spreadsheet) | Medium | Low | `file_recognition` returns `accountCode: null` or invalid → reject early before extraction |
| 7 | Recognition succeeds but lenient parser bug produces empty `entities[]` | Medium | Medium | Validator requires `entities.length > 0`; falls through to extraction |
| 8 | Phase 2 extraction prompt too brittle to schema changes | Medium | Medium | `version` field on prompts; admin can roll forward/back |
| 9 | Truncated extraction produces incomplete data | Medium | Medium | Mark `parsedData.truncated = true`; UI surfaces "частичные данные" warning; user can re-upload smaller file |

---

## 9. Acceptance Criteria

### Phase 1 done when:

1. Upload of canonical 1C files makes zero AI calls (regex path)
2. Upload of header-variant files (mid-Phase-1 test corpus of 5+ examples) succeeds via AI recognition + lenient parser
3. `aiFileExtractionEnabled: false` → no AI calls, behavior identical to pre-Phase-1
4. Removing `ANTHROPIC_API_KEY` → unrecognized files keep `parseStatus='warning'`, analysis still runs on recognized ones
5. Each `/api/files/ai-recognize-batch` call completes within 8 s on Hobby
6. Onboarding UI shows recognition progress with per-file status

### Phase 2 done when:

1. Files that recognition resolves but lenient parser cannot still get extracted via full AI
2. Files > 100 KB are truncated with user-visible warning
3. AI extraction validator rejects malformed JSON; file goes to `parseStatus='error'` with retry available
4. Each `/api/files/ai-extract/[id]` call completes within 10 s on Hobby
5. Cost per onboarding for typical mixed corpus stays under $0.20

### Phase 3 done when:

1. Per-user daily AI quota enforced; users see clear message when hit
2. Admin panel surfaces `aiRecognitionLog` for forensic review
3. Setup guide `docs/guides/AI-file-extraction-setup.md` published
4. `docs/dev-history.md` entry status updated to `shipped`

---

## 10. Effort & Sequencing

| Phase | Effort | Dependencies | Can ship independently |
|-------|--------|-------------|----------------------|
| Phase 0 — Prep | 0.5 day | — | No |
| Phase 1 — AI Recognition | 2 days | Phase 0 | **Yes** — solves 80% of failure cases |
| Phase 2 — Full Extraction | 2 days | Phase 1 validated | Yes — handles the long tail |
| Phase 3 — Hardening | 1 day | Phase 2 | Yes |
| **Total** | **~5.5 days** | | |

### Recommended go-live sequence

1. **Ship Phase 0 + Phase 1** to production with `aiFileExtractionEnabled: false` initially
2. **Manually test** with 5-10 real customer file variants (collect from support tickets)
3. **Enable** `aiFileExtractionEnabled: true` and observe for 2-3 days
4. **Proceed with Phase 2** if Phase 1 success rate < 90% on real data
5. **Phase 3 hardening** after Phase 2 stable

---

## 11. Reuse from Phase 1 (AI Rules) Work

This plan deliberately mirrors the architectural choices from `docs/dev-plan-ai-augmented-rules.md`:

| Pattern | Rules pipeline | File pipeline |
|---------|----------------|---------------|
| Synchronous endpoint returns fast | `/api/analysis/run` (~2 s) | `/api/files/upload` (~2 s) |
| Chunked AI batch endpoint, client polls | `/api/analysis/ai-enhance-batch` | `/api/files/ai-recognize-batch` + `/api/files/ai-extract/[id]` |
| Status endpoint for client polling | `/api/analysis/status` | `/api/files/status` |
| Static fallback when AI disabled / fails | `fallback-templates.ts` | `parseOSVFile` (regex) |
| Per-call AI timeout | 15 s in analyzer | 5 s recognition / 9 s extraction |
| Bounded concurrency | 3 candidates per batch | 2 files per batch |
| GlobalSettings flag | `aiRulesEnabled` | `aiFileExtractionEnabled` |
| Default off | `false` | `false` |

This reuse means:
- The team already knows the chunked-polling pattern
- The UI polling primitive can be shared
- Cost / event logging plumbing (`callAI`, `ai-usage-logs`, `event-log`) is identical
- Validation, fallback, and degradation patterns are already proven

---

## 12. Open Questions

| # | Question | Owner | Resolution needed by |
|---|----------|-------|---------------------|
| 1 | What CSV file size do real customers actually export? Inform the 100 KB cap | Product / support | Before Phase 1 |
| 2 | Do we need to support `.xlsx` upload via AI extraction, or only CSV? Current upload accepts xlsx but the parser doesn't handle it | Product | Before Phase 2 |
| 3 | Should AI-extracted recommendations carry a visible "AI-extracted source" badge to end users? | Product / UX | Before Phase 2 |
| 4 | Per-user daily quota threshold: 10 / 20 / 50 files? | Product | Before Phase 3 |
| 5 | Should we collect a corpus of "weird CSV variants" from support tickets for validation? | Engineering / support | Before Phase 1 ships |
| 6 | Acceptable validator tolerance for "totals match sum of entities" (1%, 5%, exact)? | Engineering | Before Phase 2 |

---

*Authored 2026-04-16. Status: planned. Awaiting kickoff approval.*
