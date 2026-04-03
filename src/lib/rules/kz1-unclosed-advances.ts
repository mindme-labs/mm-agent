import type { ParsedAccountData, GeneratedRecommendation } from '@/types'
import { fillTemplate, formatAmount, TEMPLATES } from './templates'

export function runKZ1(data: ParsedAccountData[]): GeneratedRecommendation[] {
  const acc60 = data.find(d => d.accountCode === '60')
  if (!acc60) return []

  const results: GeneratedRecommendation[] = []

  for (const entity of acc60.entities) {
    if (entity.totals.closingDebit <= 0) continue

    const monthly = entity.monthly
    let consecutiveNoReceipt = 0
    for (let i = monthly.length - 1; i >= 0; i--) {
      if (monthly[i].turnoverCredit === 0) consecutiveNoReceipt++
      else break
    }

    const amount = entity.totals.closingDebit
    if (consecutiveNoReceipt < 2 && !(consecutiveNoReceipt >= 1 && amount > 500_000)) continue

    const isHigher = amount > 500_000

    results.push({
      ruleCode: 'КЗ-1',
      ruleName: 'Незакрытые авансы поставщикам',
      priority: isHigher ? 'medium' : 'low',
      title: `${entity.name} — аванс без поставки`,
      description: `Оплачен аванс ${formatAmount(amount)} руб. Поступления товара нет ${consecutiveNoReceipt}+ мес.`,
      shortRecommendation: 'Запросить у поставщика статус отгрузки.',
      fullText: fillTemplate(TEMPLATES['КЗ-1'], {
        counterparty: entity.name,
        amount: formatAmount(amount),
        companyName: '{companyName}',
      }),
      impactMetric: 'accounts_payable',
      impactDirection: 'decrease',
      impactAmount: amount,
      sourceAccount: '60',
      counterparty: entity.name,
      recipient: 'Менеджер закупок',
    })
  }

  return results
}
