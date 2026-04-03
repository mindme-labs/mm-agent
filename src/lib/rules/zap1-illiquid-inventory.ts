import type { ParsedAccountData, GeneratedRecommendation } from '@/types'
import { fillTemplate, formatAmount, TEMPLATES } from './templates'

export function runZAP1(data: ParsedAccountData[]): GeneratedRecommendation[] {
  const results: GeneratedRecommendation[] = []

  for (const acc of data.filter(d => d.accountCode === '41' || d.accountCode === '10')) {
    for (const entity of acc.entities) {
      if (entity.totals.closingDebit <= 0) continue

      const monthly = entity.monthly
      let consecutiveNoSales = 0
      for (let i = monthly.length - 1; i >= 0; i--) {
        if (monthly[i].turnoverCredit === 0) consecutiveNoSales++
        else break
      }

      if (consecutiveNoSales < 2) continue

      const amount = entity.totals.closingDebit
      const isHigher = amount > 100_000

      results.push({
        ruleCode: 'ЗАП-1',
        ruleName: 'Неликвидные складские запасы',
        priority: isHigher ? 'medium' : 'low',
        title: `${entity.name} — без движения ${consecutiveNoSales}+ мес.`,
        description: `Товар на сумму ${formatAmount(amount)} руб. на складе без реализации более ${consecutiveNoSales * 30} дней.`,
        shortRecommendation: 'Предложить скидку 15% ключевым покупателям этого товара.',
        fullText: fillTemplate(TEMPLATES['ЗАП-1'], {
          productName: entity.name,
          amount: formatAmount(amount),
        }),
        impactMetric: 'inventory',
        impactDirection: 'decrease',
        impactAmount: amount,
        sourceAccount: acc.accountCode,
        counterparty: entity.name,
        recipient: 'Менеджер продаж',
      })
    }
  }

  return results
}
