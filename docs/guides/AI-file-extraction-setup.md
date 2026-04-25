# Guide — Setting Up & Using AI-Based File Transformation

**Audience:** Engineers, ops, admins
**Related:**
- [`docs/dev-plan-ai-file-extraction.md`](../dev-plan-ai-file-extraction.md) — design rationale
- [`docs/guides/AI-rules-setup.md`](./AI-rules-setup.md) — companion guide for the rules pipeline (same patterns)
- [`docs/dev-history.md`](../dev-history.md) — change history (entry v5)

---

## What this is

Until v5, the system used a strict regex to identify 1C OSV CSV files by their first line. If a customer's 1C export had even slightly different header text, the file was silently dropped from analysis.

The new pipeline tries three stages in sequence, falling back only when the previous stage fails:

| Stage | What it does | Cost | Latency | Handles |
|-------|-------------|------|---------|---------|
| **1. Deterministic regex** | Parse canonical 1C OSV header + columns | Free | Instant | Standard 1C exports (~95% of cases) |
| **2. AI recognition + lenient parser** | Extract account code/period/format hints, then re-parse with relaxed preamble handling | ~$0.005/file | ~3-4s | Header variations, extra preamble rows, alternate wording |
| **3. AI full extraction** | Send full file to Claude, get structured JSON back, validate | ~$0.10-0.30/file | ~7-9s | Custom column orders, embedded subtotals, completely non-standard layouts |

Files that fail all three stages are marked `error` and surface to the user with an actionable message.

---

## Architecture at a glance

```
File upload → /api/files/upload (≤2s, no AI)
     │
     ├─ identifyFile() (regex) + parseOSVFile()
     │      ├─ success → parsedData.parsed, parseStatus='success'
     │      └─ failure → parseStatus='needs_ai_recognition'
     │
     └─ Returns { files, needsAi: <count> }

Client polls /api/files/ai-recognize-batch (≤7s, 2 files per call)
     │
     ├─ aiIdentifyFile() → { accountCode, period, columnFormat }
     ├─ parseOSVFileWithHints() (lenient parser using AI hints)
     │      ├─ success → parsedData.parsed, parseStatus='success'
     │      └─ failure → parseStatus='needs_ai_extraction'
     │
     └─ Returns { processed, recovered, remaining, failed, done }

Client polls /api/files/ai-extract-next (≤9s, 1 file per call)
     │
     ├─ aiExtractData() → full ParsedAccountData JSON
     ├─ validateParsedAccountData() (schema + sanity)
     │      ├─ valid → parsedData.aiParsed, parseStatus='success'
     │      └─ invalid → parseStatus='error'
     │
     └─ Returns { processed, ok, fileId, truncated?, error? }

GET /api/files/status (used by client to know when to stop polling)
     └─ Returns { total, success, needsRecognition, needsExtraction, warning, failed, done }
```

All three stages are **opt-in** — the new path only activates when an admin sets `aiFileExtractionEnabled: true` in `GlobalSettings`.

---

## Part 1 — One-time setup

### 1.1 Environment variables

Same as the rules pipeline:

```env
ANTHROPIC_API_KEY=sk-ant-...
PAYLOAD_SECRET=<at least 32 chars>
PAYLOAD_PUBLIC_SERVER_URL=https://your-domain.example
MONGODB_URI=mongodb+srv://...
```

Without `ANTHROPIC_API_KEY`, AI recognition + extraction are skipped — files that don't parse via regex are marked `warning` (legacy behavior).

### 1.2 Generate Payload types if you pulled changes

```bash
npm run generate:types
npx tsc --noEmit
```

### 1.3 Seed (or upgrade) the AI prompts

Two prompts exist for this pipeline: `file_recognition` and `data_extraction`. They were authored as stubs in `DEFAULT_PROMPTS` long before the pipeline was wired up — so they may already exist in your database with **outdated v1 content**. The v2 versions added in v5 are stricter and handle more edge cases.

**Option A — fresh database (no existing prompts):**

