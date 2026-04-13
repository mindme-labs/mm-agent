# Content Delivery API — Billing System Specification

**Version:** 1.0 — Draft  
**Date:** April 2026  
**Status:** Baseline for automation  
**Scope:** REST API + MCP Server billing via a unified credit system

---

## 1. Design Principles

1. **One currency.** All billable operations — whether invoked via REST API (`Authorization: Bearer ds_live_...`) or MCP tools (`Authorization: Bearer <mcp_access_token>`) — consume credits from the same wallet. No MCP surcharge.
2. **Cost mirrors infrastructure.** Credit prices reflect the real cost drivers: platform API quota consumed, ClickHouse compute, queue processing, and media transfer. Tenants who use expensive operations pay proportionally more.
3. **Never gate onboarding or maintenance.** Authentication, OAuth flows, organization management, platform discovery, token refresh, and health checks are always free. Charging for these increases churn and support load.
4. **Variable pricing for bulk operations.** Operations whose cost scales with payload size (SAS import, future bulk endpoints) use a base + per-unit formula rather than a flat credit cost.
5. **Fail-open by default.** When a tenant's balance is insufficient, the system rejects the request with a clear error (`402`, `X-Credits-Required`, `X-Credits-Balance`) but never silently degrades service on non-billable endpoints.

---

## 2. Account & Wallet Model

### 2.1 Wallet ownership

The credit wallet is a property of the **ApiClient** entity (the tenant), not individual users. All users within an organization share the same wallet through their linked ApiClient.

### 2.2 Wallet fields (additions to ApiClient)

| Field | Type | Description |
|---|---|---|
| `plan` | enum | `starter`, `growth`, `scale`, `enterprise` |
| `credit_balance` | integer | Current available credits |
| `monthly_credit_allowance` | integer | Credits granted per billing cycle |
| `overage_enabled` | boolean | Whether auto-top-up is active |
| `overage_pack_size` | integer | Credits per auto-top-up (default: 500) |
| `overage_pack_price_cents` | integer | Cost per top-up pack in cents |
| `billing_cycle_start` | date | First day of current billing period |
| `credits_used_this_cycle` | integer | Running counter, resets each cycle |
| `max_connections` | integer | Connection limit per plan |

### 2.3 Credit transaction log

Every credit debit or credit is recorded in a `credit_transactions` table for audit, invoicing, and usage analytics.

| Field | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `api_client_id` | FK | Owning tenant |
| `type` | enum | `allowance_grant`, `debit`, `overage_topup`, `manual_adjustment`, `refund` |
| `amount` | integer | Positive = credit added, negative = credit consumed |
| `balance_after` | integer | Wallet balance after this transaction |
| `operation` | string | Endpoint path or MCP tool name (e.g. `POST /api/v1/assignments` or `mcp:create_assignment`) |
| `resource_id` | string (nullable) | Related entity ID (assignment ID, connection ID, etc.) |
| `meta` | json (nullable) | Variable-cost breakdown (e.g. `{"videos_imported": 100, "base": 2, "per_unit": 2}`) |
| `created_at` | datetime | Timestamp |

### 2.4 Plans

| Plan | Monthly credits | Max connections | Monthly price | Overage pack |
|---|---|---|---|---|
| **Starter** | 500 | 2 | Free | Not available |
| **Growth** | 5,000 | 10 | $49 | 500 credits / $15 |
| **Scale** | 25,000 | 50 | $199 | 1,000 credits / $25 |
| **Enterprise** | Custom | Unlimited | Custom | Custom |

Unused credits do not roll over. At `billing_cycle_start + 1 month`, the system grants a fresh `monthly_credit_allowance` and resets `credits_used_this_cycle`.

---

## 3. Credit Schedule — Complete Endpoint Map

### 3.1 Tier definitions

