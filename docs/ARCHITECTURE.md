# MMLabs AI-Advisor — Product Architecture

**Document version:** 1.1
**Date:** April 25, 2026 (revised; original draft April 16, 2026)
**Audience:** Chief Technical Manager — detailed technical review
**Repository:** `mindme-labs/mm-agent`

**Revision history:**

- **v1.1 — 2026-04-25.** Documents shipped v4 (AI-augmented rules pipeline, pilot for `ДЗ-1`) and v5 (AI-based file transformation pipeline). Updates Sections 5 (collections), 6 (API endpoints + service layer), 9 (AI subsystem), 10 (rules engine — candidate-first contract), 11 (data pipeline — chunked client-polled flow). See `docs/dev-history.md` entries v4 and v5 for ship logs.
- **v1.0 — 2026-04-16.** Original draft generated from a direct analysis of the repository source code.

---

## Table of Contents

1. [Business Context](#1-business-context)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Infrastructure & Deployment](#3-infrastructure--deployment)
4. [Technology Stack](#4-technology-stack)
5. [Data Model](#5-data-model)
6. [Backend Architecture](#6-backend-architecture)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [AI Subsystem](#9-ai-subsystem)
10. [Rules Engine](#10-rules-engine)
11. [Data Pipeline](#11-data-pipeline)
12. [External Dependencies](#12-external-dependencies)
13. [Observability & Logging](#13-observability--logging)
14. [Security Considerations](#14-security-considerations)
15. [Known Limitations & Technical Debt](#15-known-limitations--technical-debt)

---

## 1. Business Context

### Product Overview

MMLabs AI-Advisor is a **proactive AI agent for working capital management** targeted at CEOs and owners of small-to-medium wholesale businesses in Russia. The product ingests financial reports from 1C:Accounting (the dominant ERP in Russia), runs a deterministic rules engine augmented by AI-powered analysis, and delivers prioritized, actionable recommendations — including ready-to-send business letters.

### Target User

- **Primary persona:** CEO / owner of a wholesale company with 10–200M RUB annual revenue.
- **Job to be done:** Identify working capital risks (overdue receivables, concentration, illiquid inventory, margin erosion) and act on them without deep financial expertise.

### Core Value Proposition

```
   1C Accounting Data (CSV)
            │
            ▼
   ┌─────────────────────┐
   │  Parse & Normalize   │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐     ┌───────────────────┐
   │  9 Deterministic     │────▶│ Recommendations    │
   │  Business Rules      │     │ (prioritized)      │
   └──────────┬──────────┘     └───────────────────┘
              │                         │
              ▼                         ▼
   ┌─────────────────────┐     ┌───────────────────┐
   │  Claude AI Audit     │────▶│ AI-Enhanced Texts  │
   │  (optional)          │     │ Ready-to-send      │
   └─────────────────────┘     │ letters & offers   │
                               └───────────────────┘
```

### Business Model

- **Trial mode:** 7-day free trial (configurable via admin panel), invite-code gated access.
- **Full mode:** Paid subscription (upgrade flow exists, payment integration TBD).

---

## 2. High-Level Architecture

The system is a **monolithic Next.js application** with an embedded Payload CMS for admin and data layer. All components — frontend, API, CMS admin, rules engine, AI orchestration — run within a single Node.js process.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Vercel Edge Network                          │
│                     (CDN, SSL, Auto-scaling)                          │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 Application                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                     Next.js Middleware                           │ │
│  │              (Auth guard for /app/* routes)                      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │
│  │   (frontend)     │  │   (payload)       │  │   /api/*            │  │
│  │   Route Group    │  │   Route Group     │  │   Custom REST       │  │
│  │                  │  │                   │  │   Endpoints          │  │
│  │  • Landing       │  │  • Admin UI       │  │                     │  │
│  │  • Auth pages    │  │    (/8ca90f70)    │  │  • Auth (login,     │  │
│  │  • App shell     │  │  • REST API       │  │    register, logout)│  │
│  │  • Inbox         │  │    (auto-gen)     │  │  • File upload      │  │
│  │  • Tasks         │  │  • GraphQL        │  │  • Analysis (run,   │  │
│  │  • Data          │  │    (auto-gen)     │  │    audit, enhance)  │  │
│  │  • Onboarding    │  │                   │  │  • Recommendations  │  │
│  │  • Upgrade       │  │                   │  │  • Events, feedback │  │
│  └─────────────────┘  └──────────────────┘  │  • Demo, dev helpers │  │
│                                              └─────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                       Service Layer (lib/)                       │ │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────────┐  │ │
│  │  │  AI Client  │  │  Rules     │  │  Parser  │  │  Logger    │  │ │
│  │  │  & Audit    │  │  Engine    │  │  (OSV)   │  │            │  │ │
│  │  └──────┬─────┘  └────────────┘  └──────────┘  └────────────┘  │ │
│  │         │                                                        │ │
│  └─────────┼────────────────────────────────────────────────────────┘ │
│            │                                                          │
│  ┌─────────┼────────────────────────────────────────────────────────┐ │
│  │   Payload CMS Core (ORM, Access Control, Hooks)                 │ │
│  │         │                                                        │ │
│  └─────────┼────────────────────────────────────────────────────────┘ │
└────────────┼──────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────┐          ┌─────────────────────┐
│   MongoDB Atlas       │          │   Anthropic API     │
│   (Mongoose adapter)  │          │   (Claude Sonnet)   │
│                       │          │                     │
│   11 collections      │          │   6 default prompts │
│   1 global config     │          │   + per-rule prompts│
│                       │          │   Token-based       │
└──────────────────────┘          │   billing           │
                                   └─────────────────────┘
```

---

## 3. Infrastructure & Deployment

### Hosting

| Component | Provider | Details |
|-----------|----------|---------|
| Application | **Vercel** | Auto-deploy on push to `main`, serverless functions |
| Database | **MongoDB Atlas** | Cloud-managed MongoDB cluster |
| AI | **Anthropic API** | External API, pay-per-token |
| DNS/SSL | **Vercel** | Automatic SSL, edge routing |
| Image processing | **Sharp** | In-process, via `sharp` npm package |

### Deployment Pipeline

```
  Developer Push (main)
         │
         ▼
  ┌──────────────────┐
  │  Vercel Build     │
  │  • next build     │
  │  • Payload types  │
  │  • Import map gen │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Serverless       │
  │  Functions        │
  │  (auto-scaled)    │
  └──────────────────┘
```

- **No Docker, Kubernetes, or Terraform** — the project relies entirely on Vercel's managed infrastructure.
- **No CI/CD pipeline files** in the repository (`.github/workflows` absent) — deployment is handled by Vercel's GitHub integration.
- **Build command:** `cross-env NODE_OPTIONS="--no-deprecation --max-old-space-size=8000" next build`

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `PAYLOAD_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `PAYLOAD_PUBLIC_SERVER_URL` | Yes | Application URL (used for CORS, CSRF, redirects) |
| `ANTHROPIC_API_KEY` | No | Anthropic Claude API key (AI features disabled without it) |
| `GOOGLE_CLIENT_ID` | No | Reserved for future Google OAuth (currently unused) |
| `GOOGLE_CLIENT_SECRET` | No | Reserved for future Google OAuth (currently unused) |

---

## 4. Technology Stack

### Runtime & Framework

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | ^18.20.2 \|\| >=20.9.0 |
| Framework | Next.js (App Router) | ^16.2.2 |
| Language | TypeScript | ^5.7.3 |
| Module system | ESM (`"type": "module"`) | — |

### Backend

| Component | Technology | Version |
|-----------|-----------|---------|
| CMS / ORM | Payload CMS | ^3.81.0 |
| Database adapter | `@payloadcms/db-mongodb` (Mongoose) | ^3.81.0 |
| Rich text | `@payloadcms/richtext-lexical` | ^3.81.0 |
| Auth tokens | `jsonwebtoken` | ^9.0.3 |
| AI SDK | `@anthropic-ai/sdk` | ^0.89.0 |
| Image processing | `sharp` | ^0.34.2 |

### Frontend

| Component | Technology | Version |
|-----------|-----------|---------|
| UI library | React (Server Components) | ^19.1.0 |
| Styling | Tailwind CSS 4 | ^4.2.2 |
| Component library | shadcn/ui (Base Nova style) | ^4.1.2 |
| Icons | Lucide React | ^0.487.0 |
| Font | Inter (Google Fonts) | — |
| Theming | next-themes | ^0.4.6 |
| Toasts | Sonner | ^2.0.7 |
| State management | zustand (declared, not in use) | ^5.0.5 |

---

## 5. Data Model

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌─────────────────────┐
│    Users      │──1:N──│  UploadedFiles   │       │   InviteCodes       │
│              │       │                  │       │                     │
│  id          │       │  owner ──────────│──FK──▶│  code (unique)      │
│  email       │       │  originalName    │       │  createdBy ────FK──▶│Users
│  name        │       │  accountCode     │       │  usedBy ──────FK──▶│Users
│  role        │       │  period          │       │  isUsed             │
│  mode        │       │  parseStatus     │       │  expiresAt          │
│  hasCompleted│       │  parsedData (JSON)│       │  channel            │
│  Onboarding  │       │  parseErrors     │       └─────────────────────┘
│  trialExpires│       │  aiRecognitionLog│
│  analysisStatus     └──────────────────┘       ┌─────────────────────┐
│  companyName │                                   │  AccessRequests     │
│  inn         │       ┌──────────────────┐       │                     │
│  companyType │──1:N──│ AnalysisResults  │       │  email              │
└──────────────┘       │                  │       │  status             │
       │               │  owner ──────────│──FK   │  inviteCode         │
       │               │  period          │       │  approvedAt         │
       │               │  revenue         │       └─────────────────────┘
       │               │  cogs            │
       │               │  grossProfit     │       ┌─────────────────────┐
       │               │  grossMargin     │       │  GlobalSettings     │
       │               │  accountsReceiv. │       │  (singleton)        │
       │               │  accountsPayable │       │                     │
       │               │  inventory       │       │  aiEnabled          │
       │               │  arTurnoverDays  │       │  aiProvider         │
       │               │  apTurnoverDays  │       │  aiModel            │
       │               │  invTurnoverDays │       │  trialDays          │
       │               │  healthIndex     │       └─────────────────────┘
       │               │  topDebtors (JSON)│
       │               │  topCreditors(JSON)│
       │               │  aiAuditSummary  │
       │               │  analysisPhase   │
       │               │  isDemo          │
       │               └──────────────────┘
       │
       ├──1:N──┬──────────────────────────┐
       │       │     Recommendations       │
       │       │                           │
       │       │  owner ──────────────FK   │
       │       │  ruleCode                 │
       │       │  ruleName                 │
       │       │  priority (4 levels)      │
       │       │  title                    │
       │       │  description              │
       │       │  shortRecommendation      │
       │       │  fullText                 │
       │       │  status (5 states)        │
       │       │  impactMetric             │
       │       │  impactDirection          │
       │       │  impactAmount             │
       │       │  sourceAccount            │
       │       │  counterparty             │
       │       │  recipient                │
       │       │  isDemo / isAiGenerated   │
       │       │  aiEnhanced               │
       │       │  takenAt / dueDate        │
       │       │  resolvedAt               │
       │       └───────────┬───────────────┘
       │                   │
       │                   └──1:N──┬───────────────────────┐
       │                           │ RecommendationFeedback │
       │                           │                        │
       │                           │  owner ──────────FK    │
       │                           │  recommendation ──FK   │
       │                           │  rating / comment      │
       │                           └────────────────────────┘
       │
       ├──1:N──┬──────────────────┐
       │       │    EventLog       │
       │       │  owner ──FK       │
       │       │  eventType (17)   │
       │       │  entityType       │
       │       │  entityId         │
       │       │  payload (JSON)   │
       │       └──────────────────┘
       │
       ├──1:N──┬──────────────────┐
       │       │   AIUsageLogs     │
       │       │  owner ──FK       │
       │       │  promptKey        │
       │       │  inputTokens      │
       │       │  outputTokens     │
       │       │  model            │
       │       │  cost ($)         │
       │       │  durationMs       │
       │       └──────────────────┘
       │
       └──(admin)──┬──────────────┐
                   │  AIPrompts    │
                   │  promptKey    │
                   │  name         │
                   │  systemPrompt │
                   │  userPrompt   │
                   │  version      │
                   │  isActive     │
                   └──────────────┘
```

### Collections Summary

| Collection | Slug | Records owned by | Admin-only |
|------------|------|-----------------|------------|
| Users | `users` | — | R/U: self or admin; D: admin |
| Media | `media` | — | Payload upload collection |
| Uploaded Files | `uploaded-files` | User (owner) | No |
| Analysis Results | `analysis-results` | User (owner) | No |
| Recommendations | `recommendations` | User (owner) | No |
| Recommendation Feedback | `recommendation-feedback` | User (owner) | No |
| AI Prompts | `ai-prompts` | — | Yes (full CRUD) |
| AI Usage Logs | `ai-usage-logs` | User (owner) | Read: admin; Create: system |
| Event Log | `event-log` | User (owner) | Read: admin; Create: open |
| Invite Codes | `invite-codes` | — | Yes (full CRUD) |
| Access Requests | `access-requests` | — | Create: public; Read/Update: admin |

### Recommendations — fields added in v1.1 (AI rules pipeline)

| Field | Type | Purpose |
|-------|------|---------|
| `aiEnhanced` | `checkbox` (default `false`) | Becomes `true` only after a successful AI enhancement. AI-eligible rules are persisted with `false` and enhanced asynchronously by `/api/analysis/ai-enhance-batch`. Legacy rules and rules outside `aiRulesEnabledFor` are persisted with `true` and the fallback template's text. |
| `signals` | `json` | Structured per-rule data used as input to AI prompt variables (e.g. for `ДЗ-1`: `{ balance, consecutiveNoPayment, recentPayments, paymentRatio, penaltyAmount }`). Legacy candidates additionally store the precomputed text under `__legacy__: true` + `title/description/...`. |
| `aiEnhanceFailedAt` | `date` | Timestamp of the last failed AI enhancement; used as a 5-minute cooldown gate by the batch endpoint. |
| `aiEnhanceError` | `text` | Last AI error code: `ai_timeout_or_unavailable`, `ai_invalid_json`, or the underlying exception message. |

### UploadedFiles — fields added in v1.1 (AI file transformation pipeline)

| Field / Enum | Change | Purpose |
|--------------|--------|---------|
| `parseStatus` | New enum values `needs_ai_recognition`, `needs_ai_extraction` | Mark files awaiting AI fallback after deterministic parsing failed. |
| `parsedData` | Now structured: `{ raw, parsed?, aiParsed?, aiHints?, truncated?, truncatedAtBytes? }` | `parsed` = deterministic regex parse (preferred); `aiParsed` = full AI extraction (fallback); `aiHints` = AI-recognized accountCode/period/columnFormat. |
| `aiRecognitionLog` | New JSON array field | Append-only log of each `file_recognition` and `data_extraction` attempt, with `promptVersion`, `model`, `inputTokens`, `outputTokens`, `durationMs`, `inputBytes`, `success`, `error`, `rawResponse` (first 500 chars). |

### Globals — fields added in v1.1

| Global / Field | Default | Purpose |
|----------------|---------|---------|
| `global-settings.aiRulesEnabled` | `false` | Master switch for per-rule AI enhancement. |
| `global-settings.aiRulesEnabledFor` | `['ДЗ-1']` | Allowlist of rule codes eligible for AI. Other rules use static fallback templates even when the master switch is on. |
| `global-settings.aiRulesBatchSize` | `3` | Concurrency / batch size used by `/api/analysis/ai-enhance-batch` (Hobby: 2-3, Pro: 5-8). |
| `global-settings.aiFileExtractionEnabled` | `false` | Master switch for AI fallback in the upload pipeline. |
| `global-settings.aiFileExtractionMaxKB` | `100` | Hard cap on file size sent to `data_extraction`. Larger files are truncated with `parsedData.truncated=true`. |
| `global-settings.aiFileBatchSize` | `2` | Files per `/api/files/ai-recognize-batch` call. |

### Globals — original fields

| Global | Slug | Purpose |
|--------|------|---------|
| Global Settings | `global-settings` | AI on/off toggle, AI provider, model name, trial duration (+ AI rules and file extraction flags above) |

---

## 6. Backend Architecture

### Route Structure

The application uses Next.js App Router with two route groups and a custom API layer:

```
src/app/
├── (frontend)/           ← User-facing pages (SSR + Server Components)
│   ├── layout.tsx        ← Root layout: Inter font, globals.css, metadata
│   ├── page.tsx          ← Landing / teaser page
│   ├── auth/
│   │   ├── login/        ← Email/password login
│   │   ├── register/     ← Invite-gated registration
│   │   └── request-access/
│   └── app/
│       ├── layout.tsx    ← Authenticated shell (sidebar, header, bottom nav)
│       ├── page.tsx      ← Dashboard redirect
│       ├── inbox/        ← New recommendations
│       ├── tasks/        ← In-progress / overdue items
│       ├── data/         ← Financial metrics overview
│       ├── onboarding/   ← File upload + analysis wizard
│       └── upgrade/      ← Subscription upgrade CTA
│
├── (payload)/            ← Payload CMS admin (auto-generated)
│   ├── 8ca90f70/         ← Obscured admin route
│   └── api/
│       ├── [...slug]/    ← REST API (GET/POST/PATCH/PUT/DELETE)
│       └── graphql/      ← GraphQL endpoint
│
├── api/                  ← Custom REST endpoints
│   ├── auth/             ← login, register, logout
│   ├── files/             ← upload, ai-recognize-batch (v1.1), ai-extract-next (v1.1), status (v1.1)
│   ├── analysis/         ← run, ai-audit, ai-enhance, ai-enhance-batch (v1.1), status
│   ├── recommendations/  ← Status updates
│   ├── feedback          ← User feedback on recommendations
│   ├── events            ← Client-side analytics
│   ├── ai/               ← Status check, seed-prompts (with ?upsert flag)
│   ├── access-requests   ← Public access request
│   ├── invite-codes/     ← Validate invite
│   ├── onboarding/       ← Complete onboarding
│   ├── demo/             ← Seed/list/download demo data
│   └── dev/              ← Dev helpers (skip/reset onboarding)
│
└── manifest.ts           ← PWA manifest
```

### API Endpoints Detail

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/login` | Public | Email/password login, sets JWT cookie |
| POST | `/api/auth/register` | Public | Creates user with invite code validation |
| POST | `/api/auth/logout` | Cookie | Clears cookie, logs event, redirects |
| POST | `/api/files/upload` | Cookie | Multipart upload. Tries `parseOSVFile` synchronously; on failure marks file `needs_ai_recognition` (if AI enabled) or `warning` (legacy). Returns `{ files, needsAi, aiAvailable }`. No AI calls — keeps under ~2 s. |
| POST | `/api/files/ai-recognize-batch` | Cookie | Pulls 2 files (configurable) with `parseStatus='needs_ai_recognition'`, runs `aiIdentifyFile` (5 s timeout) in parallel, retries `parseOSVFileWithHints`. Files that succeed move to `success`; files where the lenient parser still fails move to `needs_ai_extraction`. Returns `{ done, processed, recovered, failed, remaining }`. |
| POST | `/api/files/ai-extract-next` | Cookie | Picks oldest file with `parseStatus='needs_ai_extraction'`, runs `aiExtractData` (9 s timeout, files > `aiFileExtractionMaxKB` truncated), validates output against `ParsedAccountData` schema. Persists `parsedData.aiParsed` on success or marks `error`. |
| GET | `/api/files/status` | Cookie | Aggregate counts by `parseStatus` for client polling: `{ total, success, needsRecognition, needsExtraction, warning, failed, inProgress, done }`. |
| POST | `/api/analysis/run` | Cookie | Parses files (prefers `parsedData.parsed` → `parsedData.aiParsed` → re-parse), runs rules engine → `RuleCandidate[]`, persists each as a recommendation with `aiEnhanced=false` for AI-eligible candidates and `aiEnhanced=true` for legacy/disabled. Returns fast (~2 s) with `{ ok, analysisId, total, pendingAi, prefilled }`. |
| POST | `/api/analysis/ai-enhance-batch` | Cookie | Picks K pending recommendations (`aiEnhanced=false`), respects 5-minute cooldown via `aiEnhanceFailedAt`, calls `analyzeCandidates()` with bounded concurrency (15 s per-call timeout), updates each rec or stamps `aiEnhanceFailedAt`/`aiEnhanceError`. Returns `{ done, processed, failed, remaining }`. |
| POST | `/api/analysis/ai-audit` | Cookie | Runs Claude AI audit on latest analysis metrics (legacy, complementary to per-rule pipeline) |
| POST | `/api/analysis/ai-enhance` | Cookie | Enhances one recommendation at a time with AI (legacy single-rec endpoint, retained for compatibility) |
| GET | `/api/analysis/status` | Cookie | Returns `{ phase, analysisId, total, enhanced, remaining, failed, done }` for client polling. |
| GET | `/api/ai/status` | Cookie | Checks if AI is available (API key + admin toggle) |
| POST | `/api/ai/seed-prompts` | Admin | Seeds default AI prompts into database. Accepts `?upsert=true` to overwrite existing prompts and bump `version` (used to roll out v2 of `file_recognition`/`data_extraction` and per-rule prompts). |
| PATCH | `/api/recommendations/[id]/status` | Cookie | Updates recommendation status, sets timestamps |
| POST | `/api/feedback` | Cookie | Creates recommendation feedback |
| POST | `/api/events` | Cookie | Logs whitelisted client-side analytics events |
| POST | `/api/access-requests` | Public | Submits email for access |
| GET | `/api/invite-codes/validate` | Public | Validates invite code |
| POST | `/api/onboarding/complete` | Cookie | Marks onboarding as complete |
| POST | `/api/demo/seed` | Cookie | Seeds demo data for current user |
| GET | `/api/demo/files` | Cookie | Lists available demo CSV files |
| GET | `/api/demo/files/download` | Cookie | Downloads a specific demo CSV |
| POST | `/api/dev/skip-onboarding` | Cookie | Dev only: skip onboarding |
| POST | `/api/dev/reset-onboarding` | Cookie | Dev only: clear demo data and reset |

### Service Layer

The backend does not follow a separate services directory pattern. Instead, domain logic is organized under `src/lib/` and invoked directly from API route handlers:

```
src/lib/
├── auth.ts                    ← JWT generation, cookie management, getCurrentUser
├── logger.ts                  ← Event logging to event-log collection
├── demo.ts                    ← Demo data seeding and cleanup
├── utils.ts                   ← Shared utilities
├── ai/
│   ├── client.ts              ← Anthropic SDK wrapper, prompt loading, usage logging.
│   │                            Returns { text, inputTokens, outputTokens, model, promptVersion, durationMs }
│   ├── audit.ts               ← Legacy AI audit orchestration (metrics → Claude → recommendations)
│   ├── prompts.ts             ← DEFAULT_PROMPTS — seed for `file_recognition`, `data_extraction`,
│   │                            `recommendation_text`, `enhance_recommendation`, `audit_working_capital`
│   ├── rule-prompts.ts        ← v1.1: RULE_PROMPTS — per-rule prompts (`rule_dz1`, …),
│   │                            promptKeyForRule(ruleCode) helper
│   ├── rule-analyzer.ts       ← v1.1: analyzeCandidates() — converts RuleCandidate[] to
│   │                            AnalyzedRecommendation[] with bounded concurrency, 15 s per-call
│   │                            timeout, JSON validation, priority capping (+1 max above hint),
│   │                            graceful fallback to fallback-templates
│   └── file-extractor.ts      ← v1.1: aiIdentifyFile (5 s timeout) + aiExtractData (9 s timeout,
│                                with truncation), both wrap callAI and report
│                                promptVersion/model/inputTokens/outputTokens for observability
├── parser/
│   ├── osv-parser.ts          ← 1C OSV CSV parser (7-col and 8-col formats)
│   ├── lenient-parser.ts      ← v1.1: parseOSVFileWithHints() — preamble-tolerant variant,
│   │                            bypasses the strict first-line regex when AI hints are available
│   └── validate.ts            ← v1.1: validateParsedAccountData() — schema + numeric sanity
│                                check (totals vs sum of entities, ±5%, supported account codes)
└── rules/
    ├── engine.ts              ← Orchestrates 9 rules, returns RuleCandidate[] (v1.1).
    │                            Wraps legacy rules in synthetic candidates with __legacy__ marker
    │                            so the analyzer routes them straight to fallback.
    ├── metrics.ts             ← Calculates financial metrics from parsed data
    ├── templates.ts           ← Legacy templates module (still used by un-migrated rules)
    ├── fallback-templates.ts  ← v1.1: fallbackForCandidate() registry — pure functions producing
    │                            static recommendations from candidates (failsafe path)
    ├── dz1-*.ts               ← Overdue receivables (migrated to RuleCandidate contract)
    ├── dz2-*.ts               ← Debtor concentration risk (legacy contract)
    ├── dz3-*.ts               ← Customer churn detection (legacy contract)
    ├── kz1-*.ts               ← Unclosed supplier advances (legacy contract)
    ├── zap1-*.ts              ← Illiquid inventory (legacy contract)
    ├── zap2-*.ts              ← Excess inventory (legacy contract)
    ├── pl1-*.ts               ← Margin decline (legacy contract)
    ├── fc1-*.ts               ← Payment cycle imbalance (legacy contract)
    └── svs1-*.ts              ← Data quality issues (legacy contract)
```

---

## 7. Frontend Architecture

### Design Principles

- **Server Components by default** — layouts and pages use `async` functions with direct Payload queries.
- **Mobile-first, responsive** — bottom navigation on mobile, sidebar on desktop.
- **PWA-capable** — includes web manifest, standalone display mode, installable icons.
- **Russian-language UI** — all user-facing labels and content are in Russian.

### Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│  AppHeader (company name, user avatar)                       │
├───────────────┬─────────────────────────────────────────────┤
│               │                                              │
│  Sidebar      │  Main Content Area                           │
│  (desktop)    │                                              │
│               │  ┌─────────────────────────────────┐        │
│  • Inbox      │  │  Inbox: recommendation cards     │        │
│  • Tasks      │  │  Tasks: in-progress items        │        │
│  • Data       │  │  Data: financial metrics          │        │
│  • Upgrade    │  │  Onboarding: file upload wizard   │        │
│               │  └─────────────────────────────────┘        │
│               │                                              │
├───────────────┴─────────────────────────────────────────────┤
│  BottomNav (mobile: inbox, tasks, data, settings)            │
└─────────────────────────────────────────────────────────────┘
```

### Component Organization

```
src/components/
├── ui/                  ← shadcn/ui primitives (Button, Card, Dialog, etc.)
├── Sidebar.tsx          ← Desktop navigation
├── AppHeader.tsx        ← Top bar with user info
├── BottomNav.tsx        ← Mobile bottom navigation
├── admin/
│   └── SeedPromptsButton.tsx  ← Payload admin custom component
└── [domain components]  ← Recommendation cards, file upload, metrics display
```

### State Management

- **Server state:** Fetched via Payload queries in Server Components (no REST calls from server).
- **Client state:** React hooks + `fetch()` to `/api/*` endpoints.
- **Note:** `zustand` is declared as a dependency but has no imports in the codebase — it may be planned for future client-side state.

---

## 8. Authentication & Authorization

### Authentication Flow

```
┌──────────┐    POST /api/auth/register     ┌──────────────┐
│  Browser  │──────────────────────────────▶│  API Route    │
│           │  { email, password,            │               │
│           │    inviteCode? }               │  1. Validate invite code
│           │                                │  2. payload.create(users)
│           │◀──────────────────────────────│  3. jwt.sign({id, email})
│           │    Set-Cookie: payload-token   │  4. setAuthCookie()
└──────────┘    (httpOnly, secure, 30d)      └──────────────┘

┌──────────┐    POST /api/auth/login        ┌──────────────┐
│  Browser  │──────────────────────────────▶│  API Route    │
│           │  { email, password }           │               │
│           │                                │  1. payload.login()
│           │◀──────────────────────────────│  2. generatePayloadToken()
│           │    Set-Cookie: payload-token   │  3. setAuthCookie()
└──────────┘                                 └──────────────┘

┌──────────┐    GET /app/*                  ┌──────────────┐
│  Browser  │──────────────────────────────▶│  Middleware    │
│           │                                │               │
│           │  Cookie: payload-token?        │  • No cookie → redirect /auth/login
│           │                                │  • Has cookie → pass through
│           │                                │               │
│           │                                │  Layout:       │
│           │                                │  • getCurrentUser() verifies JWT
│           │                                │  • Expired trial → upgrade page
│           │                                │  • No onboarding → onboarding only
└──────────┘                                 └──────────────┘
```

### Token Details

- **Algorithm:** HS256 (via `jsonwebtoken`)
- **Secret:** `PAYLOAD_SECRET` environment variable
- **Payload:** `{ id, collection: 'users', email }`
- **Expiry:** 30 days
- **Cookie:** `payload-token`, `httpOnly`, `secure` (prod), `sameSite: lax`, `path: /`

### Authorization Model

| Level | Mechanism |
|-------|-----------|
| Route protection | Next.js middleware: checks `payload-token` cookie for `/app/*` |
| Page-level | Server Component layout: `getCurrentUser()` + redirect logic |
| API-level | Each route handler calls `getCurrentUser()` and returns 401 if null |
| Data-level | Payload access control: `ownerOrAdmin` pattern on most collections |
| Admin panel | Payload CMS built-in auth at `/8ca90f70`, requires `role: 'admin'` |

### Access Control Pattern

Most collections implement the same `ownerOrAdmin` pattern:

```typescript
const ownerOrAdmin = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { owner: { equals: user.id } }  // Payload query constraint
}
```

This ensures users can only read/update their own records while admins have full access.

---

## 9. AI Subsystem

### Architecture

The AI subsystem is designed with a **graceful degradation pattern** — the product functions fully without AI using the deterministic rules engine, and AI augments the experience when available.

```
┌─────────────────────────────────────────────────────────────┐
│                       AI Subsystem                          │
│                                                             │
│  ┌─────────────────┐                                        │
│  │ isAIAvailable()  │  Checks:                              │
│  │                  │  1. global-settings.aiEnabled == true  │
│  │                  │  2. ANTHROPIC_API_KEY is set            │
│  └────────┬────────┘                                        │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐     ┌──────────────────┐               │
│  │ loadPrompt()     │────▶│ ai-prompts       │               │
│  │ (from DB)        │     │ collection (DB)  │               │
│  └────────┬────────┘     │                  │               │
│           │               │ • promptKey      │               │
│           │               │ • systemPrompt   │               │
│           │               │ • userTemplate   │               │
│           │               │ • version        │               │
│           │               │ • isActive       │               │
│           │               └──────────────────┘               │
│           ▼                                                  │
│  ┌─────────────────┐     ┌──────────────────┐               │
│  │  callAI()        │────▶│ Anthropic SDK    │               │
│  │                  │     │                  │               │
│  │  • Interpolates  │     │ messages.create({│               │
│  │    variables     │     │   model,         │               │
│  │  • Logs request  │     │   max_tokens,    │               │
│  │    event         │     │   system,        │               │
│  │  • Calls Claude  │     │   messages       │               │
│  │  • Logs usage    │     │ })               │               │
│  │  • Logs response │     └──────────────────┘               │
│  │    event         │                                        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

### AI Prompt Registry

Prompts are stored in the database (`ai-prompts` collection) and managed via the admin panel. Two seed groups: `DEFAULT_PROMPTS` (in `src/lib/ai/prompts.ts`) and `RULE_PROMPTS` (in `src/lib/ai/rule-prompts.ts`). Both are seeded by `POST /api/ai/seed-prompts`; pass `?upsert=true` to overwrite existing entries and bump `version`.

| Prompt Key | Version | Purpose | Used By |
|-----------|---------|---------|---------|
| `file_recognition` | 2 | Extract `accountCode`, `period`, `documentType`, `columnFormat` (`'7-col'\|'8-col'\|'unknown'`) from the first 50 lines of a CSV | `aiIdentifyFile()` → `/api/files/ai-recognize-batch` |
| `data_extraction` | 2 | Extract full `ParsedAccountData` JSON from raw CSV (with strict schema, numeric/format rules) | `aiExtractData()` → `/api/files/ai-extract-next` |
| `recommendation_text` | 1 | Generate send-ready business letter | Legacy single-rec enhancement |
| `enhance_recommendation` | 1 | Rewrite rule output with CEO-grade context (`description`, `recommendation`, `draft`) | `/api/analysis/ai-enhance` |
| `audit_working_capital` | 1 | Generate 2-3 strategic AI-only recommendations | `/api/analysis/ai-audit` |
| `rule_dz1` | 1 | Per-rule prompt for `ДЗ-1` candidates — emits `{priority, title, description, shortRecommendation, fullText}` | `analyzeCandidates()` → `/api/analysis/ai-enhance-batch` |
| `rule_<code>` (reserved) | — | Slot for future per-rule prompts as the remaining 8 rules migrate to the candidate contract (`rule_dz2`, `rule_kz1`, …) | `analyzeCandidates()` |

### Chunked Client-Polled Pattern (Vercel Hobby Compatible)

Both v1.1 pipelines (rules and file extraction) follow the same shape: a **fast synchronous endpoint** persists work, then the **client polls a batch endpoint** that performs a small amount of AI work per call (each call ≤ 9 s to fit within Vercel Hobby's 10 s function timeout).

```
                Synchronous endpoint              Client-polled batch endpoint
                ───────────────────               ─────────────────────────────
File pipeline:  POST /api/files/upload            POST /api/files/ai-recognize-batch (2/call)
                  ~2 s (no AI)                    POST /api/files/ai-extract-next   (1/call)
                                                  GET  /api/files/status            (counts)

Rules pipeline: POST /api/analysis/run            POST /api/analysis/ai-enhance-batch (3/call)
                  ~2 s (rules only)               GET  /api/analysis/status           (progress)
```

The onboarding wizard runs five sequential stages, each polling its dedicated endpoint until `done: true` before moving to the next:

```
Upload → AI-recognize batch → AI-extract next → metrics+rules → AI-enhance batch
 (sync)   (poll, 6 s/call)    (poll, 9 s/call)  (sync, 2 s)     (poll, 6-8 s/call)
```

Stages 1-2 are skipped when no files require AI (canonical 1C exports), and stage 5 is skipped when AI is disabled or no recommendations are AI-eligible.

### AI Failure Modes & Fallback

Every AI integration point degrades gracefully:

| Failure | Detection | Fallback |
|---------|-----------|----------|
| `ANTHROPIC_API_KEY` missing | `getAnthropicClient()` returns null | `callAI()` returns null; downstream code uses static template |
| `aiEnabled` toggle off | `isAIAvailable()` returns false | Same as missing key |
| `aiRulesEnabled=false` | `loadAnalyzerSettings()` | Recommendations get fallback text, marked `aiEnhanced=true` immediately |
| `aiFileExtractionEnabled=false` | `loadFileExtractionSettings()` | Files keep legacy `parseStatus='warning'`; analysis runs on whatever parsed successfully |
| Per-call timeout (5/9/15 s) | `Promise.race` against `setTimeout` | Stamp `aiEnhanceFailedAt` (rules) or mark `parseStatus='error'` (files); fallback text persists |
| Malformed JSON response | Regex+`JSON.parse` + (for extraction) schema validation | Same as timeout |
| Anthropic rate limit / 5xx | Caught in `callAI` try/catch | Same as timeout |

For the rules pipeline, AI may downgrade priority freely but cannot raise it more than one level above the rule's `priorityHint` (capping in `analyzeCandidates`).

### AI Cost Tracking

Every AI call is logged to `ai-usage-logs` with:
- Token counts (input/output)
- Cost calculation: input at $3/M tokens, output at $15/M tokens
- Duration in milliseconds
- Model used

The file pipeline additionally logs each call to `uploaded-files.aiRecognitionLog` (per-file, append-only) with `promptVersion`, `model`, `inputTokens`, `outputTokens`, `durationMs`, `inputBytes`, `success`, `error`, and a `rawResponse` debug snippet (first 500 chars) — useful for forensic review of AI failures without needing to cross-reference `ai-usage-logs` and `event-log`.

### Default Model

`claude-sonnet-4-6` (configurable via `global-settings.aiModel` in admin panel).

---

## 10. Rules Engine

### Overview

The rules engine performs **deterministic candidate selection** in TypeScript and delegates **natural-language generation** either to AI (per-rule prompts) or to static fallback templates. Detection logic is fully synchronous, in-process, and dependency-free; only the text-generation step optionally hits the network.

**Migration state (v1.1):** the engine has switched its public contract from `GeneratedRecommendation[]` to `RuleCandidate[]`. Only `dz1-overdue-receivable.ts` has been migrated to natively emit candidates with structured `signals`; the remaining 8 rules still emit ready-to-persist recommendations and are wrapped by `legacyToCandidate()` in `engine.ts` with a `__legacy__` marker that routes them straight to the fallback path inside `analyzeCandidates()`. The engine therefore returns a uniform `RuleCandidate[]` regardless of per-rule migration status.

### Rules Catalog

| Code | Name | Domain | What It Detects |
|------|------|--------|-----------------|
| DZ1 | Overdue Receivables | Accounts Receivable | Counterparties with growing or stale debit balances |
| DZ2 | Debtor Concentration | Accounts Receivable | Single counterparty exceeding concentration threshold |
| DZ3 | Customer Churn | Accounts Receivable | Customers with declining or zero recent turnover |
| KZ1 | Unclosed Advances | Accounts Payable | Supplier advances (debit on account 60) not cleared |
| ZAP1 | Illiquid Inventory | Inventory | Stock items with no movement over the period |
| ZAP2 | Excess Inventory | Inventory | Inventory turnover days exceeding threshold |
| PL1 | Margin Decline | P&L | Gross margin below threshold or declining trend |
| FC1 | Payment Cycle Imbalance | Cash Flow | AR days significantly exceeding AP days |
| SVS1 | Data Quality | Cross-cutting | Missing accounts, zero balances, suspicious patterns |

### Processing Flow (v1.1)

```
ParsedAccountData[] (7 account types)
         │
         ▼
┌────────────────────────┐
│    runRulesEngine()     │
│                         │
│  DZ1 → RuleCandidate[]  │  ← native (with structured signals)
│                         │
│  legacy rules:          │
│    DZ2..SVS1 →          │
│      GeneratedRec[] →   │  ← still emit ready-to-persist text;
│      legacyToCandidate()│    wrapped with `__legacy__: true` marker
│                         │
│  sort by priorityHint:  │
│    critical > high >    │
│    medium > low         │
└────────────┬───────────┘
             │
             ▼
      RuleCandidate[]
             │
             ├─ persisted by /api/analysis/run as recommendations:
             │   • AI-eligible (rule in aiRulesEnabledFor + aiRulesEnabled):
             │       fallback text + aiEnhanced=false  → enhanced later
             │   • legacy or non-eligible:
             │       legacy text or fallback text + aiEnhanced=true
             │
             ▼
   /api/analysis/ai-enhance-batch (client-polled)
             │
             ├─ analyzeCandidates(candidates, metrics, userId):
             │   ├─ skip legacy candidates (already final)
             │   ├─ for each AI-eligible candidate:
             │   │   ├─ load prompt rule_<code> from ai-prompts
             │   │   ├─ call Claude with bounded concurrency (15 s timeout)
             │   │   ├─ parse strict JSON output (priority, title, description,
             │   │   │   shortRecommendation, fullText)
             │   │   ├─ cap AI priority at hint+1 (anti-flood)
             │   │   └─ on any failure → fallbackForCandidate(candidate)
             │   └─ return AnalyzedRecommendation[] with aiEnhanced flag
             ▼
        Updated recommendation rows
        (aiEnhanced=true on success;
         aiEnhanceFailedAt + aiEnhanceError on failure)
```

### Financial Metrics

Calculated from 7 account types (1C chart of accounts):

| Metric | Source Accounts | Formula |
|--------|----------------|---------|
| Revenue | 90.01 | `turnoverCredit` |
| COGS | 90.02 | `turnoverDebit` |
| Gross Profit | — | `revenue - cogs` |
| Gross Margin | — | `(grossProfit / revenue) * 100` |
| Accounts Receivable | 62 | `closingDebit` |
| Accounts Payable | 60 | `closingCredit` |
| Inventory | 41 + 10 | `closingDebit (41) + closingDebit (10)` |
| Shipped Goods | 45 | `closingDebit` |
| AR Turnover Days | 62, 90.01 | `(avgAR / revenue) * 365` |
| AP Turnover Days | 60, 90.02 | `(avgAP / cogs) * 365` |
| Inventory Turnover | 41+10, 90.02 | `(avgInventory / cogs) * 365` |
| Health Index | — | AR/AP ratio: >1.2=fine, 0.8-1.2=issues, <0.8=risky |

---

## 11. Data Pipeline

### End-to-End Data Flow (v1.1)

The pipeline is organised as **deterministic-first, AI-fallback** in two places: file parsing (where AI recovers nonstandard headers/layouts) and rule output (where AI enriches descriptions and drafts the user-facing letter). Both AI stages are driven by client polling so each individual server call fits within Vercel Hobby's 10 s function timeout.

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  1C:Accounting│     │  User       │     │  CSV Upload   │
│  (external)  │────▶│  exports    │────▶│  /api/files/  │
│              │     │  7 CSV files│     │  upload (sync)│
└─────────────┘     └─────────────┘     └──────┬───────┘
                                                │
                                                ▼
                          ┌────────────────────────────────────────┐
                          │  Try identifyFile() + parseOSVFile()    │
                          │  (regex + 7-col / 8-col deterministic)  │
                          └──────────┬─────────────────────────────┘
                                     │
                       success       │       failure (header mismatch
                          │          │        or strict-parser throw)
                          ▼          ▼
       parseStatus='success'   parseStatus='needs_ai_recognition'
       parsedData.parsed       parsedData.raw only
                                     │
                                     ▼  (client polls, AI flag enabled)
                          ┌────────────────────────────────────────┐
                          │  POST /api/files/ai-recognize-batch     │
                          │  (2 files / call, ~6 s wall time)       │
                          │                                          │
                          │  aiIdentifyFile()  →  Claude             │
                          │   `file_recognition` prompt v2           │
                          │   returns { accountCode, period,         │
                          │     documentType, columnFormat }         │
                          │                                          │
                          │  parseOSVFileWithHints()                 │
                          └──────────┬─────────────────────────────┘
                                     │
                       parser ok     │     parser fails after hints
                          │          │
                          ▼          ▼
       parseStatus='success'   parseStatus='needs_ai_extraction'
       parsedData.parsed +     parsedData.aiHints set
       parsedData.aiHints                  │
                                            ▼  (client polls, 1 file / call)
                          ┌────────────────────────────────────────┐
                          │  POST /api/files/ai-extract-next        │
                          │  (1 file / call, ~9 s wall time, files  │
                          │   > aiFileExtractionMaxKB truncated)    │
                          │                                          │
                          │  aiExtractData()  →  Claude              │
                          │   `data_extraction` prompt v2            │
                          │   returns full ParsedAccountData JSON    │
                          │                                          │
                          │  validateParsedAccountData()             │
                          │   (schema + ±5% totals sanity check)     │
                          └──────────┬─────────────────────────────┘
                                     │
                       valid         │       invalid / timeout
                          ▼          ▼
       parseStatus='success'   parseStatus='error'
       parsedData.aiParsed     parseErrors.reason set
       (parsedData.truncated   (raw retained for retry / forensic
        if file was clipped)    review via aiRecognitionLog)
                                     │
                                     ▼  POST /api/analysis/run (sync, ~2 s)
                          ┌────────────────────────────────────────┐
                          │  Skip files in needs_ai_*               │
                          │  Read order: parsed → aiParsed → re-parse│
                          │                                          │
                          │  runRulesEngine(data)   → RuleCandidate[]│
                          │  calculateMetrics(data) → AnalysisMetrics│
                          └──────────┬─────────────────────────────┘
                                     │
                  ┌──────────────────┼──────────────────────────┐
                  ▼                  ▼                          ▼
          ┌───────────────┐  ┌──────────────────┐    ┌─────────────────┐
          │ analysis-      │  │ recommendations    │    │ /api/analysis/   │
          │ results        │  │  • AI-eligible:    │    │ ai-audit         │
          │ (1 record,     │  │     fallback text +│    │ (legacy strategic│
          │  metrics +     │  │     aiEnhanced=false│    │  AI rec stream)  │
          │  topDebtors/   │  │  • legacy/non-AI:   │    └─────────────────┘
          │  Creditors)    │  │     final text +    │
          └───────────────┘  │     aiEnhanced=true │
                              └────────┬───────────┘
                                       │  client polls
                                       ▼
                          ┌────────────────────────────────────────┐
                          │  POST /api/analysis/ai-enhance-batch    │
                          │  (3 candidates / call, ~6-8 s wall time)│
                          │                                          │
                          │  analyzeCandidates() in rule-analyzer:  │
                          │   ├─ for each AI-eligible candidate:    │
                          │   │   load prompt rule_<code>            │
                          │   │   call Claude (15 s timeout)         │
                          │   │   parse JSON, cap priority           │
                          │   │   merge title/description/etc.       │
                          │   └─ on failure → fallback template      │
                          │                                          │
                          │  Update each rec:                       │
                          │   • success → aiEnhanced=true           │
                          │   • failure → aiEnhanceFailedAt +       │
                          │               aiEnhanceError            │
                          │                                          │
                          │  Returns { done, processed, failed,     │
                          │            remaining }                  │
                          └─────────────────────────────────────────┘
```

### Onboarding wizard stages (UI orchestration)

The onboarding wizard runs the full sequence as five visible stages, hiding stages when their work is empty:

| # | Stage | Visible when | Endpoint |
|---|-------|--------------|----------|
| 1 | AI-распознавание файлов | `needs_ai_recognition` count > 0 | poll `/api/files/ai-recognize-batch` until done |
| 2 | AI-извлечение данных | `needs_ai_extraction` count > 0 | poll `/api/files/ai-extract-next` until done |
| 3 | Расчёт метрик | always | inside `/api/analysis/run` |
| 4 | Формирование рекомендаций | always | inside `/api/analysis/run` |
| 5 | AI-анализ рекомендаций | `aiRulesEnabled=true` and any `pendingAi > 0` | poll `/api/analysis/ai-enhance-batch` until done |

Demo mode (`/api/demo/seed`) skips stages 1-2 entirely (canonical demo data) and reuses the same code path for stages 3-5.

### Supported File Types (1C OSV CSV)

| Account Code | Account Name (Russian) | CSV Format | Domain |
|-------------|----------------------|------------|--------|
| 62 | Расчёты с покупателями | 7-column | Receivables |
| 60 | Расчёты с поставщиками | 7-column | Payables |
| 41 | Товары | 8-column | Inventory |
| 10 | Материалы | 8-column | Materials |
| 45 | Товары отгруженные | 8-column | Shipped Goods |
| 90.01 | Выручка | 7-column | Revenue |
| 90.02 | Себестоимость продаж | 7-column | COGS |

---

## 12. External Dependencies

### Runtime External Services

```
┌────────────────────────────────────────────────────────────────────┐
│                        MMLabs Application                         │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  Data Layer       │  │  AI Layer         │  │  Hosting       │  │
│  │                   │  │                   │  │                │  │
│  │  Payload CMS ─────│──│───────────────────│──│── Vercel       │  │
│  │  Mongoose ────────│──│───────────────────│──│──┐             │  │
│  └────────┬─────────┘  └────────┬─────────┘  │  │             │  │
│           │                      │            │  │             │  │
└───────────┼──────────────────────┼────────────┘  │             │  │
            │                      │               │             │  │
            ▼                      ▼               │             │  │
┌──────────────────┐  ┌──────────────────┐         │             │  │
│  MongoDB Atlas    │  │  Anthropic API   │         │             │  │
│                   │  │                  │         │             │  │
│  Provider: MongoDB│  │  Provider:       │         │             │  │
│  Protocol: mongodb│  │    Anthropic     │         │             │  │
│  +srv             │  │  Model: Claude   │         │             │  │
│  Auth: connection │  │    Sonnet 4.6    │         │             │  │
│    string         │  │  Auth: API key   │         │             │  │
│  SLA: Atlas tier- │  │  Billing: per-   │         │             │  │
│    dependent      │  │    token         │         │             │  │
│  Data residency:  │  │  Rate limits:    │         │             │  │
│    configurable   │  │    tier-dependent│         │             │  │
└──────────────────┘  └──────────────────┘         │             │  │
                                                    │             │  │
                                                    ▼             │  │
                                           ┌────────────────┐    │  │
                                           │  Vercel         │    │  │
                                           │                 │    │  │
                                           │  Hosting:       │    │  │
                                           │    Serverless   │    │  │
                                           │  CDN: Global    │    │  │
                                           │  SSL: Auto      │    │  │
                                           │  Deploy: Git    │    │  │
                                           │    push trigger │    │  │
                                           └────────────────┘    │  │
                                                                  │  │
└──────────────────────────────────────────────────────────────────┘  │
```

### Dependency Risk Assessment

| Dependency | Criticality | Failure Impact | Mitigation |
|-----------|-------------|---------------|------------|
| **MongoDB Atlas** | Critical | Full application down | None (single DB) |
| **Vercel** | Critical | Application inaccessible | None (single host) |
| **Anthropic Claude API** | Medium | AI features disabled, rules engine continues | Graceful fallback to deterministic rules |
| **npm registry** | Build-time only | Cannot deploy updates | Lock file ensures reproducibility |
| **Google Fonts (Inter)** | Low | Fallback to system font | Font loaded client-side with `next/font` |

### Future / Placeholder Dependencies

| Dependency | Status | Evidence |
|-----------|--------|---------|
| Google OAuth | Env vars defined, no implementation | `.env.example` has `GOOGLE_CLIENT_ID/SECRET` |
| OpenAI | Schema supports it, no client code | `GlobalSettings.aiProvider` has `'openai'` option |
| Payment provider | Upgrade page exists, no integration | `/app/upgrade/` route |

---

## 13. Observability & Logging

### Event Logging System

All significant user and system actions are logged to the `event-log` collection. Events are **append-only** (no update access) and visible only to admins.

| Event Type | Trigger |
|-----------|---------|
| `auth.login` | Successful login |
| `auth.logout` | Logout |
| `access.request` | Public access request submitted |
| `invite.used` | Invite code redeemed during registration |
| `onboarding.file_upload` | CSV file uploaded |
| `onboarding.analysis_start` | Analysis triggered |
| `onboarding.analysis_complete` | Analysis finished |
| `onboarding.complete` | Onboarding completed |
| `recommendation.status_changed` | Recommendation moved to new status |
| `recommendation.feedback` | User left feedback on recommendation |
| `recommendation.text_copied` | User copied recommendation text |
| `recommendation.viewed` | User opened recommendation detail |
| `ai.request` | AI API call initiated; payload includes `promptKey`, `promptVersion`, `model` |
| `ai.response` | AI API call returned; payload includes token counts, `durationMs`, and (for the file pipeline) `stage: 'file_recognition' \| 'data_extraction'` |
| `ai.error` | AI API call failed or timed out; payload includes `error`, `promptKey`, and (for the file pipeline) `stage` |
| `ai.fallback` | AI unavailable, using rules only |
| `page.view` | Client-side page navigation |

The file pipeline writes a parallel per-file log to `uploaded-files.aiRecognitionLog` (see Section 5), useful for forensic review without joining `event-log` and `ai-usage-logs`.

### AI Usage Tracking

Separate from event logs, the `ai-usage-logs` collection tracks:
- Per-call token consumption (input + output)
- Cost in USD
- Response latency
- Model version used
- Associated prompt key

### Console Logging

Server-side errors are logged via `console.error` / `console.warn` with prefixed tags:
- `[AI]` — AI client errors
- `[AI Audit]` — Audit parsing failures
- `[EventLog]` — Event logging failures
- `[Analysis]` — Analysis pipeline errors
- `[Demo]` — Demo seeding issues

**Note:** No structured logging framework (e.g., Pino, Winston) or external log aggregation service is currently configured.

---

## 14. Security Considerations

### Current Security Measures

| Area | Implementation |
|------|---------------|
| Authentication | JWT with HS256, httpOnly secure cookies, 30-day expiry |
| Authorization | Per-collection access control via Payload, owner-scoped queries |
| CORS | Restricted to `PAYLOAD_PUBLIC_SERVER_URL` only |
| CSRF | Configured in Payload config |
| Admin panel | Obscured route (`/8ca90f70`), admin role required |
| Secrets | Environment variables, never committed (`.gitignore` includes `.env`) |
| Robots | `noindex` meta tag on frontend pages |
| Input | CSV parsing uses deterministic regex, no `eval` |
| API keys | Anthropic key server-side only, never exposed to client |

### Areas Requiring Attention

| Concern | Current State | Recommendation |
|---------|--------------|----------------|
| Rate limiting | None on API routes | Add rate limiting (especially `/api/auth/login`, `/api/files/upload`) |
| Input validation | Minimal on API routes | Add Zod or similar validation schemas |
| Invite code brute-force | No attempt limiting | Add rate limiting on `/api/invite-codes/validate` |
| PAYLOAD_SECRET rotation | Static after deploy | Document rotation procedure |
| Admin route obscurity | Security through obscurity | Not a security boundary — add IP allowlisting or 2FA |
| Dev endpoints | `/api/dev/*` routes exist | Ensure disabled in production |
| File upload size | No explicit limit in code | Configure Vercel/Next.js body size limits |
| Dependency audit | No `npm audit` in CI | Add to build pipeline |

---

## 15. Known Limitations & Technical Debt

### Architecture

| Item | Description | Impact |
|------|-------------|--------|
| Monolithic deployment | All components in one process | Scaling constraints, single point of failure |
| No job queue / no background worker | AI work is split into ≤9 s chunks and driven by client polling instead of a queue. Works on Vercel Hobby but couples progress to the user's open tab — closing the browser mid-onboarding leaves recommendations with `aiEnhanced=false` and files with `parseStatus='needs_ai_*'` until next visit. | Wasted partial AI cost on abandoned sessions; no server-side retry of stuck items |
| No CI/CD pipeline | No test suite, no automated checks | Deployment risk |
| No caching layer | Every page load queries MongoDB | Performance under load |
| Zustand unused | Dependency declared but never imported | Dead dependency |
| Google OAuth placeholder | Env vars defined, no implementation | Incomplete feature |
| OpenAI placeholder | Schema supports it, no client code | Dead configuration path |

### Data

| Item | Description | Impact |
|------|-------------|--------|
| No database indexes defined | Relies on Payload/Mongoose defaults | Query performance at scale |
| JSON fields for complex data | `topDebtors`, `topCreditors`, `parsedData` | Cannot query or index efficiently |
| No data backup strategy | Relies on Atlas defaults | Data loss risk |
| No migration system | Payload handles schema evolution | May need explicit migrations for complex changes |

### Operations

| Item | Description | Impact |
|------|-------------|--------|
| No health check endpoint | Cannot verify app status programmatically | Monitoring gap |
| No structured logging | `console.error` only | Difficult debugging in production |
| No alerting | No integration with PagerDuty, Slack, etc. | Slow incident response |
| No performance monitoring | No APM tool configured | Blind to performance regressions |

---

*This document was generated from a direct analysis of the repository source code on April 16, 2026.*