Admin panel → Dashboard → click **Seed Prompts** button (or `POST /api/ai/seed-prompts`).

**Option B — existing database (upgrade v1 → v2):**

```bash
# Authenticated as admin (cookie set by logging into admin panel)
curl -X POST 'https://your-domain.example/api/ai/seed-prompts?upsert=true' \
  -H "Cookie: payload-token=<your-admin-cookie>"
```

The `?upsert=true` flag overwrites existing prompts with the in-code defaults and bumps the version. Without it, existing rows are skipped.

Verify in admin panel → AI-промпты:

- `file_recognition` should show `version: 2`, system prompt mentioning `columnFormat`
- `data_extraction` should show `version: 2`, system prompt with explicit `ParsedAccountData` JSON schema

### 1.4 Configure global settings

Admin panel → Globals → Настройки. Set:

| Field | Value | Why |
|-------|-------|-----|
| `aiEnabled` | ✅ `true` | Master switch for AI features |
| **`aiFileExtractionEnabled`** | ✅ `true` | **Master switch for the new file pipeline** |
| **`aiFileExtractionMaxKB`** | `100` | Files larger than this are truncated before extraction (Phase 2). Tune up to 500 if your customers have large files |
| **`aiFileBatchSize`** | `2` (Hobby) / `3-5` (Pro) | Files per recognition batch |

Save.

### 1.5 Verify it's working

Quick smoke test as a regular user:

1. Upload a canonical 1C CSV → should complete in ~2s, **zero AI calls**
2. Upload a CSV with a modified header (add an extra preamble row before the standard header) → should trigger Phase 1 recognition, recover, and process normally
3. Check admin panel → Загруженные файлы to see `parseStatus`, `aiHints`, `aiRecognitionLog` populated correctly

---

## Part 2 — How the pipeline runs

### 2.1 The user's perspective

1. User uploads CSV files via the onboarding wizard
2. Backend immediately stores files; canonical ones marked `success`, unrecognized ones marked `needs_ai_recognition`
3. The wizard advances to the analysis screen with stages:
   - **AI-распознавание файлов** (only shown if any file needs recognition) — "X из Y" progress
   - **AI-извлечение данных** (only shown if any file needs extraction) — "X из Y" progress
   - **Расчёт метрик**, **Проверка правил**, **Формирование рекомендаций** as before
4. Each stage updates with progress indicators
5. Files that fail all stages are skipped; analysis runs on what successfully parsed

### 2.2 The endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/files/upload` | Synchronous parse + classify; ~2s, no AI |
| `POST` | `/api/files/ai-recognize-batch` | AI recognition for next K files (default 2) |
| `POST` | `/api/files/ai-extract-next` | AI full-extraction for next 1 file |
| `GET`  | `/api/files/status` | Aggregated counts by parseStatus |
| `POST` | `/api/ai/seed-prompts` | Insert prompts (admin) |
| `POST` | `/api/ai/seed-prompts?upsert=true` | Update existing prompts (admin) |

### 2.3 Manually exercising the pipeline

```bash
# 1. Upload files (multipart form)
curl -X POST https://your-domain.example/api/files/upload \
  -H "Cookie: payload-token=<your-cookie>" \
  -F "files=@/path/to/file1.csv" \
  -F "files=@/path/to/file2.csv"
# → { ok: true, files: [...], needsAi: 1, aiAvailable: true }

# 2. Run recognition until done
while true; do
  RESULT=$(curl -s -X POST https://your-domain.example/api/files/ai-recognize-batch \
    -H "Cookie: payload-token=<your-cookie>" \
    -H "Content-Type: application/json" \
    -d '{"batchSize": 2}')
  echo "$RESULT"
  if echo "$RESULT" | grep -q '"done":true'; then break; fi
  sleep 1
done

# 3. Run extraction (only if recognition + lenient parser couldn't recover all files)
while true; do
  RESULT=$(curl -s -X POST https://your-domain.example/api/files/ai-extract-next \
    -H "Cookie: payload-token=<your-cookie>")
  echo "$RESULT"
  if echo "$RESULT" | grep -q '"done":true'; then break; fi
  sleep 1
done

# 4. Check final state
curl -s https://your-domain.example/api/files/status \
  -H "Cookie: payload-token=<your-cookie>"
# → { total: 7, success: 6, warning: 1, failed: 0, ... done: true }
```

