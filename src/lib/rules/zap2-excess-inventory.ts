import type { ParsedAccountData, GeneratedRecommendation } from '@/types'
import { fillTemplate, formatAmount, TEMPLATES } from './templates'

export function runZAP2(data: ParsedAccountData[]): GeneratedRecommendation[] {
  const acc41 = data.find(d => d.accountCode === '41')
  if (!acc41) return []

  const results: GeneratedRecommendation[] = []

  for (const entity of acc41.entities) {
    if (entity.totals.closingDebit <= 0) continue

    const monthly = entity.monthly
    const salesMonths = monthly.filter(m => m.turnoverCredit > 0)
    if (salesMonths.length === 0) continue // illiquid, handled by ZAP-1

    const totalSales = salesMonths.reduce((s, m) => s + m.turnoverCredit, 0)
    const avgMonthlySales = totalSales / salesMonths.length

    if (avgMonthlySales <= 0) continue

    const stockDays = Math.round((entity.totals.closingDebit / avgMonthlySales) * 30)
    if (stockDays <= 180) continue

    const normativeStock = avgMonthlySales * 3
    const excessAmount = Math.max(0, entity.totals.closingDebit - normativeStock)

    results.push({
      ruleCode: 'ЗАП-2',
      ruleName: 'Избыточные складские запасы',
      priority: 'medium',
      title: `${entity.name} — запас на ${stockDays} дней`,
      description: `Остаток ${formatAmount(entity.totals.closingDebit)} руб. при средних продажах ${formatAmount(avgMonthlySales)} руб./мес. Обеспеченность: ${stockDays} дней.`,
      shortRecommendation: 'Приостановить закупку этой позиции на квартал.',
      fullText: fillTemplate(TEMPLATES['ЗАП-2'], {
        productName: entity.name,
        amount: formatAmount(entity.totals.closingDebit),
        avgMonthlySales: formatAmount(avgMonthlySales),
        stockDays: String(stockDays),
      }),
      impactMetric: 'inventory',
      impactDirection: 'decrease',
      impactAmount: excessAmount,
      sourceAccount: '41',
      counterparty: entity.name,
      recipient: 'Менеджер закупок',
    })
  }

  return results
}