| Tier | Credits | Cost driver | Applies to |
|---|---|---|---|
| **FREE** | 0 | No marginal cost; gating hurts onboarding or maintenance | Auth, OAuth, org management, platform registry, health |
| **READ** | 1 | Simple DB read (single row or paginated list) | GET on assignments, connections, webhook deliveries, SAS posts |
| **WRITE** | 2 | DB mutation without external API call | PATCH/DELETE on assignments, PATCH on connections |
| **ANALYTICS** | 2–4 | ClickHouse aggregation query; cost varies with query complexity | All `/stats/*` endpoints |
| **PLATFORM** | 3 | Outbound call to YouTube/Meta API consuming shared OAuth quota | Stats refresh, SAS post refresh |
| **BULK_PLATFORM** | variable | Multiple outbound platform API calls; scales with data volume | SAS import |
| **PUBLISH** | 10 | Full publishing pipeline: platform API + media transfer + queue + webhook | Create assignment |
| **RETRY** | 5 | Re-queue + platform API without intake processing | Retry assignment |

### 3.2 REST API endpoints

#### Assignments

| Method | Path | Credits | Tier | Notes |
|---|---|---|---|---|
| POST | `/api/v1/assignments` | **10** | PUBLISH | Core value action. Includes outbound webhook delivery at no extra cost. |
| GET | `/api/v1/assignments` | 1 | READ | Paginated list. |
| GET | `/api/v1/assignments/{id}` | 1 | READ | |
| PATCH | `/api/v1/assignments/{id}` | 2 | WRITE | Only pending/scheduled assignments. |
| POST | `/api/v1/assignments/{id}/retry` | **5** | RETRY | Discounted: skips intake validation. |
| DELETE | `/api/v1/assignments/{id}` | 2 | WRITE | Cancellation; may trigger queue removal. |

#### Connections

| Method | Path | Credits | Tier | Notes |
|---|---|---|---|---|
| GET | `/api/v1/connections` | 1 | READ | |
| GET | `/api/v1/connections/{id}` | 1 | READ | |
| PATCH | `/api/v1/connections/{id}` | 2 | WRITE | Update name, externalId, isActive. |
| POST | `/api/v1/connections/{id}/refresh-token` | 0 | FREE | Maintenance — never gated. |

#### Connection Stats

| Method | Path | Credits | Tier | Notes |
|---|---|---|---|---|
| GET | `/api/v1/connections/{id}/stats` | 1 | READ | Cached stats; no platform call. |
| POST | `/api/v1/connections/{id}/stats/refresh` | **3** | PLATFORM | Live YouTube/Meta API call. Consumes ~1–3 YT quota units. |

#### Platforms

| Method | Path | Credits | Tier | Notes |
|---|---|---|---|---|
| GET | `/api/v1/platforms` | 0 | FREE | Static registry. |
| GET | `/api/v1/platforms/{platform}/capabilities` | 0 | FREE | Static registry. |

#### Analytics / Stats

| Method | Path | Credits | Tier | Notes |
|---|---|---|---|---|
| GET | `/api/v1/stats/overview` | 2 | ANALYTICS | Single aggregation query. |
| GET | `/api/v1/stats/dashboard` | 2 | ANALYTICS | Single aggregation query. |
| GET | `/api/v1/stats/youtube` | 2 | ANALYTICS | Platform-scoped aggregation. |
| GET | `/api/v1/stats/recent-posts` | 2 | ANALYTICS | Scan with joins. |
| GET | `/api/v1/stats/analytics` | **3** | ANALYTICS | Time-series aggregation; heavier query. |
| GET | `/api/v1/stats/subscriber-growth` | 2 | ANALYTICS | Time-series query. |
| GET | `/api/v1/stats/publishing-pattern` | 2 | ANALYTICS | Bucketed aggregation. |
| GET | `/api/v1/stats/compare` | **4** | ANALYTICS | Two parallel queries. |

#### Webhooks

