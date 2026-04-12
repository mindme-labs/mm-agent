# MMLabs AI-Advisor — Development Status Report

**Date:** 2026-04-07  
**Based on:** requirements from `docs/` and current codebase state

---

## Reference Documents

| Document | Role |
|----------|------|
| `mmlabs-requirements-complete-v2.md` | **Primary spec** — complete MVP requirements with all collections, rules, screens, AI integration |
| `cursor-dev-spec.md` | **Implementation plan** — 17 iterations (0–16) with step-by-step instructions |

---

## Iteration Progress

Git history shows **iterations 0 through 8 completed**, plus several hotfixes.

| Iteration | Description | Status | Git Commit |
|-----------|-------------|--------|------------|
| **0** | Project init (Next.js + Payload + MongoDB) | **Done** | `c595c06` |
| **1** | Payload CMS collections & access control | **Done** | `5f1f4af` |
| **2** | Authentication (Google OAuth + allowlist + middleware) | **Done** | `69dde10` |
| **3** | App layout (bottom nav + sidebar + responsive) | **Done** | `7a1facd` |
| **4** | Deterministic CSV parser | **Done** | `420edd0` |
| **5** | Rules engine (9 business rules + metrics) | **Done** | `8762e73` |
| **6** | Seed script & demo data helpers | **Done** | `86c17d3` |
| **7** | Onboarding wizard (demo mode) | **Done** | `de4c865` |
| **8** | Inbox screen (financial summary + recommendation cards) | **Done** | `445ea69` |
| **9** | Tasks screen (tabs by status, status dropdown) | **Not started** | — |
| **10** | Data screen (files table, metrics, top debtors/creditors) | **Not started** | — |
| **11** | Logout + demo cleanup + PWA | **Not started** | — |
| **12** | EventLog middleware (comprehensive logging) | **Not started** | — |
| **13** | AI service (Claude API integration) | **Not started** | — |
| **14** | Pre-prod: file upload + AI recognition/parsing | **Not started** | — |
| **15** | Pre-prod: onboarding flow | **Not started** | — |
| **16** | Final polish & cross-device testing | **Not started** | — |

Additional hotfix commits after iter-8:
- `75f775d` — responsive layout fixes (viewport meta, dialog width, onboarding grid)
- `38b06d2` — exclude test files from TypeScript build
- `a629f47` — add serverURL for Payload admin on Vercel, obscure admin route
- `25fd4bc` — add CORS/CSRF config to resolve admin panel 401 on preferences

---

## What Is Built (Iterations 0–8)

### Infrastructure
- Next.js 16 + Payload CMS 3.0 on MongoDB (Mongoose adapter)
- Admin panel at `/8ca90f70` (obscured route)
- Vercel deployment configured (auto-deploy on push to master)
- 7 demo CSV files in `src/demo-data/`

### Payload Collections (all 9 from spec + Media)
- **Users** — email, name, role, mode, hasCompletedOnboarding, companyName, inn, companyType
- **UploadedFiles** — owner, file, originalName, detectedType, accountCode, period, parseStatus, parsedData, aiRecognitionLog
- **Recommendations** — owner, ruleCode, ruleName, priority, title, description, shortRecommendation, fullText, status, impactMetric, impactDirection, impactAmount, sourceAccount, counterparty, recipient, isDemo, isAiGenerated
- **RecommendationFeedback** — owner, recommendation, rating, comment
- **AnalysisResults** — owner, period, revenue, cogs, grossProfit, grossMargin, AR, AP, inventory, shippedGoods, turnover days, healthIndex, topDebtors, topCreditors, aiAuditSummary, isDemo
- **AIPrompts** — promptKey, name, systemPrompt, userPromptTemplate, version, isActive
- **AIUsageLogs** — owner, promptKey, inputTokens, outputTokens, model, cost, durationMs
- **EventLog** — owner, eventType, entityType, entityId, payload
- **Media** — standard Payload upload collection
- **GlobalSettings** (global) — allowedEmails, defaultMode, aiEnabled, aiProvider, aiModel

### Authentication
- Google OAuth with allowlist check against `GlobalSettings.allowedEmails`
- Middleware protecting `/app/*` routes (redirect to `/auth` without `payload-token` cookie)
- Login page at `/auth` with error handling for denied access
- Logout API route at `/api/auth/logout`

### Frontend App Shell
- Responsive layout with 3 breakpoints:
  - **Mobile** (< 768px): full-width content, bottom navigation
  - **Tablet** (768–1024px): `max-w-2xl` centered content, bottom navigation
  - **Desktop** (> 1024px): `max-w-6xl` content, sidebar navigation (w-64)
