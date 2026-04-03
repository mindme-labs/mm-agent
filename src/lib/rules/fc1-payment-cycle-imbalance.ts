import type { ParsedAccountData, GeneratedRecommendation } from '@/types'
import { fillTemplate, formatAmount, TEMPLATES } from './templates'

export function runFC1(data: ParsedAccountData[]): GeneratedRecommendation[] {
  const acc62 = data.find(d => d.accountCode === '62')
  const acc60 = data.find(d => d.accountCode === '60')
  const acc9001 = data.find(d => d.accountCode === '90.01')
  const acc9002 = data.find(d => d.accountCode === '90.02')

  if (!acc62 || !acc60 || !acc9001 || !acc9002) return []

  const periodDays = 365
  const revenue = acc9001.totals.turnoverCredit
  const cogs = acc9002.totals.turnoverDebit

  if (revenue <= 0 || cogs <= 0) return []

  const avgAR = (acc62.totals.openingDebit + acc62.totals.closingDebit) / 2
  const avgAP = (acc60.totals.openingCredit + acc60.totals.closingCredit) / 2

  const arDays = Math.round((avgAR / revenue) * periodDays)
  const apDays = Math.round((avgAP / cogs) * periodDays)

  const results: GeneratedRecommendation[] = []

  if (arDays > apDays * 1.5) {
    const delta = arDays - apDays
    const dailyRevenue = revenue / periodDays
    const frozenAmount = Math.round(dailyRevenue * delta)
    const isHigh = delta > 30

    results.push({
      ruleCode: 'ФЦ-1',
      ruleName: 'Дисбаланс платёжных циклов',
      priority: isHigh ? 'high' : 'medium',
      title: `Клиенты платят на ${delta} дн. дольше`,
      description: `Оборачиваемость ДЗ: ${arDays} дн., КЗ: ${apDays} дн. Разрыв ${delta} дн. замораживает ~${formatAmount(frozenAmount)} руб.`,
      shortRecommendation: 'Сократить отсрочки клиентам, увеличить отсрочки от поставщиков.',
      fullText: fillTemplate(TEMPLATES['ФЦ-1'], {
        dzDays: String(arDays),
        kzDays: String(apDays),
        delta: String(delta),
        frozenAmount: formatAmount(frozenAmount),
      }),
      impactMetric: 'strategic',
      impactDirection: 'decrease',
      impactAmount: frozenAmount,
      sourceAccount: '60, 62',
      recipient: 'CEO',
    })
  }

  // Health index: AR/AP ratio warning
  const ar = acc62.totals.closingDebit
  const ap = acc60.totals.closingCredit
  if (ap > 0) {
    const ratio = ar / ap
    if (ratio < 1.0) {
      const deficit = Math.round(ap - ar)
      results.push({
        ruleCode: 'ФЦ-1',
        ruleName: 'Дисбаланс платёжных циклов',
        priority: ratio < 0.8 ? 'high' : 'medium',
        title: `КЗ превышает ДЗ на ${formatAmount(deficit)} ₽`,
        description: `Дебиторская задолженность: ${formatAmount(ar)} руб., кредиторская: ${formatAmount(ap)} руб. Соотношение ДЗ/КЗ = ${ratio.toFixed(2)}. Компания должна поставщикам больше, чем ей должны покупатели.`,
        shortRecommendation: 'Ускорить сбор дебиторки, пересмотреть условия с поставщиками.',
        fullText: `Стратегическая рекомендация: Баланс ДЗ и КЗ\n\nДЗ: ${formatAmount(ar)} руб.\nКЗ: ${formatAmount(ap)} руб.\nСоотношение ДЗ/КЗ: ${ratio.toFixed(2)}\nДефицит: ${formatAmount(deficit)} руб.\n\nРекомендации:\n1. Ускорить сбор дебиторской задолженности\n2. Пересмотреть условия оплаты с крупнейшими поставщиками\n3. Рассмотреть факторинг для ускорения оборачиваемости ДЗ`,
        impactMetric: 'strategic',
        impactDirection: 'decrease',
        impactAmount: deficit,
        sourceAccount: '60, 62',
        recipient: 'CEO',
      })
    }
  }

  return results
}
