import type { CollectionConfig } from 'payload'

const ownerOrAdmin = ({ req: { user } }: { req: { user: any } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { owner: { equals: user.id } }
}

export const AnalysisResults: CollectionConfig = {
  slug: 'analysis-results',
  labels: { singular: 'Результат анализа', plural: 'Результаты анализа' },
  admin: {
    useAsTitle: 'period',
  },
  access: {
    read: ownerOrAdmin,
    update: ownerOrAdmin,
    create: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'period',
      type: 'text',
      label: 'Период',
      required: true,
    },
    {
      name: 'revenue',
      type: 'number',
      label: 'Выручка',
    },
    {
      name: 'cogs',
      type: 'number',
      label: 'Себестоимость',
    },
    {
      name: 'grossProfit',
      type: 'number',
      label: 'Валовая прибыль',
    },
    {
      name: 'grossMargin',
      type: 'number',
      label: 'Валовая рентабельность, %',
    },
    {
      name: 'accountsReceivable',
      type: 'number',
      label: 'ДЗ на конец периода',
    },
    {
      name: 'accountsPayable',
      type: 'number',
      label: 'КЗ на конец периода',
    },
    {
      name: 'inventory',
      type: 'number',
      label: 'Запасы (сч. 41 + сч. 10)',
    },
    {
      name: 'shippedGoods',
      type: 'number',
      label: 'Товары отгруженные (сч. 45)',
    },
    {
      name: 'arTurnoverDays',
      type: 'number',
      label: 'Оборачиваемость ДЗ, дни',
    },
    {
      name: 'apTurnoverDays',
      type: 'number',
      label: 'Оборачиваемость КЗ, дни',
    },
    {
      name: 'inventoryTurnoverDays',
      type: 'number',
      label: 'Оборачиваемость запасов, дни',
    },
    {
      name: 'healthIndex',
      type: 'select',
      label: 'Индикатор здоровья',
      options: [
        { label: '🟢 В норме', value: 'fine' },
        { label: '🟡 Есть вопросы', value: 'issues' },
        { label: '🔴 Риск', value: 'risky' },
      ],
    },
    {
      name: 'topDebtors',
      type: 'json',
      label: 'Топ-5 дебиторов',
    },
    {
      name: 'topCreditors',
      type: 'json',
      label: 'Топ-5 кредиторов',
    },
    {
      name: 'aiAuditSummary',
      type: 'textarea',
      label: 'Резюме AI-аудита',
    },
    {
      name: 'analysisPhase',
      type: 'select',
      label: 'Фаза анализа',
      defaultValue: 'rules_done',
      options: [
        { label: 'Правила выполнены', value: 'rules_done' },
        { label: 'AI-аудит запущен', value: 'ai_pending' },
        { label: 'AI-аудит завершён', value: 'ai_complete' },
        { label: 'AI-аудит: ошибка', value: 'ai_error' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'isDemo',
      type: 'checkbox',
      label: 'Демо-данные',
      defaultValue: false,
    },
  ],
}