---

## Part 3 — Prompt details

### 3.1 `file_recognition` (v2)

**Purpose:** Identify what kind of file this is from a small preview.

**Variables in `userPromptTemplate`:**
- `{filename}` — original filename
- `{preview}` — first 50 lines of the file

**Expected output (strict JSON):**
```json
{
  "accountCode": "62",
  "period": "2025 г",
  "documentType": "ОСВ по счёту 62",
  "columnFormat": "7-col"
}
```

`columnFormat` is one of `"7-col"` (accounts 60, 62, 90.01, 90.02), `"8-col"` (accounts 10, 41, 45, recognized by the "БУ" marker), or `"unknown"`.

**Cost:** ~$0.005 per call. **Latency:** 2-3s. **Per-call timeout:** 5s.

### 3.2 `data_extraction` (v2)

**Purpose:** Full structured extraction when even AI recognition + lenient parser can't recover the file.

**Variables in `userPromptTemplate`:**
- `{accountCode}` — from prior recognition
- `{period}` — from prior recognition
- `{columnFormat}` — `'7-col'` / `'8-col'` / `'unknown'`
- `{data}` — file content, truncated to `aiFileExtractionMaxKB` if larger

**Expected output (strict JSON):**
```json
{
  "accountCode": "62",
  "period": "2025 г",
  "totals": { "openingDebit": 0, "openingCredit": 0, ... },
  "entities": [
    {
      "name": "ООО Контрагент",
      "totals": { "openingDebit": 0, ... },
      "monthly": []
    }
  ]
}
```

**Validation** (in `src/lib/parser/validate.ts`):
- `accountCode` must be one of `["10", "41", "45", "60", "62", "90.01", "90.02"]`
- `period` non-empty string
- `totals` has all 6 required numeric fields
- Each entity in `entities[]` has `name` (non-empty) and `totals` (all 6 fields)
- Sum of entity closing balances must match account totals within 5% tolerance

If validation fails, the file is marked `error` with the validation reason. The raw file content is preserved so a future re-attempt is possible.

**Cost:** ~$0.10-0.30 per call (depends on file size). **Latency:** 5-9s. **Per-call timeout:** 9s.

---

## Part 4 — Operations

### 4.1 Monitoring AI cost for files

Same `ai-usage-logs` collection as the rules pipeline. Filter by `promptKey`:

| `promptKey` | Stage |
|-------------|-------|
| `file_recognition` | Phase 1 — AI recognition |
| `data_extraction` | Phase 2 — AI full extraction |
| `rule_dz1` | (Different pipeline) Per-rule analysis |
| `audit_working_capital` | (Legacy) Strategic AI audit |
| `enhance_recommendation` | (Legacy) Manual single-rec enhancer |

```bash
curl "https://your-domain.example/api/ai-usage-logs?where[promptKey][equals]=data_extraction&limit=100" \
  -H "Cookie: payload-token=<admin-cookie>"
```

### 4.2 Forensic review of a specific file

For any uploaded file, the admin panel → Загруженные файлы → click a row shows:

- `parseStatus` — current state in the pipeline
- `accountCode` / `period` / `detectedType` — what was identified (deterministic or AI)
- `parseErrors` — JSON with the failure reason if applicable
- `aiRecognitionLog` — array of all AI attempts, each with timestamp, prompt key, success, duration, raw response (first 500 chars), and error code

This is the primary debugging surface when a customer reports "my file didn't parse correctly."

### 4.3 Disabling the pipeline in an emergency

Two options, in order of severity:

**Stop AI for new uploads (instant, recoverable):**

Admin panel → Globals → Настройки → uncheck `aiFileExtractionEnabled` → save.

Effect: subsequent uploads of unrecognized files are marked `warning` (legacy behavior), no AI call is made. Already-parsed files are unaffected.

