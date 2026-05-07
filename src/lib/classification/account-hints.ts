/**
 * User-facing hints for individual accounting accounts.
 *
 * Used by `ClassificationFork` and `ClassificationResume` to explain WHY
 * the AI is asking for a specific account. Plain language, written for a
 * CEO without an accountant background.
 */

export interface AccountHint {
  code: string
  /** Short human title — used in the file picker row. */
  title: string
  /** One-sentence explanation of what this account reveals. */
  description: string
}

const HINTS: Record<string, AccountHint> = {
  '20': {
    code: '20',
    title: 'Основное производство',
    description: 'Покажет, есть ли у вас собственное производство и НЗП.',
  },
  '26': {
    code: '26',
    title: 'Общехозяйственные расходы',
    description: 'Покажет распределение управленческих расходов и закроет вопрос о производственной vs проектной модели.',
  },
  '43': {
    code: '43',
    title: 'Готовая продукция',
    description: 'Покажет, есть ли у вас своё производство (остаток на 43 — признак производственной модели).',
  },
  '44': {
    code: '44',
    title: 'Расходы на продажу',
    description: 'Помогает разделить торговые и проектные расходы.',
  },
  '51': {
    code: '51',
    title: 'Расчётный счёт',
    description: 'Для будущего анализа ликвидности и кассовых разрывов.',
  },
  '76': {
    code: '76',
    title: 'Расчёты с прочими дебиторами и кредиторами',
    description: 'Поможет отличить агентскую схему (транзит через 76) от обычной торговли.',
  },
  '70': {
    code: '70',
    title: 'Расчёты с персоналом по оплате труда',
    description: 'Покажет долю ФОТ — ключевой индикатор для консалтинга и SaaS.',
  },
  '90.03': {
    code: '90.03',
    title: 'НДС от продаж',
    description: 'Помогает уточнить структуру выручки.',
  },
}

const FALLBACK = (code: string): AccountHint => ({
  code,
  title: `Счёт ${code}`,
  description: 'Поможет уточнить классификацию бизнес-модели.',
})

export function getAccountHint(code: string): AccountHint {
  return HINTS[code] ?? FALLBACK(code)
}

export function getAccountHints(codes: string[]): AccountHint[] {
  return codes.map(getAccountHint)
}
