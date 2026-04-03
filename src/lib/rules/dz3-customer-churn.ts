import type { ParsedAccountData, GeneratedRecommendation } from '@/types'
import { fillTemplate, formatAmount, TEMPLATES } from './templates'

export function runDZ3(data: ParsedAccountData[]): GeneratedRecommendation[] {
  const acc62 = data.find(d => d.accountCode === '62')
  if (!acc62) return []

  const results: GeneratedRecommendation[] = []

  for (const entity of acc62.entities) {
    const monthly = entity.monthly
    if (monthly.length < 6) continue

    const first6 = monthly.slice(0, 6)
    const activeMonths = first6.filter(m => m.turnoverDebit > 0).length
    if (activeMonths < 3) continue

    const last2 = monthly.slice(-2)
    const hasRecentActivity = last2.some(m => m.turnoverDebit > 0)
    if (hasRecentActivity) continue

    const totalDebit = monthly.reduce((s, m) => s + m.turnoverDebit, 0)
    const activeCount = monthly.filter(m => m.turnoverDebit > 0).length
    const avgMonthly = activeCount > 0 ? totalDebit / activeCount : 0

    if (avgMonthly < 10_000) continue

    const isHigh = avgMonthly > 200_000

    results.push({
      ruleCode: 'ДЗ-3',
      ruleName: 'Снижение активности ключевых покупателей',
      priority: isHigh ? 'high' : 'medium',
      title: `${entity.name} — нет заказов 2+ мес.`,
      description: `Клиент имел стабильные закупки (${activeMonths} из 6 мес.), но прекратил заказы. Ср. объём: ${formatAmount(avgMonthly)} руб./мес.`,
      shortRecommendation: 'Связаться с клиентом, предложить специальные условия.',
      fullText: fillTemplate(TEMPLATES['ДЗ-3'], {
        contactName: entity.name,
        usualCycle: 'месяц',
        avgMonthlyAmount: formatAmount(avgMonthly),
        managerName: '{managerName}',
        companyName: '{companyName}',
      }),
      impactMetric: 'revenue',
      impactDirection: 'decrease',
      impactAmount: Math.round(avgMonthly * 3),
      sourceAccount: '62',
      counterparty: entity.name,
      recipient: 'Менеджер продаж',
    })
  }

  return results
}
