import type { CollectionConfig } from 'payload'

const ownerOrAdmin = ({ req: { user } }: { req: { user: any } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { owner: { equals: user.id } }
}

export const Recommendations: CollectionConfig = {
  slug: 'recommendations',
  labels: { singular: 'Рекомендация', plural: 'Рекомендации' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'ruleCode', 'priority', 'status', 'owner'],
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
      name: 'ruleCode',
      type: 'text',
      label: 'Код правила',
      required: true,
    },
    {
      name: 'ruleName',
      type: 'text',
      label: 'Название правила',
      required: true,
    },
    {
      name: 'priority',
      type: 'select',
      label: 'Приоритет',
      required: true,
      options: [
        { label: 'Критичный', value: 'critical' },
        { label: 'Высокий', value: 'high' },
        { label: 'Средний', value: 'medium' },
        { label: 'Низкий', value: 'low' },
      ],
    },
    {
      name: 'title',
      type: 'text',
      label: 'Заголовок',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Описание проблемы',
      required: true,
    },
    {
      name: 'shortRecommendation',
      type: 'textarea',
      label: 'Краткая рекомендация',
    },
    {
      name: 'fullText',
      type: 'textarea',
      label: 'Полный текст для отправки',
    },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'Новая', value: 'new' },
        { label: 'В работе', value: 'in_progress' },
        { label: 'Решена', value: 'resolved' },
        { label: 'Зависла', value: 'stuck' },
        { label: 'Отклонена', value: 'dismissed' },
      ],
    },
    {
      name: 'impactMetric',
      type: 'select',
      label: 'Метрика влияния',
      options: [
        { label: 'Дебиторская задолженность', value: 'accounts_receivable' },
        { label: 'Кредиторская задолженность', value: 'accounts_payable' },
        { label: 'Запасы', value: 'inventory' },
        { label: 'Выручка', value: 'revenue' },
        { label: 'Стратегическое', value: 'strategic' },
      ],
    },
    {
      name: 'impactDirection',
      type: 'select',
      label: 'Направление',
      options: [
        { label: 'Снижение', value: 'decrease' },
        { label: 'Увеличение', value: 'increase' },
      ],
    },
    {
      name: 'impactAmount',
      type: 'number',
      label: 'Сумма влияния, ₽',
    },
    {
      name: 'sourceAccount',
      type: 'text',
      label: 'Счёт-источник',
    },
    {
      name: 'counterparty',
      type: 'text',
      label: 'Контрагент',
    },
    {
      name: 'recipient',
      type: 'text',
      label: 'Адресат',
      required: true,
    },
    {
      name: 'isDemo',
      type: 'checkbox',
      label: 'Демо-данные',
      defaultValue: false,
    },
    {
      name: 'isAiGenerated',
      type: 'checkbox',
      label: 'Сгенерировано AI',
      defaultValue: false,
    },
    {
      name: 'aiEnhanced',
      type: 'checkbox',
      label: 'Улучшено AI',
      defaultValue: false,
    },
    {
      name: 'takenAt',
      type: 'date',
      label: 'Взята в работу',
      admin: { position: 'sidebar' },
    },
    {
      name: 'dueDate',
      type: 'date',
      label: 'Срок',
      admin: { position: 'sidebar' },
    },
    {
      name: 'resolvedAt',
      type: 'date',
      label: 'Дата решения',
      admin: { position: 'sidebar' },
    },
  ],
}
