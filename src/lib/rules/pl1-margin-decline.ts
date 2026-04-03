import type { ParsedAccountData, GeneratedRecommendation } from '@/types'
import { formatAmount } from './templates'

export function runPL1(data: ParsedAccountData[]): GeneratedRecommendation[] {
  const acc9001 = data.find(d => d.accountCode === '90.01')
  const acc9002 = data.find(d => d.accountCode === '90.02')
  if (!acc9001 || !acc9002) return []

  const results: GeneratedRecommendation[] = []
  const revenueByMonth = new Map<string, number>()
  const cogsByMonth = new Map<string, number>()

  for (const entity of acc9001.entities) {
    for (const m of entity.monthly) {
      revenueByMonth.set(m.month, (revenueByMonth.get(m.month) ?? 0) + m.turnoverCredit)
    }
  }
  for (const entity of acc9002.entities) {
    for (const m of entity.monthly) {
      cogsByMonth.set(m.month, (cogsByMonth.get(m.month) ?? 0) + m.turnoverDebit)
    }
  }

  for (const [month, revenue] of revenueByMonth) {
    if (revenue <= 0) continue
    const cogs = cogsByMonth.get(month) ?? 0
    const margin = ((revenue - cogs) / revenue) * 100

    if (margin < 15) {
      results.push({
        ruleCode: 'ПЛ-1',
        ruleName: 'Снижение валовой рентабельности',
        priority: 'high',
        title: `Рентабельность ${margin.toFixed(1)}% — ${month}`,
        description: `Валовая рентабельность за ${month}: ${margin.toFixed(1)}%. Выручка: ${formatAmount(revenue)} руб., себестоимость: ${formatAmount(cogs)} руб.`,
        shortRecommendation: 'Пересмотреть ценовую политику и себестоимость поставок.',
        fullText: `Аналитическая записка: Снижение рентабельности\n\nЗа ${month} валовая рентабельность составила ${margin.toFixed(1)}%.\nВыручка: ${formatAmount(revenue)} руб.\nСебестоимость: ${formatAmount(cogs)} руб.\nВаловая прибыль: ${formatAmount(revenue - cogs)} руб.\n\nРекомендуется пересмотреть ценовую политику и условия закупок.`,
        impactMetric: 'strategic',
        impactDirection: 'decrease',
        impactAmount: 0,
        sourceAccount: '90.01, 90.02',
        recipient: 'CEO',
      })
    }
  }

  return results
}
