/**
 * Maps a business model to the set of rule codes that should be evaluated
 * for that model.
 *
 * Source: docs/cursor-dev-spec.md iter-18 — initial hypothesis. Will be
 * tuned based on rule fire-rates and CEO feedback.
 *
 * Hybrid models = union of base components.
 * `clinic` = consulting ∪ trading.
 *
 * Safe default for unknown / undefined model: `trading` allowlist (all 9
 * rules) — matches v3.2 behavior and never silently strips rules.
 */
import { ALL_RULE_CODES, type RuleCode } from '@/lib/rules/types'
import type { BusinessModel } from './matrix'

const ALL_RULES: ReadonlySet<RuleCode> = new Set(ALL_RULE_CODES)

// Pure trading & manufacturing get the full deck.
const TRADING: ReadonlySet<RuleCode> = ALL_RULES
const PRODUCTION: ReadonlySet<RuleCode> = ALL_RULES

// Project / subscription / consulting / agency: no inventory rules — these
// businesses don't run a stock balance, so ZAP-1 (illiquid) and ZAP-2 (excess)
// would always misfire.
const NO_INVENTORY: ReadonlySet<RuleCode> = new Set<RuleCode>([
  'ДЗ-1',
  'ДЗ-2',
  'ДЗ-3',
  'КЗ-1',
  'ПЛ-1',
  'ФЦ-1',
  'СВС-1',
])

function union(...sets: ReadonlySet<RuleCode>[]): ReadonlySet<RuleCode> {
  const out = new Set<RuleCode>()
  for (const s of sets) for (const code of s) out.add(code)
  return out
}

export const RULE_ALLOWLIST: Record<BusinessModel, ReadonlySet<RuleCode>> = {
  // Base
  project: NO_INVENTORY,
  trading: TRADING,
  production: PRODUCTION,
  subscription: NO_INVENTORY,
  consulting: NO_INVENTORY,
  agency: NO_INVENTORY,

  // Hybrids — union of base components
  project_trading: union(NO_INVENTORY, TRADING), // = ALL
  production_project: union(PRODUCTION, NO_INVENTORY), // = ALL
  consulting_subscription: union(NO_INVENTORY, NO_INVENTORY), // = NO_INVENTORY
  trading_agency: union(TRADING, NO_INVENTORY), // = ALL
  subscription_consulting: union(NO_INVENTORY, NO_INVENTORY), // = NO_INVENTORY
  production_trading: union(PRODUCTION, TRADING), // = ALL

  // Industry — clinic = consulting ∪ trading (per spec line 1189)
  clinic: union(NO_INVENTORY, TRADING), // = ALL (because trading has ZAP rules)
}

const DEFAULT_ALLOWLIST: ReadonlySet<RuleCode> = TRADING

/**
 * Returns the allowlist for a given business model.
 *
 * Defensive: unknown / undefined input returns the trading allowlist (all 9
 * rules) so we never silently strip rules due to a model-name typo or a
 * missing classification result. The behavior matches v3.2 (no allowlist).
 */
export function getAllowedRules(model: BusinessModel | null | undefined): ReadonlySet<RuleCode> {
  if (!model) return DEFAULT_ALLOWLIST
  return RULE_ALLOWLIST[model] ?? DEFAULT_ALLOWLIST
}
