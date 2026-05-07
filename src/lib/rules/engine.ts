import type { GeneratedRecommendation, ParsedAccountData, RuleCandidate } from '@/types'
import type { RuleCode } from './types'
import { runDZ1 } from './dz1-overdue-receivable'
import { runDZ2 } from './dz2-concentration'
import { runDZ3 } from './dz3-customer-churn'
import { runKZ1 } from './kz1-unclosed-advances'
import { runZAP1 } from './zap1-illiquid-inventory'
import { runZAP2 } from './zap2-excess-inventory'
import { runPL1 } from './pl1-margin-decline'
import { runFC1 } from './fc1-payment-cycle-imbalance'
import { runSVS1 } from './svs1-data-quality'

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

type RuleRunner =
  | { kind: 'native'; code: RuleCode; run: (data: ParsedAccountData[]) => RuleCandidate[] }
  | { kind: 'legacy'; code: RuleCode; run: (data: ParsedAccountData[]) => GeneratedRecommendation[] }

const RULE_RUNNERS: readonly RuleRunner[] = [
  { kind: 'native', code: 'ДЗ-1', run: runDZ1 },
  { kind: 'legacy', code: 'ДЗ-2', run: runDZ2 },
  { kind: 'legacy', code: 'ДЗ-3', run: runDZ3 },
  { kind: 'legacy', code: 'КЗ-1', run: runKZ1 },
  { kind: 'legacy', code: 'ЗАП-1', run: runZAP1 },
  { kind: 'legacy', code: 'ЗАП-2', run: runZAP2 },
  { kind: 'legacy', code: 'ПЛ-1', run: runPL1 },
  { kind: 'legacy', code: 'ФЦ-1', run: runFC1 },
  { kind: 'legacy', code: 'СВС-1', run: runSVS1 },
] as const

/**
 * Runs rules and returns `RuleCandidate[]`.
 *
 * @param data         parsed account data (ОСВ выгрузки)
 * @param allowedRules optional whitelist of rule codes to evaluate. When
 *                     omitted, all rules run (v3.2-compatible behavior).
 *
 * Migration state: only `runDZ1` returns native candidates today; the other 8
 * rules still return ready-to-persist `GeneratedRecommendation` objects. We
 * wrap those legacy outputs in a "synthetic" candidate that carries the
 * generated text in its `signals` payload, so the analyzer can fall back to it
 * deterministically without touching the legacy rule code.
 *
 * As each legacy rule is migrated in Phase 2, switch its runner kind from
 * 'legacy' to 'native' in `RULE_RUNNERS`.
 */
export function runRulesEngine(
  data: ParsedAccountData[],
  allowedRules?: ReadonlySet<RuleCode>,
): RuleCandidate[] {
  const candidates: RuleCandidate[] = []
  let skipped = 0

  for (const runner of RULE_RUNNERS) {
    if (allowedRules && !allowedRules.has(runner.code)) {
      skipped++
      continue
    }

    if (runner.kind === 'native') {
      candidates.push(...runner.run(data))
    } else {
      const recs = runner.run(data)
      for (const rec of recs) candidates.push(legacyToCandidate(rec))
    }
  }

  if (allowedRules && skipped > 0) {
    console.log(`[Rules] Skipped ${skipped} of ${RULE_RUNNERS.length} rules not in allowlist`)
  }

  candidates.sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priorityHint] ?? 99) - (PRIORITY_ORDER[b.priorityHint] ?? 99),
  )

  return candidates
}

const LEGACY_MARKER = '__legacy__'

function legacyToCandidate(rec: GeneratedRecommendation): RuleCandidate {
  return {
    ruleCode: rec.ruleCode,
    ruleName: rec.ruleName,
    priorityHint: rec.priority,
    impactMetric: rec.impactMetric,
    impactDirection: rec.impactDirection,
    impactAmount: rec.impactAmount,
    sourceAccount: rec.sourceAccount,
    counterparty: rec.counterparty,
    recipient: rec.recipient,
    signals: {
      [LEGACY_MARKER]: true,
      title: rec.title,
      description: rec.description,
      shortRecommendation: rec.shortRecommendation,
      fullText: rec.fullText,
    },
  }
}

export function isLegacyCandidate(candidate: RuleCandidate): boolean {
  return candidate.signals[LEGACY_MARKER] === true
}

export function legacyCandidateToRecommendation(
  candidate: RuleCandidate,
): GeneratedRecommendation {
  return {
    ruleCode: candidate.ruleCode,
    ruleName: candidate.ruleName,
    priority: candidate.priorityHint,
    title: String(candidate.signals.title ?? candidate.ruleName),
    description: String(candidate.signals.description ?? ''),
    shortRecommendation: String(candidate.signals.shortRecommendation ?? ''),
    fullText: String(candidate.signals.fullText ?? ''),
    impactMetric: candidate.impactMetric,
    impactDirection: candidate.impactDirection,
    impactAmount: candidate.impactAmount,
    sourceAccount: candidate.sourceAccount,
    counterparty: candidate.counterparty,
    recipient: candidate.recipient,
  }
}
