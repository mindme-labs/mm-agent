# MMLabs AI-Advisor — Development History Log

This document tracks all development specifications, plans, and architectural decisions for the MMLabs AI-Advisor product. Entries are ordered chronologically (oldest first). Each entry references the source document where the work is described in detail.

---

## Format

Each entry contains:

- **Version / ID** — sequential identifier
- **Date** — when the spec/plan was authored or initiative started
- **Title** — short description of the change
- **Source document** — path to the detailed spec
- **Status** — `planned` / `in-progress` / `shipped` / `superseded` / `cancelled`
- **Summary** — one-paragraph overview

---

## Entries

### v1 — Initial product implementation

- **Date:** 2026-04 (early)
- **Source document:** [`docs/cursor-dev-spec.md`](./cursor-dev-spec.md)
- **Status:** `shipped` (superseded by v2)
- **Summary:** First development specification used to build the initial product. Established the Next.js + Payload CMS + MongoDB architecture, the 9-rule deterministic engine, the 1C OSV CSV parser, the auth flow with JWT cookies, and the initial admin panel. Targeted Claude Opus 4.6 MAX in Cursor IDE for code generation. Based on requirements `mmlabs-requirements-complete-v2.md` and demo data in `demo-data/`.

### v2 — Product refinement & UI overhaul

- **Date:** 2026-04 (later)
- **Source document:** [`docs/cursor-dev-spec-v2.md`](./cursor-dev-spec-v2.md)
- **Status:** `shipped`
- **Summary:** Second development iteration extending v1. Driven by updated requirements `mmlabs-requirements-complete-v3.md` and HTML prototypes in `docs/prototype/` (mobile + web variants of each screen). Refined onboarding flow, added invite-code-gated access, expanded AI prompts (audit + enhance), introduced the trial/full mode distinction, and aligned UI to the prototype set. Demo data relocated to `src/demo-data/`.

### v3 — Architecture documentation