**Hard kill — remove the API key:**

Remove `ANTHROPIC_API_KEY` from environment and redeploy. All AI features stop; only the deterministic regex parser remains.

### 4.4 Forcing re-extraction of a failed file

For files in `parseStatus='error'`:

1. Admin panel → Загруженные файлы → open the failed row
2. Manually change `parseStatus` to `needs_ai_extraction`
3. Save
4. Either wait for the user to trigger another analysis (which will pick it up) OR call `POST /api/files/ai-extract-next` directly

This is useful after editing the `data_extraction` prompt — bumped to a new version, you can retry previously-failed files.

---

## Part 5 — Common scenarios & troubleshooting

### Scenario: I enabled the pipeline but unrecognized files still show `warning`

Checklist:

1. Is `aiFileExtractionEnabled: true` in admin panel → Settings?
2. Is `ANTHROPIC_API_KEY` set in env? Hit `GET /api/ai/status` → expect `{ available: true }`
3. Did you actually upload a NEW file after enabling the toggle? Files uploaded before the switch was flipped are still in their old state — re-upload them
4. Is the `file_recognition` prompt seeded? Check admin panel → AI-промпты for the row
5. If using v1 prompts (pre-v5), upgrade them via `POST /api/ai/seed-prompts?upsert=true`

### Scenario: Recognition succeeds but file ends up in `needs_ai_extraction` and stays there

This means the recognition got the account code + period right, but the lenient parser still couldn't extract entities. The file is queued for Phase 2 extraction.

If the wizard finished without processing it, the user can re-trigger by re-running analysis (the next `/api/analysis/run` will skip the file with a warning). In the next onboarding flow, the wizard will pick it up.

