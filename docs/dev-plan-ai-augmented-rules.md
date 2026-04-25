# Dev Plan — AI-Augmented Rules Pipeline (Option B, Hybrid)

**Version:** 1.0
**Date:** April 16, 2026
**Status:** `planned`
**Owner:** Engineering
**Related documents:**
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — current architecture
- [`docs/dev-history.md`](./dev-history.md) — development log (entry v4)

---

## 1. Context

### Problem

The current rules engine (`src/lib/rules/*.ts`) is **purely deterministic TypeScript**. Each rule:
- Detects problematic counterparties or accounts using hardcoded thresholds
- Generates the entire user-facing text inline (title, description, short recommendation, full letter)
- Returns ready-to-persist `GeneratedRecommendation[]` objects

Drawbacks of this approach:
- All numbers (thresholds), text templates, and tone are hardcoded — non-developers cannot tune them
- Generated text is generic and cannot reference cross-counterparty or company-wide context
- Adding a new rule requires writing both detection logic and Russian-language templates in code
- The existing optional `enhance_recommendation` AI step is reactive (admin/user must trigger it per recommendation)

### Goal

Move all natural-language generation out of TypeScript and into per-rule AI prompts stored in the `ai-prompts` collection, while keeping the deterministic candidate selection in code. Static templates remain as a guaranteed failsafe.

### Non-goals

- Replacing rule logic itself with AI (rejected as Option A — non-deterministic, expensive, untestable)
- Building a configurable rule DSL (deferred as Option C — premature without learning from this iteration)
- Adding a separate "professional opinion" pipeline (deferred — see prior chat for that proposal)

---

## 2. Target Architecture

### Current flow

```
ParsedAccountData[]
   │
   ▼
runRulesEngine()
   │
   ├─▶ runDZ1() ──▶ GeneratedRecommendation[]  (text + logic baked in)
   ├─▶ runDZ2() ──▶ GeneratedRecommendation[]
   └─▶ ... 7 more
   │
   ▼
sort → persist
```

### Target flow

```
ParsedAccountData[]   AnalysisMetrics (company context)
   │                       │
   ▼                       │
runRulesEngine()           │
   │                       │
   ├─▶ runDZ1() ──▶ RuleCandidate[]  (logic only, no text)
   ├─▶ runDZ2() ──▶ RuleCandidate[]
   └─▶ ... 7 more
   │
   ▼
candidates: RuleCandidate[]
   │
   ▼
persist as recommendations with aiEnhanced=false, signals stored on record
   │
   ▼
client polls /api/analysis/ai-enhance-batch in a loop
   │
   ├─ each batch:
   │   ├─ pick K pending recs (K=2 on Hobby, K=5 on Pro)
   │   ├─ load prompt rule_<rulecode> from ai-prompts
   │   ├─ call Claude in parallel
   │   ├─ on success → update rec with title/description/text + aiEnhanced=true
   │   └─ on failure → fall back to static template, mark aiEnhanceFailedAt
   │
   ▼
UI updates progressively as each batch completes
```

### Vercel timeout strategy

The chunked-batch pattern is mandatory because Vercel function timeouts (10 s on Hobby, 60 s default on Pro) cannot accommodate serial AI calls for typical analyses (15–80 candidates per analysis).

| Endpoint | Job | Sync time |
|----------|-----|-----------|
| `POST /api/analysis/run` | Parse files, run rules → candidates, persist as recs with `aiEnhanced=false` | <2 s |
| `POST /api/analysis/ai-enhance-batch` | Pick K pending recs, AI-enhance them, update DB, return progress | ~5–8 s |
| `GET /api/analysis/status` | Return `{ phase, total, enhanced, failed }` | <500 ms |

---

## 3. Type Changes

Add to `src/types/index.ts`:

```typescript
export interface RuleCandidate {
  ruleCode: string                    // e.g. 'ДЗ-1'
  ruleName: string
  priorityHint: 'critical' | 'high' | 'medium' | 'low'
  impactMetric: GeneratedRecommendation['impactMetric']
  impactDirection: 'decrease' | 'increase'
  impactAmount: number
  sourceAccount: string
  counterparty?: string
  recipient: string
  signals: Record<string, string | number | boolean>  // raw data for AI
  fallbackTemplateKey?: string                        // which TEMPLATES key for failsafe
}
```

Each rule's `runDZX(data)` returns `RuleCandidate[]` instead of `GeneratedRecommendation[]`.

---

## 4. Files Affected

### New files