- Components: `BottomNav`, `Sidebar`, `AppHeader`
- Routes: `/app/inbox`, `/app/tasks`, `/app/data`, `/app/onboarding`

### Business Logic (Parser + Rules + Metrics)
- **Deterministic OSV parser** (`src/lib/parser/osv-parser.ts`): parses all 7 account types (10, 41, 45, 60, 62, 90.01, 90.02) into `ParsedAccountData` structure
- **Rules engine** (`src/lib/rules/`) with all 9 rules:
  - `ДЗ-1` — Просроченная дебиторская задолженность (two-step)
  - `ДЗ-2` — Критическая концентрация ДЗ
  - `ДЗ-3` — Снижение активности ключевых покупателей
  - `КЗ-1` — Незакрытые авансы поставщикам
  - `ЗАП-1` — Неликвидные складские запасы
  - `ЗАП-2` — Избыточные складские запасы
  - `ПЛ-1` — Снижение валовой рентабельности
  - `ФЦ-1` — Дисбаланс платёжных циклов
  - `СВС-1` — Качество учётных данных
- **Metrics calculator** (`src/lib/rules/metrics.ts`): revenue, COGS, gross profit, gross margin, AR, AP, inventory, turnover days, health index, top debtors, top creditors
- **Text templates** (`src/lib/rules/templates.ts`): all `fullText` templates from spec section 5.6

### Demo Flow (End-to-End)
- Seed script (`npm run seed` → `tsx src/seed.ts`): reads 7 CSVs, parses, runs rules engine, calculates metrics
- `seedDemoForUser(userId)` — copies demo AnalysisResults and Recommendations for a specific CEO
- `clearDemoForUser(userId)` — removes all `isDemo: true` records for a user
- Demo seed API: `POST /api/demo/seed`
- Onboarding wizard (demo mode only): Welcome → Demo files → Analysis animation → Results

