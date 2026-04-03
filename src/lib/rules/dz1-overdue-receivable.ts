import type { ParsedAccountData, GeneratedRecommendation } from '@/types'
import { fillTemplate, formatAmount, TEMPLATES } from './templates'

export function runDZ1(data: ParsedAccountData[]): GeneratedRecommendation[] {
  const acc62 = data.find(d => d.accountCode === '62')
  if (!acc62) return []

  const results: GeneratedRecommendation[] = []

  for (const entity of acc62.entities) {
    if (entity.totals.closingDebit <= 0) continue

    const monthly = entity.monthly
    if (monthly.length < 2) continue

    let consecutiveNoPayment = 0
    for (let i = monthly.length - 1; i >= 0; i--) {
      if (monthly[i].turnoverCredit === 0) consecutiveNoPayment++
      else break
    }

    if (consecutiveNoPayment < 1) {
      // Also flag if entity has high balance but recent payments are very low
      const lastMonths = monthly.slice(-2)
      const recentPayments = lastMonths.reduce((s, m) => s + m.turnoverCredit, 0)
      const balance = entity.totals.closingDebit
      if (balance > 300_000 && recentPayments > 0 && recentPayments < balance * 0.65) {
        results.push({
          ruleCode: 'ДЗ-1',
          ruleName: 'Просроченная дебиторская задолженность',
          priority: 'medium',
          title: `${entity.name} — оплаты замедлились`,
          description: `Задолженность ${formatAmount(balance)} руб. Оплаты за последние 2 мес. составили лишь ${formatAmount(recentPayments)} руб. (${(recentPayments / balance * 100).toFixed(0)}% от долга).`,
          shortRecommendation: 'Направить письмо с просьбой о сверке расчётов.',
          fullText: fillTemplate(TEMPLATES['ДЗ-1а'], {
            counterparty: entity.name,
            amount: formatAmount(balance),
            months: '1',
            companyName: '{companyName}',
          }),
          impactMetric: 'accounts_receivable',
          impactDirection: 'decrease',
          impactAmount: balance,
          sourceAccount: '62',
          counterparty: entity.name,
          recipient: 'Бухгалтер',
        })
      }
      continue
    }

    const amount = entity.totals.closingDebit
    const isHard = consecutiveNoPayment >= 2
    const isHighPriority = isHard && amount > 500_000

    if (isHard) {
      const penaltyDays = consecutiveNoPayment * 30
      const penaltyAmount = Math.round(amount * 0.001 * penaltyDays)
      results.push({
        ruleCode: 'ДЗ-1',
        ruleName: 'Просроченная дебиторская задолженность',
        priority: isHighPriority ? 'high' : 'medium',
        title: `${entity.name} — просрочка ${consecutiveNoPayment} мес.`,
        description: `Дебиторская задолженность ${formatAmount(amount)} руб. без оплат более ${consecutiveNoPayment} мес.`,
        shortRecommendation: `Направить досудебную претензию с расчётом пени ${formatAmount(penaltyAmount)} руб.`,
        fullText: fillTemplate(TEMPLATES['ДЗ-1б'], {
          counterparty: entity.name,
          amount: formatAmount(amount),
          months: String(consecutiveNoPayment),
          penaltyAmount: formatAmount(penaltyAmount),
          totalAmount: formatAmount(amount + penaltyAmount),
          deadline: '10 рабочих дней',
          companyName: '{companyName}',
        }),
        impactMetric: 'accounts_receivable',
        impactDirection: 'decrease',
        impactAmount: amount,
        sourceAccount: '62',
        counterparty: entity.name,
        recipient: isHighPriority ? 'Юрист' : 'Бухгалтер',
      })
    } else {
      results.push({
        ruleCode: 'ДЗ-1',
        ruleName: 'Просроченная дебиторская задолженность',
        priority: 'medium',
        title: `${entity.name} — нет оплат 1 мес.`,
        description: `Задолженность ${formatAmount(amount)} руб., оплаты не поступали 1 месяц.`,
        shortRecommendation: 'Направить письмо с просьбой о сверке расчётов.',
        fullText: fillTemplate(TEMPLATES['ДЗ-1а'], {
          counterparty: entity.name,
          amount: formatAmount(amount),
          months: '1',
          companyName: '{companyName}',
        }),
        impactMetric: 'accounts_receivable',
        impactDirection: 'decrease',
        impactAmount: amount,
        sourceAccount: '62',
        counterparty: entity.name,
        recipient: 'Бухгалтер',
      })
    }
  }

  return results
}