| Path | Purpose |
|------|---------|
| `src/lib/ai/rule-analyzer.ts` | Orchestrator: takes candidates, calls Claude with concurrency cap, falls back on failure |
| `src/lib/ai/rule-prompts.ts` | Per-rule default prompts (`rule_dz1`, `rule_dz2`, …) seeded into `ai-prompts` collection |
| `src/lib/rules/fallback-templates.ts` | Pure functions producing static recommendations from candidates (failsafe path) |

### Modified files

| Path | Change |
|------|--------|
| `src/types/index.ts` | Add `RuleCandidate` type |
| `src/lib/rules/dz1-overdue-receivable.ts` | Return candidates instead of full recommendations |
| `src/lib/rules/dz2-concentration.ts` | Same |
| `src/lib/rules/dz3-customer-churn.ts` | Same |
| `src/lib/rules/kz1-unclosed-advances.ts` | Same |
| `src/lib/rules/zap1-illiquid-inventory.ts` | Same |
| `src/lib/rules/zap2-excess-inventory.ts` | Same |
| `src/lib/rules/pl1-margin-decline.ts` | Same |
| `src/lib/rules/fc1-payment-cycle-imbalance.ts` | Same |
| `src/lib/rules/svs1-data-quality.ts` | Same |
| `src/lib/rules/engine.ts` | Return `RuleCandidate[]`, drop priority sort (moved to analyzer) |
| `src/app/api/analysis/run/route.ts` | Persist candidates as recs with `aiEnhanced=false`, return fast |
| `src/app/api/analysis/ai-enhance-batch/route.ts` | **NEW** — batched AI enhancement endpoint |
| `src/app/api/analysis/status/route.ts` | Extend response with enhancement progress |
| `src/lib/demo.ts` | Use new candidate-first flow |
| `src/globals/GlobalSettings.ts` | Add `aiRulesEnabled`, `aiRulesEnabledFor`, `aiRulesBatchSize` |
| `src/collections/Recommendations.ts` | Add `signals` (JSON), `aiEnhanceFailedAt` (date) fields |
| `src/app/api/ai/seed-prompts/route.ts` | Seed both `DEFAULT_PROMPTS` and `RULE_PROMPTS` |
| `docs/ARCHITECTURE.md` | Update rules engine and AI subsystem sections |

---

## 5. Implementation Phases

### Phase 0 — Preparation (0.5 day)

- [ ] Add `RuleCandidate` type to `src/types/index.ts`
- [ ] Create empty stubs: `src/lib/ai/rule-analyzer.ts`, `src/lib/ai/rule-prompts.ts`, `src/lib/rules/fallback-templates.ts`
- [ ] Add `signals` (JSON) and `aiEnhanceFailedAt` (date) fields to `Recommendations` collection
- [ ] Add `aiRulesEnabled` (checkbox), `aiRulesEnabledFor` (multi-select), `aiRulesBatchSize` (number, default 3) to `GlobalSettings`
- [ ] Run `npm run generate:types`

### Phase 1 — Pilot with `ДЗ-1` (1.5 days)

- [ ] Move existing `runDZ1` text generation into `fallbackForDZ1` in `fallback-templates.ts`
- [ ] Refactor `runDZ1` to return `RuleCandidate[]` populating `signals` with `{ balance, consecutiveNoPayment, recentPayments, paymentRatio, penaltyAmount }`
- [ ] Author `rule_dz1` prompt in `rule-prompts.ts`:
  - System prompt: persona (financial advisor for SMB CEO), JSON output schema, tone guidelines
  - User template: candidate signals + company context (revenue, margin, AR/AP days, health index)
- [ ] Implement `analyzeCandidates(candidates, metrics, userId, options)` in `rule-analyzer.ts`:
  - Hand-rolled concurrency limiter (no new dependency)
  - 15 s per-call timeout via `Promise.race`
  - Strict JSON schema validation
  - Fallback to `fallbackForDZ1` (or other) on any failure
  - Use existing `callAI` for Anthropic invocation, usage logging, event logging
- [ ] Update `runRulesEngine` to handle mixed return types during transition (legacy rules wrapped via adapter)
- [ ] Update `/api/analysis/run`:
  - Run rules → candidates
  - Persist each candidate as a recommendation with `aiEnhanced=false`, `signals` JSON populated
  - Set `analysisPhase: 'rules_done'`
  - Return `{ ok: true, total: candidates.length }` immediately