### Inbox Screen
- **FinancialSummaryPanel**: 4 key metrics (revenue, AR, AP, recommendation count) + expandable details (AR turnover, AP turnover, gross margin) + health index badge
- **RecommendationCard**: priority badge, rule code, rule name, title, impact tag, description, short recommendation, action buttons
- **CopyDraftButton**: copies `fullText` to clipboard with visual feedback
- **FeedbackSection**: thumbs up/down + comment textarea
- **InboxFeed**: feeds recommendation cards sorted by priority

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/google` | GET | Initiate Google OAuth |
| `/api/auth/google/callback` | GET | OAuth callback |
| `/api/auth/logout` | POST | Logout |
| `/api/demo/files` | GET | List demo files |
| `/api/demo/files/download` | GET | Download demo file |
| `/api/demo/seed` | POST | Seed demo data for user |
| `/api/recommendations/[id]/status` | PATCH | Change recommendation status |
| `/api/feedback` | POST | Create recommendation feedback |
| `/api/onboarding/complete` | POST | Mark onboarding complete |
| `/api/dev/reset-onboarding` | POST | Dev helper: reset onboarding |
| `/api/dev/skip-onboarding` | POST | Dev helper: skip onboarding |

---

## What Is NOT Built Yet (Iterations 9–16)

### Tasks Screen (Iteration 9)
- Page file exists at `/app/tasks/page.tsx` but is a stub
- Missing: `TaskManager` component with status tabs (В работе / Решены / Отклонены / Зависли)
- Missing: `StatusSelect` dropdown for changing recommendation status
- Missing: Badge counts per tab

### Data Screen (Iteration 10)
- Page file exists at `/app/data/page.tsx` but is a stub
- Missing: Uploaded files table (name, type, account, period, status)
- Missing: Extended metrics table (8 financial metrics)
- Missing: Top-5 debtors table with concentration highlighting
- Missing: Top-5 creditors table with advance indicators
- Missing: "Upload new files" button for pre-prod mode

### Logout & Demo Cleanup (Iteration 11)
- Logout API exists but demo cleanup on logout (`clearDemoForUser` + reset `hasCompletedOnboarding`) is not confirmed as wired up
- Missing: PWA manifest (`manifest.json`, icons, service worker)
- Missing: Empty state messages ("Все рекомендации обработаны")
- Missing: Skeleton loading states on all screens
- Missing: Error handling for Payload unavailability

### EventLog Completeness (Iteration 12)
- `logger.ts` helper exists with `logEvent()` function
- Not audited: whether all 25+ event types from spec section 9.2 are actually logged:
  - `auth.*` (login, login_denied, logout)
  - `onboarding.*` (start, file_upload, analysis_start, analysis_complete, complete)
  - `file.*` (upload, recognized, parsed, parse_error)
  - `recommendation.*` (created, viewed, status_changed, text_copied, feedback)
  - `ai.*` (request, response, error, fallback)
  - `page.view`

### AI Service — Claude API (Iteration 13)
- `src/lib/ai/` directory exists but is **empty**
- `@anthropic-ai/sdk` package is **not installed**
- Missing: AI client (`callAI()` function)
- Missing: Prompt loader from AIPrompts collection
- Missing: Fallback logic (use templates when AI unavailable)
- Missing: AI status endpoint (`GET /api/ai/status`)
- Missing: Seed of 4 AI prompts (file_recognition, data_extraction, recommendation_text, audit_working_capital)
- Missing: AIUsageLogs integration

### Pre-prod File Upload & AI Parsing (Iteration 14)
- Missing: `FileUploader` component (drag-n-drop, 10 files / 10 MB limit)
- Missing: `POST /api/files/upload` endpoint
- Missing: `POST /api/files/[id]/recognize` endpoint (AI file recognition)
- Missing: `POST /api/files/[id]/parse` endpoint (AI data extraction)
- Missing: `POST /api/analysis/run` endpoint (metrics + rules + AI audit)
- Missing: `FileRecognitionTable` component with live status updates
- Missing: AI audit integration (prompt `audit_working_capital`, `AI-AUDIT` cards)

### Pre-prod Onboarding (Iteration 15)
- OnboardingWizard only handles demo mode
- Missing: Pre-prod flow branching based on `user.mode`
- Missing: AI availability check before starting pre-prod onboarding
- Missing: File upload step in onboarding
- Missing: AI recognition step with live table
- Missing: Real analysis step (not animation)
- Missing: Data quality recommendations step (SVS-1)

### Final Polish & Testing (Iteration 16)
- Not started
- Missing: Cross-device testing (iPhone Safari, Android Chrome, Desktop Chrome/Firefox, iPad)
- Missing: Edge case handling (invalid files, single file analysis, long counterparty names)
- Missing: README.md with setup instructions

### Landing Page with Invite Links (from `mmlabs-landing-analytics-spec.md`)
- A landing page exists at `/` but the full invite-link system is not implemented
- Missing: `InviteLinks` collection (key, recipientName, channel, status, openCount, etc.)
- Missing: Invite key validation logic (`/?k=abc123`)
- Missing: Stub page for visitors without a valid key
- Missing: Full marketing landing with sections (Hero, Problem, How it Works, Examples, CTA)
- Missing: PostHog integration (`posthog-js`, `PostHogProvider`, event tracking)
- Missing: Invite key → cookie → user conversion flow
- Missing: All 5 analytics funnels (Attraction, Registration, Onboarding, Product, Sessions)

---

## Summary

| Metric | Value |
|--------|-------|
| **Iterations completed** | 9 of 17 (0–8) |
| **Overall completion** | ~50% |
| **Demo mode** | Substantially functional (login → onboarding → inbox → actions → feedback) |
| **Pre-prod mode** | Not started (no AI integration, no file upload, no AI parsing) |
| **Landing + Analytics** | Not started |
| **Collections defined** | 9/9 + 1 global (all from spec) |
| **Business rules** | 9/9 implemented |
| **CSV parser** | 7/7 account types supported |
| **Frontend screens** | 2 of 5 functional (Inbox, Onboarding), 3 stubs (Tasks, Data, Landing) |
| **AI subsystem** | 0% (empty directory, SDK not installed) |
| **Test coverage** | Informal CLI scripts only, no unit test framework |

### What Works End-to-End (Demo Mode)
1. User visits `/auth` → logs in via Google OAuth
2. Email checked against allowlist → new user created with `mode: demo`
3. Redirected to `/app/onboarding` → 4-step demo wizard
4. Demo data seeded (parsed CSVs → rules engine → recommendations + metrics)
5. Redirected to `/app/inbox` → financial summary + recommendation cards
6. User can: take recommendations to work, dismiss, copy draft text, leave feedback

### What Does Not Work Yet
1. Tasks screen (viewing/managing recommendations by status)
2. Data screen (files, metrics, debtors, creditors)
3. Full demo lifecycle (cleanup on logout, re-onboarding)
4. Pre-prod mode (file upload, AI recognition, AI parsing, AI audit, AI text generation)
5. Landing page with invite links and PostHog analytics
6. Comprehensive event logging
7. PWA support