| Method | Path | Credits | Tier | Notes |
|---|---|---|---|---|
| GET | `/api/v1/webhooks/deliveries` | 1 | READ | Paginated log. Outbound delivery itself is free (bundled into PUBLISH). |

#### OAuth / Channel Connect

| Method | Path | Credits | Tier | Notes |
|---|---|---|---|---|
| POST | `/api/v1/oauth/tickets` | 0 | FREE | Onboarding flow. |
| GET | `/api/v1/oauth/{platform}/authorize` | 0 | FREE | Browser redirect. |
| GET | `/api/v1/oauth/{platform}/callback` | 0 | FREE | Token exchange. |

#### User Auth (JWT)

| Method | Path | Credits | Tier | Notes |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | 0 | FREE | |
| POST | `/api/v1/auth/login` | 0 | FREE | |
| GET | `/api/v1/auth/me` | 0 | FREE | |
| PATCH | `/api/v1/auth/profile` | 0 | FREE | |
| POST | `/api/v1/auth/change-password` | 0 | FREE | |

#### Organizations & Members

| Method | Path | Credits | Tier | Notes |
|---|---|---|---|---|
| GET | `/api/v1/auth/organizations` | 0 | FREE | |
| GET | `/api/v1/auth/organizations/{id}` | 0 | FREE | |
| GET | `/api/v1/auth/organizations/{id}/members` | 0 | FREE | |
| PATCH | `/api/v1/auth/organizations/{orgId}/members/{memberId}/role` | 0 | FREE | |
| DELETE | `/api/v1/auth/organizations/{orgId}/members/{memberId}` | 0 | FREE | |

#### Invitations

| Method | Path | Credits | Tier | Notes |
|---|---|---|---|---|
| POST | `/api/v1/auth/organizations/{orgId}/invitations` | 0 | FREE | |
| GET | `/api/v1/auth/organizations/{orgId}/invitations` | 0 | FREE | |
| POST | `/api/v1/auth/invitations/{token}/accept` | 0 | FREE | |

#### SAS (Social Analytics Service)

| Method | Path | Credits | Tier | Notes |
|---|---|---|---|---|
| POST | `/api/v1/connections/{id}/sas-import` | **variable** | BULK_PLATFORM | Formula: `2 + ceil(videos_imported / 50)`. See §3.3. |
| GET | `/api/v1/connections/{id}/sas-posts` | 1 | READ | |
| POST | `/api/v1/sas-posts/{id}/refresh` | **3** | PLATFORM | Single post refresh against platform API. |
| GET | `/api/v1/sas-posts/{id}/stats` | 1 | READ | Cached time-series. |

#### Health

| Method | Path | Credits | Tier | Notes |
|---|---|---|---|---|
| GET | `/api/v1/health` | 0 | FREE | Unauthenticated liveness probe. |

#### Admin API

All `/api/v1/admin/*` endpoints are **operator-only** (internal), authenticated separately, and **excluded from tenant billing**. They do not consume tenant credits.

#### MCP OAuth endpoints

| Path | Credits | Notes |
|---|---|---|
| `POST /oauth/mcp/register` | 0 | Client registration. |
| `GET /oauth/mcp/authorize` | 0 | Consent screen. |
| `POST /oauth/mcp/token` | 0 | Token exchange/refresh. |
| `GET /.well-known/*` | 0 | Discovery documents. |

### 3.3 Variable-cost formula: SAS Import

The SAS import operation pulls a channel's full video catalog from YouTube or Facebook. The cost scales with video count because each page of 50 results consumes one YouTube Data API quota unit from the shared OAuth app pool.

**Formula:**

```
credits = 2 (base) + ceil(videos_imported / 50) × 1
```

| Channel size | API pages | Credits |
|---|---|---|
| 25 videos | 1 | 3 |
| 100 videos | 2 | 4 |
| 500 videos | 10 | 12 |
| 2,000 videos | 40 | 42 |
| 5,000 videos | 100 | 102 |

