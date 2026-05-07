/**
 * Wire-format types for the AI business-model classifier.
 *
 * Mirrors the JSON schema we ask Claude to emit in the
 * `business_model_classification` prompt. Validation lives in `classifier.ts`
 * (no zod dependency in the project — we hand-roll a `safeParse`-style
 * validator that returns null on shape mismatch).
 */

import type { BusinessModel, IndicatorKey } from './matrix'

export type ClassificationStatus = 'success' | 'needs_data' | 'cannot_classify'

/**
 * Account 26 destination — where overhead is closed (90 = directly to revenue,
 * 20 = via production, 44 = via sales). Useful indicator for project vs.
 * trading vs. production discrimination.
 */
export type Account26Destination = '90' | '20' | '44' | 'missing'

/**
 * Per-indicator measurements computed by the AI from ParsedAccountData.
 * Each indicator is either a measured value or the literal string `'missing'`
 * when the AI could not compute it from the available data.
 *
 * Numeric ranges:
 *  - inventory_balance_41:        ruble balance on account 41 (rounded to ₽)
 *  - wip_balance_20:              ruble balance on account 20
 *  - finished_goods_43:           ruble balance on account 43
 *  - revenue_regularity_score:    [0, 1], 1 = perfectly even monthly revenue
 *  - fot_share_in_cogs:           [0, 1], salary share of COGS
 *  - agency_transit_share:        [0, 1], transit-via-76/62 share
 */
export interface ClassificationIndicators {
  inventory_balance_41?: number | 'missing'
  wip_balance_20?: number | 'missing'
  finished_goods_43?: number | 'missing'
  revenue_regularity_score?: number | 'missing'
  fot_share_in_cogs?: number | 'missing'
  agency_transit_share?: number | 'missing'
  account_26_destination?: Account26Destination
  /**
   * List of `IndicatorKey` values where measurement was 'missing'.
   * Filled in by the validator for ergonomic downstream filtering.
   */
  _missing: string[]
}

export interface ClassificationResult {
  status: ClassificationStatus
  /** Best-guess model. `null` only when status === 'cannot_classify'. */
  model: BusinessModel | null
  /** Confidence in [0, 1]. `null` only when status === 'cannot_classify'. */
  confidence: number | null
  /** 2-4 short bullet points in Russian explaining the choice. */
  rationale: string[]
  indicators: ClassificationIndicators
  /**
   * When status === 'needs_data', up to 3 account codes that would resolve
   * the ambiguity. Null otherwise.
   */
  requestedAccounts: string[] | null
  /**
   * When the AI detected an "artifact of bad accounting" (signals look like a
   * hybrid but don't form a coherent business story), this carries the
   * explanation; the model is downgraded to its base form.
   */
  dataQualityWarning: string | null
}

/**
 * Subset of indicator keys we ask the AI to compute (matches `IndicatorKey`).
 * Re-exported for convenience so callers don't have to import from matrix.ts.
 */
export const INDICATOR_KEYS_FOR_AI: readonly IndicatorKey[] = [
  'inventory_balance_41',
  'wip_balance_20',
  'finished_goods_43',
  'revenue_regularity_score',
  'fot_share_in_cogs',
  'agency_transit_share',
  'account_26_destination',
] as const
