import type { ParsedAccountData, GeneratedRecommendation } from '@/types'

const IMPORTANT_ACCOUNTS = [
  { code: '62', name: 'Расчёты с покупателями (ДЗ)' },
  { code: '60', name: 'Расчёты с поставщиками (КЗ)' },
  { code: '90.01', name: 'Выручка' },
  { code: '90.02', name: 'Себестоимость продаж' },
  { code: '41', name: 'Товары' },
]

export function runSVS1(data: ParsedAccountData[]): GeneratedRecommendation[] {
  const loadedCodes = new Set(data.map(d => d.accountCode))
  const results: GeneratedRecommendation[] = []

  for (const acc of IMPORTANT_ACCOUNTS) {
    if (!loadedCodes.has(acc.code)) {
      results.push({
        ruleCode: 'СВС-1',
        ruleName: 'Качество учётных данных',
        priority: 'low',
        title: `Не загружена ОСВ по счёту ${acc.code}`,
        description: `Для полноценного анализа загрузите ОСВ по счёту ${acc.code} (${acc.name}).`,
        shortRecommendation: `Загрузите ОСВ по счёту ${acc.code} для более точного анализа.`,
        fullText: `Для полноценного анализа оборотных средств необходима ОСВ по счёту ${acc.code} — ${acc.name}. Без этих данных часть рекомендаций не может быть сформирована.`,
        impactMetric: 'strategic',
        impactDirection: 'decrease',
        impactAmount: 0,
        sourceAccount: acc.code,
        recipient: 'Бухгалтер',
      })
    }
  }

  return results
}
