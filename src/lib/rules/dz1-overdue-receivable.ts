import type { ParsedAccountData, RuleCandidate } from '@/types'

export function runDZ1(data: ParsedAccountData[]): RuleCandidate[] {
  const acc62 = data.find(d => d.accountCode === '62')
  if (!acc62) return []

  const candidates: RuleCandidate[] = []

  for (const entity of acc62.entities) {
    if (entity.totals.closingDebit <= 0) continue

    const monthly = entity.monthly
    if (monthly.length < 2) continue

    let consecutiveNoPayment = 0
    for (let i = monthly.length - 1; i >= 0; i--) {
      if (monthly[i].turnoverCredit === 0) consecutiveNoPayment++
      else break
    }

    const balance = entity.totals.closingDebit
    const lastMonths = monthly.slice(-2)
    const recentPayments = lastMonths.reduce((s, m) => s + m.turnoverCredit, 0)
    const paymentRatio = balance > 0 ? Math.round((recentPayments / balance) * 100) : 0

    if (consecutiveNoPayment < 1) {
      // Edge case: high balance with weak recent payments — still worth flagging.
      if (balance > 300_000 && recentPayments > 0 && recentPayments < balance * 0.65) {
        candidates.push({
          ruleCode: 'ДЗ-1',
          ruleName: 'Просроченная дебиторская задолженность',
          priorityHint: 'medium',
          impactMetric: 'accounts_receivable',
          impactDirection: 'decrease',
          impactAmount: balance,
          sourceAccount: '62',
          counterparty: entity.name,
          recipient: 'Бухгалтер',
          signals: {
            balance,
            consecutiveNoPayment: 0,
            recentPayments,
            paymentRatio,
            penaltyAmount: 0,
            scenario: 'slowing_payments',
          },
          fallbackTemplateKey: 'ДЗ-1а',
        })
      }
      continue
    }

    const isHard = consecutiveNoPayment >= 2
    const isHighPriority = isHard && balance > 500_000
    const penaltyDays = consecutiveNoPayment * 30
    const penaltyAmount = Math.round(balance * 0.001 * penaltyDays)

    candidates.push({
      ruleCode: 'ДЗ-1',
      ruleName: 'Просроченная дебиторская задолженность',
      priorityHint: isHighPriority ? 'high' : 'medium',
      impactMetric: 'accounts_receivable',
      impactDirection: 'decrease',
      impactAmount: balance,
      sourceAccount: '62',
      counterparty: entity.name,
      recipient: isHighPriority ? 'Юрист' : 'Бухгалтер',
      signals: {
        balance,
        consecutiveNoPayment,
        recentPayments,
        paymentRatio,
        penaltyAmount,
        penaltyDays,
        scenario: isHard ? 'hard_overdue' : 'soft_overdue',
      },
      fallbackTemplateKey: isHard ? 'ДЗ-1б' : 'ДЗ-1а',
    })
  }

  return candidates
}