To force processing: `POST /api/files/ai-extract-next` directly via curl (or, for admin, via the admin panel's manual flows).

### Scenario: AI extraction returns wrong totals (validator rejects)

The file is marked `error` with `parseErrors.reason: "validation_failed:closing_debit_mismatch:0.07"` (or similar).

This means the AI's sum of entity balances differed from the account totals by more than 5%. Common causes:

- AI dropped a few rows (e.g., truncation cutoff in a long file)
- AI miscounted (numbers sometimes slip)
- File genuinely has subtotals that AI included as entities, inflating the sum

Mitigation:

- Increase `aiFileExtractionMaxKB` to avoid truncation (Phase 1 limit: 500 KB)
- Edit the `data_extraction` system prompt to be more strict about excluding subtotal lines
- Bump prompt version and re-seed with `?upsert=true`
- Force-retry the file (see Part 4.4)

### Scenario: Extraction times out at 9s

Symptom: file marked `error` with `parseErrors.reason: "ai_timeout_or_unavailable"`.

Causes:

- File too large (Anthropic latency scales with input size)
- Temporary Anthropic latency spike

Mitigations:

- Reduce `aiFileExtractionMaxKB` to send less data (default 100 KB is conservative; some workflows may need lower like 50 KB)
- Retry later
- If consistent, upgrade to Vercel Pro for 60s timeout headroom (extraction has a hard 9s cap regardless, but the 1s safety buffer becomes more comfortable)

### Scenario: Cost is higher than expected

Check `ai-usage-logs` for the offender:

```sql
-- Pseudo-query (Payload doesn't speak SQL; use the admin panel filters)
filter: promptKey = 'data_extraction', sort: cost desc, limit 20
```

Most likely causes:
- A user uploading many large unusual files (extraction is the expensive step)
- A loop / runaway client (each `/api/files/ai-extract-next` is one extraction)

Quick fix: temporarily disable `aiFileExtractionEnabled` to stop bleeding while you investigate.

### Scenario: I want to test with a pathological file

Create a CSV with a deliberately weird header to exercise the AI path:

```csv
ОТЧЁТ ОТ 16.04.2026: Оборотно-сальдовая ведомость по счёту 62 за период с 01.01.2025 по 31.12.2025
;;;;;;
Период;Опер. дебет;Опер. кредит;... (custom column order)
ООО "Тестовый";100000;0;...
```

The deterministic regex won't match the first line. AI recognition should detect `accountCode: "62"`, `period: "2025"` (or similar). The lenient parser will try to parse from the column header line. If columns differ from the canonical 7/8-col layouts, recognition will succeed but the lenient parser will fail, and the file moves to `needs_ai_extraction` for Phase 2.

---

## Part 6 — Quick reference

### File locations

| What | Where |
|------|-------|
| Deterministic parser | `src/lib/parser/osv-parser.ts` |
| Lenient parser | `src/lib/parser/lenient-parser.ts` |
| Validator | `src/lib/parser/validate.ts` |
| AI extractor | `src/lib/ai/file-extractor.ts` |
| Recognition prompt | `src/lib/ai/prompts.ts` (`file_recognition`) |
| Extraction prompt | `src/lib/ai/prompts.ts` (`data_extraction`) |
| Upload endpoint | `src/app/api/files/upload/route.ts` |
| Recognition batch endpoint | `src/app/api/files/ai-recognize-batch/route.ts` |
| Extraction endpoint | `src/app/api/files/ai-extract-next/route.ts` |
| Status endpoint | `src/app/api/files/status/route.ts` |
| Onboarding UI | `src/components/OnboardingWizard.tsx` |

### parseStatus reference

| Value | Meaning |
|-------|---------|
| `pending` | Not yet processed (rare; transient) |
| `recognizing` | Reserved for future use |
| `parsing` | Reserved for future use |
| `needs_ai_recognition` | Deterministic parser failed; queued for Phase 1 AI recognition |
| `needs_ai_extraction` | AI recognition succeeded but lenient parser failed; queued for Phase 2 AI extraction |
| `success` | Parse complete, data available for analysis |
| `warning` | Parse partially succeeded (e.g., truncated) or AI disabled — analysis will skip |
| `error` | Parse failed at all stages |

### parsedData JSON shape (in `uploaded-files.parsedData`)

```typescript
{
  raw: string                       // always present
  parsed?: ParsedAccountData        // deterministic result (preferred)
  aiParsed?: ParsedAccountData      // AI extraction result (fallback)
  aiHints?: {                        // populated by AI recognition
    accountCode: string
    period: string
    documentType: string
    columnFormat?: '7-col' | '8-col' | 'unknown'
  }
  truncated?: boolean
  truncatedAtBytes?: number
}
```

### Cost model

| Per | Cost |
|-----|------|
| `file_recognition` call | ~$0.005 |
| `data_extraction` call (typical 50 KB file) | ~$0.10 |
| `data_extraction` call (truncated 100 KB) | ~$0.18 |
| Onboarding (7 files, all canonical) | $0.00 |
| Onboarding (7 files, 2 needing recognition) | ~$0.01 |
| Onboarding (7 files, 2 needing recognition + 1 needing extraction) | ~$0.11 |

### Settings reference

| Field | Default | Tune to |
|-------|---------|---------|
| `aiFileExtractionEnabled` | `false` | `true` to activate the new pipeline |
| `aiFileExtractionMaxKB` | `100` | `200-500` for customers with large files; `50` if extraction times out frequently |
| `aiFileBatchSize` | `2` | Up to `5` on Vercel Pro |

---

## Part 7 — When to escalate

Contact the platform team if you see:

- Sustained extraction failure rate >10% across users → likely a prompt issue or file format you haven't seen before; collect samples
- Daily file-AI cost trending above your monthly budget / 30 → enable hard cap (Phase 3 — not yet implemented)
- Repeated extraction timeouts at exactly 9s → Anthropic latency spike or file size cap too high
- Validator rejecting nearly all AI extractions → numeric tolerance may be too tight, OR the prompt is producing systematically wrong totals

---

*Last updated: 2026-04-16. Pipeline scope: deterministic parse + AI recognition (Phase 1) + AI full extraction (Phase 2). See [`docs/dev-plan-ai-file-extraction.md`](../dev-plan-ai-file-extraction.md) for Phase 3 hardening plans.*
