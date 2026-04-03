import type { ParsedAccountData, GeneratedRecommendation } from '@/types'
import { fillTemplate, formatAmount, TEMPLATES } from './templates'

export function runDZ2(data: ParsedAccountData[]): GeneratedRecommendation[] {
  const acc62 = data.find(d => d.accountCode === '62')
  if (!acc62) return []

  const totalAR = acc62.totals.closingDebit
  if (totalAR <= 0) return []

  const results: GeneratedRecommendation[] = []

  for (const entity of acc62.entities) {
    const share = entity.totals.closingDebit / totalAR
    if (share <= 0.30) continue

    const amount = entity.totals.closingDebit
    const discount = 1.5
    const partialAmount = Math.round(amount * 0.5)
    const discountedAmount = Math.round(partialAmount * (1 - discount / 100))

    results.push({
      ruleCode: 'ДЗ-2',
      ruleName: 'Критическая концентрация ДЗ',
      priority: 'critical',
      title: `${entity.name} — ${Math.round(share * 100)}% дебиторки`,
      description: `Долг контрагента достиг ${formatAmount(amount)} руб. Это ${Math.round(share * 100)}% от всей ДЗ. Задержка их платежа парализует бизнес.`,
      shortRecommendation: `Предложить скидку ${discount}% за досрочное погашение части долга.`,
      fullText: fillTemplate(TEMPLATES['ДЗ-2'], {
        counterparty: entity.name,
        amount: formatAmount(amount),
        discount: String(discount),
        partialAmount: formatAmount(partialAmount),
        discountedAmount: formatAmount(discountedAmount),
        deadline: '3 рабочих дня',
        companyName: '{companyName}',
      }),
      impactMetric: 'accounts_receivable',
      impactDirection: 'decrease',
      impactAmount: amount,
      sourceAccount: '62',
      counterparty: entity.name,
      recipient: 'CEO',
    })
  }

  // Multi-counterparty concentration: top 3 > 40%
  if (results.length === 0) {
    const sorted = [...acc62.entities]
      .filter(e => e.totals.closingDebit > 0)
      .sort((a, b) => b.totals.closingDebit - a.totals.closingDebit)
    const top3 = sorted.slice(0, 3)
    const top3Total = top3.reduce((s, e) => s + e.totals.closingDebit, 0)
    const top3Share = top3Total / totalAR

    if (top3Share > 0.35 && top3.length === 3) {
      const names = top3.map(e => e.name).join(', ')
      results.push({
        ruleCode: 'ДЗ-2',
        ruleName: 'Критическая концентрация ДЗ',
        priority: 'high',
        title: `Топ-3 клиента — ${Math.round(top3Share * 100)}% дебиторки`,
        description: `${names} — в сумме ${formatAmount(top3Total)} руб. (${Math.round(top3Share * 100)}% от ДЗ). Высокая зависимость от нескольких клиентов.`,
        shortRecommendation: 'Диверсифицировать клиентскую базу, снизить зависимость от крупнейших дебиторов.',
        fullText: `Аналитическая записка: Концентрация дебиторской задолженности\n\nТоп-3 дебитора (${names}) формируют ${Math.round(top3Share * 100)}% от всей ДЗ.\nОбщая сумма: ${formatAmount(top3Total)} руб. из ${formatAmount(totalAR)} руб.\n\nРекомендации:\n1. Провести работу по диверсификации клиентской базы\n2. Установить лимиты отгрузки для крупнейших контрагентов\n3. Рассмотреть возможность факторинга для снижения риска`,
        impactMetric: 'accounts_receivable',
        impactDirection: 'decrease',
        impactAmount: top3Total,
        sourceAccount: '62',
        recipient: 'CEO',
      })
    }
  }

  return results
}
