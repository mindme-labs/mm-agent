/**
 * Per-rule AI analysis prompts.
 *
 * Each prompt is keyed `rule_<lowercase rule code>` and seeded into the
 * `ai-prompts` collection via `/api/ai/seed-prompts`.
 *
 * The system prompt instructs Claude to return a strict JSON object that
 * `analyzeCandidates()` will parse and merge into the recommendation record.
 */

const COMMON_OUTPUT_SCHEMA = `Ответь СТРОГО в JSON без пояснений:
{
  "priority": "critical" | "high" | "medium" | "low",
  "title": "короткий заголовок с именем контрагента и сутью",
  "description": "2-4 предложения, объясняющих проблему руководителю простым языком",
  "shortRecommendation": "1-2 предложения — что сделать на этой неделе",
  "fullText": "готовое к отправке письмо/претензия/служебка с реальными суммами и именами"
}

Используй конкретные числа из signals. Без бухгалтерского жаргона. Без канцеляризмов.`

export const RULE_PROMPTS = [
  {
    promptKey: 'rule_dz1',
    name: 'AI-анализ ДЗ-1 (просроченная дебиторка)',
    systemPrompt: `Ты — старший финансовый советник CEO малого оптового бизнеса в России. Пиши на русском.

Тебе дан кандидат на рекомендацию по правилу "ДЗ-1: Просроченная дебиторская задолженность".
Конкретный контрагент имеет задолженность, которую нужно проработать.

Контекст:
- ДЗ — это деньги, которые должны клиенты компании.
- Чем дольше просрочка, тем выше риск невозврата.
- Тон: деловой, конкретный, без давления, но с чёткой позицией.
- При просрочке ≥ 2 мес. и сумме > 500 тыс. ₽ — это уровень для досудебной претензии (адресат "Юрист").
- При просрочке 1 мес. или малых суммах — мягкое письмо о сверке (адресат "Бухгалтер").
- Пеня по ГК РФ обычно считается как 0.1% в день.

${COMMON_OUTPUT_SCHEMA}`,
    userPromptTemplate: `Сигналы по контрагенту "{counterparty}":
- Сумма задолженности: {balance} руб.
- Месяцев без оплат подряд: {consecutiveNoPayment}
- Платежи за последние 2 месяца: {recentPayments} руб. ({paymentRatio}% от долга)
- Расчётная пеня: {penaltyAmount} руб.
- Рекомендуемый адресат: {recipient}
- Подсказка по приоритету: {priorityHint}

Контекст компании:
- Выручка: {revenue} руб.
- Валовая маржа: {grossMargin}%
- Итоговая ДЗ: {accountsReceivable} руб. (оборачиваемость {arDays} дн.)
- Итоговая КЗ: {accountsPayable} руб. (оборачиваемость {apDays} дн.)`,
    version: 1,
    isActive: true,
  },
] as const

export type RulePromptKey = (typeof RULE_PROMPTS)[number]['promptKey']

export function promptKeyForRule(ruleCode: string): string {
  const slug = ruleCode
    .toLowerCase()
    .replace(/[^a-z0-9а-я]/g, '')
    .replace(/дз/g, 'dz')
    .replace(/кз/g, 'kz')
    .replace(/зап/g, 'zap')
    .replace(/пл/g, 'pl')
    .replace(/фц/g, 'fc')
    .replace(/свс/g, 'svs')
  return `rule_${slug}`
}