- [ ] Create `POST /api/analysis/ai-enhance-batch`:
  - Accept `{ batchSize?: number }` (default from `GlobalSettings.aiRulesBatchSize`)
  - Find next K recommendations where `aiEnhanced=false AND (aiEnhanceFailedAt IS NULL OR aiEnhanceFailedAt < now-5min)`
  - Run `analyzeCandidates()` with `concurrency=K`
  - Update each rec with AI output or stamp `aiEnhanceFailedAt`
  - Return `{ processed, remaining, failed, done }`
- [ ] Update `/api/analysis/status` to return enhancement progress
- [ ] Update `seedDemoForUser` to use the new pipeline (rules-only step; AI enhancement happens via batch endpoint)
- [ ] Extend `/api/ai/seed-prompts` to seed `rule_dz1`
- [ ] Add `aiRulesEnabledFor: ['ДЗ-1']` to `GlobalSettings` defaults
- [ ] Update inbox UI to:
  - Show all recommendations immediately (with rule's static fallback text as initial state)
  - Poll `/api/analysis/ai-enhance-batch` until `done: true`
  - Replace recommendation cards in-place as enhancements complete
  - Display progress indicator: "AI-анализ: 12 из 30..."

**Validation checklist:**
- Demo seed produces recommendations marked `aiEnhanced: true` for `ДЗ-1` after batch enhancement completes
- Disabling `aiRulesEnabled` causes 100% fallback path with zero AI calls
- Removing `ANTHROPIC_API_KEY` does not break the analysis (full fallback)
- Forcing AI failure on one candidate (e.g., malformed JSON response) does not affect others
- Batch endpoint completes within 8 seconds with `batchSize=3`
- Side-by-side comparison of AI vs fallback output on 5 demo runs documented

### Phase 2 — Roll out to remaining 8 rules (2 days)

For each rule, in order of complexity:
1. `kz1-unclosed-advances` — single counterparty signal
2. `zap1-illiquid-inventory`
3. `zap2-excess-inventory`
4. `dz2-concentration` — multi-counterparty aggregation
5. `dz3-customer-churn` — multi-counterparty + temporal
6. `pl1-margin-decline` — period-over-period
7. `fc1-payment-cycle-imbalance` — cross-account metric
8. `svs1-data-quality` — domain-specific edge cases

Per-rule tasks:
- [ ] Move text generation to fallback function in `fallback-templates.ts`
- [ ] Refactor rule to return `RuleCandidate[]`
- [ ] Author per-rule prompt in `rule-prompts.ts`
- [ ] Add rule code to `aiRulesEnabledFor` allowlist
- [ ] Smoke test on demo data
- [ ] Compare AI vs fallback output

### Phase 3 — Hardening & cost controls (1 day)

- [ ] Add per-analysis cost cap: abort remaining AI enhancements if running cost exceeds threshold (default $0.50, configurable via `GlobalSettings`)
- [ ] Add fields to `analysis-results`: `aiCost`, `aiCallsTotal`, `aiCallsFailed`, populated incrementally by batch endpoint
- [ ] Surface AI failure count in admin panel (custom field component or simple badge in list view)
- [ ] Add retry endpoint `POST /api/analysis/retry-failed-ai` for manual retry of failed enhancements
- [ ] Document the per-rule prompt authoring pattern in `docs/ARCHITECTURE.md` (Section 9 — AI Subsystem)
- [ ] Update `docs/dev-history.md` entry status to `shipped`

---

## 6. Cost Model

### Per-call assumptions

- ~700 input tokens (signals + metrics + system prompt)
- ~500 output tokens (JSON response)
- Claude Sonnet pricing: $3/M input, $15/M output
- **Per-call cost: ~$0.0095**

### Per-analysis estimates

| Scenario | Candidates | Total cost |
|----------|-----------|------------|
| Small wholesaler | ~10 | $0.09 |
| Medium | ~30 | $0.28 |
| Large | ~80 | $0.76 |

### Tenant projections

Daily budget for 100 active users running 1 analysis/day at medium scale: **~$28/day = ~$850/month**.

### Cost mitigations (built into design)

- Per-rule AI toggle (`aiRulesEnabledFor`) lets you AI-enhance only high-impact rules
- Skip AI when `priorityHint === 'low'` (configurable)
- Per-analysis cost cap aborts runaway costs
- Cache AI responses keyed by `hash(ruleCode + signals)` — repeat analyses on similar data reuse responses (Phase 3 deferred enhancement)

---

## 7. Vercel Compatibility

### Wall time on Hobby tier (10 s function timeout)

- `/api/analysis/run` — ~2 s ✅
- `/api/analysis/ai-enhance-batch` with `batchSize=2` — ~5–7 s ✅
- 30 candidates → 15 batches × ~6 s = **~90 s total wall time, perceived as progressive UI updates**

### Wall time on Pro tier (60 s default)

- Could use `batchSize=5` → 6 batches × ~5 s = **~30 s total**
- Could use `batchSize=10` (single batch under 60 s) but loses progressive UX benefits

**Recommendation:** Stay with chunked pattern even on Pro for better UX, fault tolerance, and lower blast radius.

---

## 8. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | AI returns malformed JSON | Medium | High | Strict schema validation; fall back to static template; never persist unvalidated output |
| 2 | Vercel function timeout on batch | High | Critical | Default `batchSize=3` keeps wall time well under 10 s; configurable via `GlobalSettings` |
| 3 | Per-rule prompt quality drifts over time | Medium | Medium | `version` field on `ai-prompts`; admin approval flow before activation |
| 4 | No test framework in repo → regression risk | High | Medium | Add `vitest` as dev dep before Phase 1; cover fallback functions and analyzer |
| 5 | AI overrides priority and floods inbox | Low | Medium | Cap AI-assigned priority: may downgrade freely, but not upgrade beyond `priorityHint + 1` level |
| 6 | Cost spike from compromised API key or runaway loop | Low | High | Per-analysis cost cap; daily quota enforced in `callAI` |
| 7 | Russian-language quality regressions from prompt edits | Medium | Medium | A/B mode in admin: keep last 3 analyses with both AI and fallback, surface diff |
| 8 | Client polling abandoned by user → orphaned `aiEnhanced=false` recs | Medium | Low | Recs are usable with fallback text; admin job can re-trigger missed enhancements |
| 9 | Anthropic rate limit during burst | Low | Medium | Concurrency cap of 5 stays within tier-1 limits; respect `Retry-After` header on 429 |
| 10 | Demo seed slowed by AI calls | Medium | Low | Demo seed only runs rules synchronously; AI enhancement triggered same way as real analyses |

---

## 9. Acceptance Criteria

The implementation is complete when:

1. All 9 rules return `RuleCandidate[]` (no text generation in rules themselves)
2. `analyzeCandidates()` produces enriched recommendations with `aiEnhanced: true` when AI succeeds, `false` (with fallback text) when it fails
3. Disabling `aiRulesEnabled` causes 100% fallback path with no AI calls
4. Per-rule allowlist (`aiRulesEnabledFor`) works: only listed rules use AI
5. Removing `ANTHROPIC_API_KEY` does not break analysis
6. Cost per analysis tracked on `analysis-results.aiCost`
7. Demo data seeds successfully with both modes (AI on/off)
8. Each batch endpoint call completes within 8 s with default `batchSize=3` (Vercel Hobby compatible)
9. Admin can author/version a new prompt and see it take effect on next analysis
10. UI shows progressive enhancement (cards updating in-place as batches complete)
11. `docs/ARCHITECTURE.md` updated with the new pipeline
12. `docs/dev-history.md` entry v4 marked `shipped`

---

## 10. Effort & Sequencing

| Phase | Effort | Dependencies | Can ship independently |
|-------|--------|-------------|----------------------|
| Phase 0 — Prep | 0.5 day | — | No (sets up the rest) |
| Phase 1 — Pilot DZ-1 | 2 days | Phase 0 | **Yes** — prove the pattern in production |
| Phase 2 — Other 8 rules | 2 days | Phase 1 validated | Yes, one rule at a time |
| Phase 3 — Hardening | 1 day | Phase 2 | Yes |
| **Total** | **~5.5 days** | | |

### Recommended go-live sequence

1. **Ship Phase 0 + Phase 1** to production behind `aiRulesEnabledFor: ['ДЗ-1']`
2. **Observe for 2–3 days**: AI quality on real data, latency, cost, edge cases
3. **Proceed with Phase 2 only after pilot validation**
4. **Phase 3 hardening** after all rules migrated and stable

---

## 11. Open Questions

| # | Question | Owner | Resolution needed by |
|---|----------|-------|---------------------|
| 1 | Confirm Vercel tier (Hobby vs Pro) → determines default `batchSize` | DevOps | Before Phase 1 |
| 2 | Acceptable per-analysis cost cap ($0.50, $1.00, $5.00)? | Product | Before Phase 3 |
| 3 | Should AI failures be retried automatically or only manually? | Product | Before Phase 1 |
| 4 | Allow users to see "raw rule output" alongside AI version for transparency? | Product / UX | Optional, Phase 3 |
| 5 | Add `vitest` for tests now or after migration? | Engineering | Before Phase 1 (recommended) |

---

*Authored 2026-04-16. Status: planned. Awaiting kickoff approval.*
