/**
 * Failsafe text generators for each rule.
 *
 * When the AI rule analyzer is disabled, the API key is missing, the AI call
 * fails, or the response cannot be parsed, the analyzer falls back to one of
 * these pure functions to produce a deterministic recommendation.
 *
 * Each function takes a `RuleCandidate` and returns a complete
 * `GeneratedRecommendation` ready to persist.
 */

import type { GeneratedRecommendation, RuleCandidate } from '@/types'
import { fillTemplate, formatAmount, TEMPLATES } from './templates'
import { isLegacyCandidate, legacyCandidateToRecommendation } from './engine'

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback
}

export function fallbackForDZ1(candidate: RuleCandidate): GeneratedRecommendation {
  const balance = asNumber(candidate.signals.balance, candidate.impactAmount)
  const consecutiveNoPayment = asNumber(candidate.signals.consecutiveNoPayment, 0)
  const recentPayments = asNumber(candidate.signals.recentPayments, 0)
  const paymentRatio = asNumber(candidate.signals.paymentRatio, 0)
  const penaltyAmount = asNumber(candidate.signals.penaltyAmount, 0)
  const counterpartyName = candidate.counterparty ?? 'Контрагент'

  const isHard = consecutiveNoPayment >= 2

  if (isHard) {
    return {
      ruleCode: candidate.ruleCode,
      ruleName: candidate.ruleName,
      priority: candidate.priorityHint,
      title: `${counterpartyName} — просрочка ${consecutiveNoPayment} мес.`,
      description: `Дебиторская задолженность ${formatAmount(balance)} руб. без оплат более ${consecutiveNoPayment} мес.`,
      shortRecommendation: `Направить досудебную претензию с расчётом пени ${formatAmount(penaltyAmount)} руб.`,
      fullText: fillTemplate(TEMPLATES['ДЗ-1б'], {
        counterparty: counterpartyName,
        amount: formatAmount(balance),
        months: String(consecutiveNoPayment),
        penaltyAmount: formatAmount(penaltyAmount),
        totalAmount: formatAmount(balance + penaltyAmount),
        deadline: '10 рабочих дней',
        companyName: '{companyName}',
      }),
      impactMetric: candidate.impactMetric,
      impactDirection: candidate.impactDirection,
      impactAmount: candidate.impactAmount,
      sourceAccount: candidate.sourceAccount,
      counterparty: candidate.counterparty,
      recipient: candidate.recipient,
    }
  }

  if (consecutiveNoPayment === 0) {
    return {
      ruleCode: candidate.ruleCode,
      ruleName: candidate.ruleName,
      priority: candidate.priorityHint,
      title: `${counterpartyName} — оплаты замедлились`,
      description: `Задолженность ${formatAmount(balance)} руб. Оплаты за последние 2 мес. составили лишь ${formatAmount(recentPayments)} руб. (${paymentRatio}% от долга).`,
      shortRecommendation: 'Направить письмо с просьбой о сверке расчётов.',
      fullText: fillTemplate(TEMPLATES['ДЗ-1а'], {
        counterparty: counterpartyName,
        amount: formatAmount(balance),
        months: '1',
        companyName: '{companyName}',
      }),
      impactMetric: candidate.impactMetric,
      impactDirection: candidate.impactDirection,
      impactAmount: candidate.impactAmount,
      sourceAccount: candidate.sourceAccount,
      counterparty: candidate.counterparty,
      recipient: candidate.recipient,
    }
  }

  return {
    ruleCode: candidate.ruleCode,
    ruleName: candidate.ruleName,
    priority: candidate.priorityHint,
    title: `${counterpartyName} — нет оплат 1 мес.`,
    description: `Задолженность ${formatAmount(balance)} руб., оплаты не поступали 1 месяц.`,
    shortRecommendation: 'Направить письмо с просьбой о сверке расчётов.',
    fullText: fillTemplate(TEMPLATES['ДЗ-1а'], {
      counterparty: counterpartyName,
      amount: formatAmount(balance),
      months: '1',
      companyName: '{companyName}',
    }),
    impactMetric: candidate.impactMetric,
    impactDirection: candidate.impactDirection,
    impactAmount: candidate.impactAmount,
    sourceAccount: candidate.sourceAccount,
    counterparty: candidate.counterparty,
    recipient: candidate.recipient,
  }
}

const FALLBACK_REGISTRY: Record<string, (c: RuleCandidate) => GeneratedRecommendation> = {
  'ДЗ-1': fallbackForDZ1,
}

export function fallbackForCandidate(candidate: RuleCandidate): GeneratedRecommendation {
  if (isLegacyCandidate(candidate)) {
    return legacyCandidateToRecommendation(candidate)
  }
  const handler = FALLBACK_REGISTRY[candidate.ruleCode]
  if (handler) return handler(candidate)
  return genericFallback(candidate)
}

function genericFallback(candidate: RuleCandidate): GeneratedRecommendation {
  const counterpartyName = candidate.counterparty ?? '—'
  return {
    ruleCode: candidate.ruleCode,
    ruleName: candidate.ruleName,
    priority: candidate.priorityHint,
    title: `${candidate.ruleName}${candidate.counterparty ? ` — ${counterpartyName}` : ''}`,
    description: `Сработало правило "${candidate.ruleName}". Сумма влияния: ${formatAmount(candidate.impactAmount)} руб.`,
    shortRecommendation: 'Изучите детали и примите решение.',
    fullText: '',
    impactMetric: candidate.impactMetric,
    impactDirection: candidate.impactDirection,
    impactAmount: candidate.impactAmount,
    sourceAccount: candidate.sourceAccount,
    counterparty: candidate.counterparty,
    recipient: candidate.recipient,
  }
}