- **Date:** 2026-04-16
- **Source document:** [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- **Status:** `shipped`
- **Summary:** Comprehensive technical architecture review prepared for the Chief Technical Manager. Covers business context, infrastructure (Vercel + MongoDB Atlas + Anthropic), data model (11 collections), backend/frontend architecture, AI subsystem, rules engine, data pipeline, external dependencies, observability, security, and known technical debt. Generated from a direct analysis of the repository source code.

### v4 — AI-augmented rules pipeline (Option B, hybrid)

- **Date:** 2026-04-16
- **Source document:** [`docs/dev-plan-ai-augmented-rules.md`](./dev-plan-ai-augmented-rules.md)
- **Status:** `in-progress` (Phase 0 + Phase 1 pilot for `ДЗ-1` shipped)
- **Summary:** Proposal and detailed implementation plan to convert the deterministic rules engine into a hybrid pipeline: TypeScript rules continue to perform candidate selection (numerical thresholds, signal detection), while per-rule AI prompts generate all natural-language output (title, description, recommendation, full letter text). Includes a Vercel-compatible chunked execution pattern (rules-only synchronous request + chunked AI enhancement batches polled by the client) to fit within serverless function timeouts. Static templates are retained as failsafe. Pilot scope is rule `ДЗ-1` only, then phased rollout to remaining 8 rules.
- **Phase 0 + Phase 1 progress (2026-04-16):**
  - Added `RuleCandidate` type in `src/types/index.ts`
  - Added `signals` (JSON), `aiEnhanceFailedAt` (date), `aiEnhanceError` (text) fields to `Recommendations` collection
  - Added `aiRulesEnabled`, `aiRulesEnabledFor`, `aiRulesBatchSize` fields to `GlobalSettings`
  - Created `src/lib/ai/rule-prompts.ts` with `rule_dz1` default prompt + `promptKeyForRule()` helper
  - Created `src/lib/rules/fallback-templates.ts` with `fallbackForDZ1` and a registry-based `fallbackForCandidate()` dispatcher
  - Created `src/lib/ai/rule-analyzer.ts` implementing `analyzeCandidates()` with bounded concurrency, per-call timeout, JSON validation, priority capping (AI may not jump priority more than +1 above the rule's hint), and graceful fallback on every failure mode
  - Refactored `src/lib/rules/dz1-overdue-receivable.ts` to return `RuleCandidate[]` instead of full recommendations
  - Updated `src/lib/rules/engine.ts` to wrap legacy rules (`dz2`–`svs1`) in synthetic candidates that route directly to fallback during the migration; `isLegacyCandidate()` and `legacyCandidateToRecommendation()` exported as the bridge
  - Rewrote `src/app/api/analysis/run/route.ts` to persist candidates with `aiEnhanced=false` for AI-eligible rules and `aiEnhanced=true` (with fallback text) for legacy/disabled rules, returning fast (<2 s)
  - Created `POST /api/analysis/ai-enhance-batch` — pulls next K pending recommendations (with 5-minute retry cooldown for failed ones), runs `analyzeCandidates()` with full parallelism, updates each rec or stamps `aiEnhanceFailedAt`/`aiEnhanceError`, returns `{ done, processed, failed, remaining }`
  - Extended `GET /api/analysis/status` with `failed` count and `done` boolean for client polling loops
  - Updated `seedDemoForUser` in `src/lib/demo.ts` to use the new candidate-first flow (preserves legacy AI audit recommendations)
  - Extended `POST /api/ai/seed-prompts` to seed both `DEFAULT_PROMPTS` and `RULE_PROMPTS`
  - `npm run generate:types` regenerated `src/payload-types.ts`
  - `npx tsc --noEmit` passes with zero errors
  - Default state: `aiRulesEnabled: false`, `aiRulesEnabledFor: ['ДЗ-1']`, `aiRulesBatchSize: 3` — admin must explicitly enable to activate AI for the pilot
  - **Not yet done:** UI polling integration in inbox page (Phase 1 finishing task), production rollout, validation runs against demo data

### v5 — AI-based file transformation pipeline (Hobby-compatible)

- **Date:** 2026-04-16
- **Source document:** [`docs/dev-plan-ai-file-extraction.md`](./dev-plan-ai-file-extraction.md)
- **Status:** `in-progress` (Phase 0 + Phase 1 backend shipped, UI integration pending)
- **Summary:** Detailed implementation plan to add a deterministic-first, AI-fallback file transformation pipeline that handles non-canonical 1C OSV CSV variants. Today, files with even slightly different headers are silently dropped from analysis. The plan introduces a three-stage path: (1) try the existing regex parser, (2) if it fails, run AI recognition to extract account code + period and re-attempt parsing with a lenient parser, (3) if that still fails, run full AI structured extraction. Reuses the same chunked client-polled batching pattern established in v4 to fit Vercel Hobby's 10s function timeout: upload returns fast (no AI), `/api/files/ai-recognize-batch` processes 2 files per call (~6s), `/api/files/ai-extract/[id]` processes 1 file per call (~7s). Uses the existing `file_recognition` and `data_extraction` prompt stubs already present in `DEFAULT_PROMPTS`. Pilot scope: Phase 1 (recognition) ships first as it solves ~80% of failure cases at low cost (~$0.005/file); Phase 2 (full extraction) follows for the long tail. Default state is AI disabled (`aiFileExtractionEnabled: false`).
- **Phase 0 + Phase 1 progress (2026-04-16):**
  - Added `UploadedFileParsedData`, `AIFileHints`, `AIRecognitionLog` types in `src/types/index.ts`
  - Added `aiFileExtractionEnabled` (default `false`), `aiFileExtractionMaxKB` (default `100`), `aiFileBatchSize` (default `2`) to `GlobalSettings`
  - Added `needs_ai_recognition` and `needs_ai_extraction` parseStatus values to `UploadedFiles` collection
  - Rewrote `file_recognition` prompt (v2) to also return `columnFormat` for the lenient parser
  - Rewrote `data_extraction` prompt (v2) with strict `ParsedAccountData` JSON schema and explicit numeric/format rules (will be wired in Phase 2)
  - Created `src/lib/parser/validate.ts` with `validateParsedAccountData()` — checks supported account codes, type shapes, and totals-vs-entity-sum sanity (5% tolerance)
  - Created `src/lib/parser/lenient-parser.ts` with `parseOSVFileWithHints()` — preamble-tolerant parser that bypasses the strict first-line regex when AI hints are available
  - Refactored `osv-parser.ts` to export `parse7ColFile`, `parse8ColFile`, `parseTotals7Col`, `parseTotals8Col` (no behavior change, enables reuse)
  - Created `src/lib/ai/file-extractor.ts` with `aiIdentifyFile()` (5s timeout, ~2-3s typical) and `aiExtractData()` (9s timeout, includes truncation for files > maxBytes); both wrap `callAI` with timeouts and validation
  - Rewrote `POST /api/files/upload`: synchronously attempts `parseOSVFile` → on success stores `parsedData.parsed`, on failure (and AI enabled) sets `parseStatus='needs_ai_recognition'`, on failure (AI disabled) keeps legacy `warning` status. No AI calls from upload — keeps it under 2s
  - Created `POST /api/files/ai-recognize-batch`: pulls 2 files per call, runs AI recognition in parallel, attempts lenient parse with hints, marks `success` (recovered) or `needs_ai_extraction` (deferred to Phase 2). Wall time ~6-7s, fits Hobby budget
  - Created `GET /api/files/status`: returns aggregate counts by parseStatus for client polling (`{ total, success, needsRecognition, needsExtraction, warning, failed, inProgress, done }`)
  - Updated `POST /api/analysis/run` to prefer `parsedData.parsed` → `parsedData.aiParsed` → re-parse on the fly, and to skip files still queued for AI
  - `npm run generate:types` regenerated `src/payload-types.ts`
  - `npx tsc --noEmit` passes with zero errors
  - `npm run build` passes; new routes appear in build manifest
  - **Default state:** `aiFileExtractionEnabled: false` — system behaves identically to pre-v5 until admin flips the switch
- **Phase 1 finishing + Phase 2 progress (2026-04-16, completion pass):**
  - **UI polling integration completed** — `OnboardingWizard.tsx` rewrites `AnalysisScreen` to:
    - Stage 1: poll `/api/files/ai-recognize-batch` until done; show "AI-распознавание файлов · X из Y" progress
    - Stage 2: poll `/api/files/ai-extract-next` one file at a time; show "AI-извлечение данных · X из Y" progress
    - Stages 3-5: metrics + rules + AI enhancement (via `/api/analysis/ai-enhance-batch`, replacing the old single-rec `/api/analysis/ai-enhance`)
    - Demo mode skips Stages 1-2 (canonical demo data never needs AI)
    - Stages 1-2 are conditionally hidden if no files need them (clean UX for canonical files)
  - **Critical UI fix:** rules pipeline AnalysisScreen was reading `data.recommendationCount` from `/api/analysis/run` response, but v4 backend now returns `total`. Added backward-compat alias `recommendationCount: candidates.length` to the response so old clients keep working AND the UI also reads the new field name as fallback
  - **Phase 2 endpoint shipped:** `POST /api/files/ai-extract-next` — picks oldest file with `parseStatus='needs_ai_extraction'`, runs `aiExtractData()` (9s timeout, truncates files > `aiFileExtractionMaxKB`), validates output against `ParsedAccountData` schema, persists `parsedData.aiParsed` on success or marks `parseStatus='error'` with reason on failure
  - **Seed-prompts upsert flag:** `POST /api/ai/seed-prompts?upsert=true` — overwrites existing prompts with in-code defaults and bumps `version` field. Without flag, behavior unchanged (insert-only). Required for rolling out v2 of `file_recognition` and `data_extraction` to environments where v1 was previously seeded
  - **Setup guide published:** `docs/guides/AI-file-extraction-setup.md` — full operator guide with architecture diagrams, 7-section structure mirroring the rules guide, prompt details, troubleshooting scenarios
  - `npx tsc --noEmit` passes; `npm run build` passes; new routes appear in build manifest
  - **Status updated:** v5 entry effectively complete for Phases 0+1+2. Phase 3 (per-user quota, admin viewer for `aiRecognitionLog`, cost aggregation) remains for future work

---

## How to use this log

When starting a new development initiative:

1. Author the detailed spec/plan in a dedicated MD file under `docs/`.
2. Append a new entry to this log with the next sequential version number.
3. Set the initial status to `planned`.
4. Update the status as the initiative progresses.
5. If a later version supersedes earlier work, mark the older entry as `superseded` and link forward.

This ensures every architectural decision and major implementation effort has a discoverable trail.
