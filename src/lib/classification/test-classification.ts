/**
 * Smoke tests for the v3.3.1 classification matrix and rule allowlist.
 *
 * Follows the project's existing convention (see `src/lib/rules/test-rules.ts`,
 * `src/lib/parser/test-parser.ts`) — tsx-runnable assertion script with no
 * external test runner.
 *
 * Run: `npx tsx src/lib/classification/test-classification.ts`
 */
import {
  ALL_BUSINESS_MODELS,
  ALL_INDICATOR_KEYS,
  MODELS,
  type BusinessModel,
  type IndicatorStrength,
} from './matrix.ts'
import { RULE_ALLOWLIST, getAllowedRules } from './rule-allowlist.ts'
import { ALL_RULE_CODES, type RuleCode } from '../rules/types.ts'

let pass = 0
let fail = 0
const failures: string[] = []

function assert(cond: boolean, label: string) {
  if (cond) {
    pass++
  } else {
    fail++
    failures.push(label)
  }
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  assert(actual === expected, `${label} (expected ${String(expected)}, got ${String(actual)})`)
}

// ---------- Matrix coverage ----------
console.log('\n=== Matrix coverage ===')
assertEqual(ALL_BUSINESS_MODELS.length, 13, 'matrix has exactly 13 models')

const VALID_STRENGTHS: ReadonlySet<IndicatorStrength> = new Set([
  'strong',
  'moderate',
  'weak',
  'contradicts',
])

for (const model of ALL_BUSINESS_MODELS) {
  const def = MODELS[model]
  assert(def !== undefined, `MODELS has entry for "${model}"`)
  assertEqual(def.id, model, `MODELS["${model}"].id matches key`)
  assert(def.name.length > 0, `"${model}" has non-empty Russian name`)
  assert(def.nameEn.length > 0, `"${model}" has non-empty English name`)
  assert(def.description.length > 0, `"${model}" has non-empty description`)
  assert(['base', 'hybrid', 'industry'].includes(def.category), `"${model}" has valid category`)

  // Every indicator value must be one of 4 valid strengths.
  for (const key of ALL_INDICATOR_KEYS) {
    const v = def.indicators[key]
    if (v !== undefined) {
      assert(VALID_STRENGTHS.has(v), `"${model}".${key} is a valid strength (got ${v})`)
    }
  }
}

// Spot-check a few key indicators.
console.log('\n=== Indicator spot-checks ===')
assertEqual(MODELS.trading.indicators.inventory_balance_41, 'strong', 'trading: inventory=strong')
assertEqual(MODELS.trading.indicators.wip_balance_20, 'contradicts', 'trading: wip=contradicts')
assertEqual(MODELS.production.indicators.wip_balance_20, 'strong', 'production: wip=strong')
assertEqual(MODELS.production.indicators.finished_goods_43, 'strong', 'production: 43=strong')
assertEqual(
  MODELS.subscription.indicators.revenue_regularity_score,
  'strong',
  'subscription: regularity=strong',
)
assertEqual(MODELS.subscription.indicators.fot_share_in_cogs, 'strong', 'subscription: fot=strong')
assertEqual(MODELS.consulting.indicators.fot_share_in_cogs, 'strong', 'consulting: fot=strong')
assertEqual(MODELS.agency.indicators.agency_transit_share, 'strong', 'agency: transit=strong')
assertEqual(MODELS.project.indicators.account_26_destination, 'strong', 'project: 26=strong')

// Hybrid inheritance: production_trading inherits strong from both bases.
assertEqual(
  MODELS.production_trading.indicators.inventory_balance_41,
  'strong',
  'production_trading: inv inherited from trading=strong',
)
assertEqual(
  MODELS.production_trading.indicators.finished_goods_43,
  'strong',
  'production_trading: 43 inherited from production=strong',
)

// ---------- Rule allowlist ----------
console.log('\n=== Rule allowlist ===')
assertEqual(ALL_RULE_CODES.length, 9, 'there are exactly 9 rule codes')

for (const model of ALL_BUSINESS_MODELS) {
  const allow = RULE_ALLOWLIST[model]
  assert(allow !== undefined, `RULE_ALLOWLIST has entry for "${model}"`)
  assert(allow.size > 0, `RULE_ALLOWLIST["${model}"] is non-empty`)
  for (const code of allow) {
    assert(
      (ALL_RULE_CODES as readonly RuleCode[]).includes(code),
      `RULE_ALLOWLIST["${model}"] contains valid code (saw "${code}")`,
    )
  }
}

// Spec line 1173: trading = all 9; project = 7 (no ZAP-1, ZAP-2);
// hybrids that include trading or production = 9; clinic = 9.
assertEqual(getAllowedRules('trading').size, 9, 'trading => 9 rules')
assertEqual(getAllowedRules('production').size, 9, 'production => 9 rules')
assertEqual(getAllowedRules('project').size, 7, 'project => 7 rules')
assertEqual(getAllowedRules('subscription').size, 7, 'subscription => 7 rules')
assertEqual(getAllowedRules('consulting').size, 7, 'consulting => 7 rules')
assertEqual(getAllowedRules('agency').size, 7, 'agency => 7 rules')

assert(!getAllowedRules('project').has('ЗАП-1'), 'project => no ZAP-1')
assert(!getAllowedRules('project').has('ЗАП-2'), 'project => no ZAP-2')
assert(getAllowedRules('project').has('ДЗ-1'), 'project => has DZ-1')
assert(getAllowedRules('project').has('СВС-1'), 'project => has SVS-1')

// Hybrid containing inventory model => has inventory rules.
assert(getAllowedRules('project_trading').has('ЗАП-1'), 'project_trading inherits ZAP-1 from trading')
assert(getAllowedRules('production_project').has('ЗАП-1'), 'production_project inherits ZAP-1 from production')
assert(getAllowedRules('trading_agency').has('ЗАП-1'), 'trading_agency inherits ZAP-1 from trading')
assert(getAllowedRules('production_trading').has('ЗАП-1'), 'production_trading inherits ZAP-1')

// Hybrid of two non-inventory models => no inventory rules.
assertEqual(getAllowedRules('consulting_subscription').size, 7, 'consulting_subscription => 7 rules')
assert(!getAllowedRules('consulting_subscription').has('ЗАП-1'), 'consulting_subscription => no ZAP-1')
assert(!getAllowedRules('subscription_consulting').has('ЗАП-2'), 'subscription_consulting => no ZAP-2')

// Clinic = consulting ∪ trading => 9 rules.
assertEqual(getAllowedRules('clinic').size, 9, 'clinic => 9 rules (consulting ∪ trading)')

// Defensive defaults.
assertEqual(getAllowedRules(undefined).size, 9, 'undefined => trading default (9 rules)')
assertEqual(getAllowedRules(null).size, 9, 'null => trading default (9 rules)')
assertEqual(
  getAllowedRules('made_up_value' as unknown as BusinessModel).size,
  9,
  'unknown model => trading default (9 rules)',
)

// ---------- Summary ----------
console.log(`\n=== Result ===`)
console.log(`pass: ${pass}, fail: ${fail}`)
if (fail > 0) {
  console.error('\nFailures:')
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('All assertions passed.')