The base cost (2) covers the channel metadata lookup (`channels.list` = 1 YT unit) and the initial `playlistItems.list` call. Each subsequent page adds 1 credit.

The final credit cost is calculated **after** the import completes (post-debit model for this endpoint only), since the exact video count is not known in advance. The wallet must have at least the base cost (2 credits) for the request to be accepted; if the final cost exceeds the balance, the overage system handles the remainder.

**Transaction `meta` field** records the breakdown:

```json
{
  "videos_imported": 100,
  "api_pages": 2,
  "base_credits": 2,
  "per_page_credits": 2,
  "total_credits": 4,
  "yt_quota_units_consumed": 5
}
```

### 3.4 MCP tool → credit mapping

Every MCP tool maps to exactly one REST endpoint and inherits its credit cost. The billing middleware resolves the MCP tool name to the underlying endpoint before debiting.

| MCP Tool | REST equivalent | Credits |
|---|---|---|
| `create_assignment` | POST `/assignments` | 10 |
| `get_assignment` | GET `/assignments/{id}` | 1 |
| `list_assignments` | GET `/assignments` | 1 |
| `update_assignment` | PATCH `/assignments/{id}` | 2 |
| `cancel_assignment` | DELETE `/assignments/{id}` | 2 |
| `retry_assignment` | POST `/assignments/{id}/retry` | 5 |
| `list_connections` | GET `/connections` | 1 |
| `get_connection` | GET `/connections/{id}` | 1 |
| `update_connection` | PATCH `/connections/{id}` | 2 |
| `get_connection_stats` | GET `/connections/{id}/stats` | 1 |
| `get_oauth_connect_url` | POST `/oauth/tickets` | 0 |
| `list_platforms` | GET `/platforms` | 0 |
| `get_platform_capabilities` | GET `/platforms/{platform}/capabilities` | 0 |
| `get_stats_overview` | GET `/stats/overview` | 2 |
| `get_stats_dashboard` | GET `/stats/dashboard` | 2 |
| `get_analytics` | GET `/stats/analytics` | 3 |
| `get_recent_posts` | GET `/stats/recent-posts` | 2 |
| `get_subscriber_growth` | GET `/stats/subscriber-growth` | 2 |
| `get_publishing_pattern` | GET `/stats/publishing-pattern` | 2 |
| `compare_stats` | GET `/stats/compare` | 4 |
| `list_webhook_deliveries` | GET `/webhooks/deliveries` | 1 |

---

## 4. Billing Enforcement

### 4.1 Middleware flow

All billable requests pass through a `CreditBillingMiddleware` (Symfony event subscriber on `kernel.request` or equivalent):

```
Request received
  → Resolve ApiClient from auth token (JWT → org → ApiClient, or MCP token → ApiClient)
  → Look up credit cost for the endpoint/tool (from static schedule + variable formulas)
  → If cost = 0: pass through, no billing
  → If cost > 0 and balance >= cost: reserve credits (atomic decrement), proceed
  → If cost > 0 and balance < cost and overage_enabled: trigger auto-top-up, then reserve
  → If cost > 0 and balance < cost and !overage_enabled: reject with 402
  → On successful response: confirm debit, write credit_transaction
  → On failed response (5xx, platform error): refund reserved credits, write reversal transaction
```

### 4.2 Error response for insufficient credits

```json
{
  "error": "insufficient_credits",
  "message": "This operation requires 10 credits but your balance is 3.",
  "credits_required": 10,
  "credits_balance": 3,
  "upgrade_url": "https://console.example.com/settings/billing"
}
```

HTTP status: `402 Payment Required`  
Headers: `X-Credits-Required: 10`, `X-Credits-Balance: 3`, `X-Credits-Used-This-Cycle: 4997`

### 4.3 Response headers on every billable request

Every successful response includes:

| Header | Example | Description |
|---|---|---|
| `X-Credits-Charged` | `10` | Credits consumed by this request |
| `X-Credits-Balance` | `2340` | Remaining wallet balance |
| `X-Credits-Used-This-Cycle` | `2660` | Total consumed this billing cycle |

These headers are returned for both REST and MCP responses. For MCP, they appear as response metadata.

### 4.4 Post-debit model (SAS import only)

For variable-cost operations where the final cost is unknown at request time:

1. Reserve the **base cost** (2 credits) at request start.
2. Execute the operation.
3. Calculate the final cost based on actual work done.
4. Debit the **difference** (final − base) from the wallet.
5. If the wallet cannot cover the difference and overage is disabled, the import still completes (work is already done), but the wallet goes negative and the tenant is flagged for follow-up.
6. Write a single `credit_transaction` with the full cost and detailed `meta`.

### 4.5 Refund policy

- **Platform failures** (YouTube/Meta API error, timeout): Full refund of reserved credits. Automatic.
- **Duplicate assignment** (idempotency key match): No charge; the existing assignment is returned.
- **Tenant-caused errors** (invalid payload, missing fields): 1 credit charged (minimum request cost). Remaining reserved credits refunded.
- **Manual refunds**: Operator creates a `manual_adjustment` transaction via admin API.

---

## 5. Billing Cycle Management

### 5.1 Monthly reset

On the first day of each billing cycle (based on `billing_cycle_start`):

1. Set `credit_balance = monthly_credit_allowance`
2. Set `credits_used_this_cycle = 0`
3. Write a `allowance_grant` transaction for the full allowance amount
4. If wallet was negative (overage debt), subtract the debt from the new allowance

### 5.2 Plan changes

- **Upgrade (mid-cycle):** Immediately add the difference in credits (`new_allowance − old_allowance`). New plan limits (connections) take effect immediately. Pro-rated charges on the subscription side.
- **Downgrade (mid-cycle):** Takes effect at next billing cycle. Current credits and limits remain until then. If current connection count exceeds new plan limit, no connections are removed — tenant cannot add new ones until under the limit.

### 5.3 Overage top-ups

When `overage_enabled = true` and a request would exceed the balance:

1. Automatically add `overage_pack_size` credits to the wallet.
2. Write an `overage_topup` transaction.
3. Queue a billing charge for `overage_pack_price_cents` to the tenant's payment method.
4. Proceed with the original request.

Starter plan does not support overage. When Starter tenants exhaust credits, they receive a 402 with an upgrade prompt.

---

## 6. YouTube Quota Accounting

SAS import and stats refresh operations consume YouTube Data API quota from the shared `OAuthAppConfig`. The billing system tracks this separately to protect against quota exhaustion.

### 6.1 Estimated YouTube quota per operation

| Operation | YT Data API calls | Units per call | Total YT units |
|---|---|---|---|
| Stats refresh (`/stats/refresh`) | 1× `channels.list` | 1 | **1** |
| SAS import (100 videos) | 1× `channels.list` + 2× `playlistItems.list` + 2× `videos.list` | 1 each | **5** |
| SAS import (1,000 videos) | 1× `channels.list` + 20× `playlistItems.list` + 20× `videos.list` | 1 each | **41** |
| SAS post refresh | 1× `videos.list` | 1 | **1** |
| Create assignment (video upload) | 1× `videos.insert` | 1,600 | **1,600** |

### 6.2 Daily quota guard

The system should track cumulative YouTube quota consumption per `OAuthAppConfig` per day. When usage reaches 80% of the daily limit (default: 10,000 units), the system:

1. Logs a warning.
2. Rejects new SAS import requests with a `429 Too Many Requests` and `Retry-After` header.
3. Allows assignments (publishes) to continue — these are the highest-value operation.

This is an **operator-level safeguard**, not a tenant-facing billing feature. Tenants see credits; the operator manages YouTube quota capacity across all tenants.

---

## 7. Console Integration

The management console surfaces billing state in two places:

### 7.1 Dashboard — credit usage card

A summary card on the main dashboard showing: credits used / total allowance (progress bar), plan name, and days remaining in cycle. An alert surfaces when usage exceeds 80%.

### 7.2 Settings — Billing page (new)

| Section | Content |
|---|---|
| **Current plan** | Plan name, price, allowance, connection limit. Upgrade/downgrade buttons. |
| **Credit balance** | Current balance, used this cycle, allowance. Progress bar. |
| **Overage** | Toggle on/off. Pack size and price display. |
| **Usage history** | Paginated table from `credit_transactions`: date, operation, credits, balance after. Filterable by type. Exportable as CSV. |
| **Invoices** | List of monthly invoices with line items: base plan + overage packs. Links to PDF. |

### 7.3 API endpoint for billing state

A new endpoint (free, no credit cost) for programmatic access:

```
GET /api/v1/billing/status

{
  "plan": "growth",
  "credit_balance": 2340,
  "monthly_allowance": 5000,
  "credits_used_this_cycle": 2660,
  "cycle_start": "2026-04-01",
  "cycle_end": "2026-04-30",
  "overage_enabled": true,
  "overage_packs_purchased_this_cycle": 0,
  "max_connections": 10,
  "connections_used": 4
}
```

---

## 8. Implementation Scope

### 8.1 Minimal viable implementation (Phase 1)

1. **Schema changes**: Add wallet fields to `ApiClient`, create `credit_transactions` table.
2. **Static credit schedule**: Hard-coded cost map (endpoint → credits) loaded into the billing middleware.
3. **CreditBillingMiddleware**: Symfony event subscriber. Atomic balance check + decrement. Writes transaction log.
4. **402 response handling**: Standardized error format with credit headers.
5. **Billing status endpoint**: `GET /api/v1/billing/status`.
6. **Console billing page**: Read-only display of balance, usage history, and plan.

### 8.2 Phase 2

1. **Overage automation**: Stripe integration for auto-top-up packs.
2. **Plan management**: Self-service upgrade/downgrade via console.
3. **Variable-cost billing**: Post-debit model for SAS import.
4. **Invoice generation**: Monthly PDF invoices with line items.
5. **Usage alerts**: Email/webhook notifications at 50%, 80%, 100% thresholds.

### 8.3 Phase 3

1. **YouTube quota guard**: Per-OAuthApp daily tracking with automatic throttling.
2. **Usage analytics**: ClickHouse-backed dashboards for credit consumption patterns.
3. **Enterprise features**: Custom rate cards, committed-use discounts, credit wallet API for resellers.

---

## Appendix A — Decision Log

| Decision | Rationale |
|---|---|
| Credits on ApiClient, not User | Billing is per-tenant; all org members share the same API access and should share the same wallet. |
| No MCP surcharge | MCP tools call the same REST endpoints internally. Charging more would discourage AI integration adoption, which is a key differentiator. |
| Free auth/org/OAuth endpoints | These reduce time-to-integration (product goal #1). Charging for them would increase support tickets (anti-goal #2). |
| Outbound webhook delivery bundled into PUBLISH | Webhooks are a consequence of publishing, not a separately valuable action. Charging separately would penalize tenants for using callbacks, which improves their integration reliability. |
| SAS import uses variable pricing | A flat cost would either overcharge small channels or subsidize large ones. The per-page formula mirrors actual YouTube quota consumption (1 API call = 1 quota unit ≈ 50 videos). |
| Post-debit for SAS import | The exact video count isn't known until the import runs. Pre-reserving a worst-case amount would block credits unnecessarily. |
| Starter plan has no overage | Prevents accidental charges for free-tier users. Clear upgrade path instead. |
| Failed platform calls get full refund | The tenant received no value. Charging for YouTube/Meta failures would erode trust. |
| Admin API excluded from billing | These are operator-internal tools, not tenant-facing. They operate outside the credit system entirely. |
