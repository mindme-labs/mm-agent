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
        { label: 'Классификация (черновик)', value: 'classifying' },
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
    // v3.3.1 — business model classification. Populated by AI classifier
    // (or set to safe default 'trading' when classification is disabled).
    // See docs/cursor-dev-spec.md iter-17..19.
    {
      type: 'collapsible',
      label: 'Классификация бизнес-модели',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'businessModel',
          type: 'select',
          label: 'Бизнес-модель',
          defaultValue: 'trading',
          options: [
            { label: 'Проектная', value: 'project' },
            { label: 'Торговая', value: 'trading' },
            { label: 'Производственная', value: 'production' },
            { label: 'Подписочная', value: 'subscription' },
            { label: 'Консалтинг', value: 'consulting' },
            { label: 'Агентская', value: 'agency' },
            { label: 'Проект + Торговля', value: 'project_trading' },
            { label: 'Производство + Проект', value: 'production_project' },
            { label: 'Консалтинг + Подписка', value: 'consulting_subscription' },
            { label: 'Торговля + Агент', value: 'trading_agency' },
            { label: 'Подписка + Консалтинг', value: 'subscription_consulting' },
            { label: 'Производство + Торговля', value: 'production_trading' },
            { label: 'Частная клиника', value: 'clinic' },
          ],
        },
        {
          name: 'businessModelConfidence',
          type: 'number',
          label: 'Уверенность AI (0–1)',
          min: 0,
          max: 1,
        },
        {
          name: 'businessModelRationale',
          type: 'textarea',
          label: 'Обоснование AI',
        },
        {
          name: 'businessModelIndicators',
          type: 'json',
          label: 'Индикаторы',
          admin: {
            description: 'inventory_balance_41, wip_balance_20, finished_goods_43, revenue_regularity_score, fot_share_in_cogs, agency_transit_share, account_26_destination, _missing[]',
          },
        },
        {
          name: 'businessModelUserOverridden',
          type: 'checkbox',
          label: 'Переопределено пользователем',
          defaultValue: false,
        },
        {
          name: 'businessModelOriginalAi',
          type: 'text',
          label: 'Изначальная модель AI (до override)',
        },
        {
          name: 'classificationStatus',
          type: 'select',
          label: 'Статус классификации',
          defaultValue: 'disabled',
          options: [
            { label: 'Успешно', value: 'success' },
            { label: 'Degraded (неполные данные)', value: 'degraded' },
            { label: 'Refused (ручной выбор)', value: 'refused_manual' },
            { label: 'Disabled (классификация выключена)', value: 'disabled' },
          ],
        },
        {
          name: 'requestedAdditionalAccounts',
          type: 'json',
          label: 'Запрошенные счета для уточнения',
          defaultValue: [],
          admin: {
            description: 'Массив строк (кодов счетов), которые AI попросил дозагрузить для повышения точности.',
          },
        },
        {
          name: 'classificationAttempts',
          type: 'number',
          label: 'Попыток классификации',
          defaultValue: 0,
          min: 0,
        },
        {
          name: 'dataQualityWarning',
          type: 'textarea',
          label: 'Предупреждение о качестве данных',
          admin: {
            description: 'Заполняется AI, когда сигналы выглядят как гибрид, но не складываются в логичную бизнес-историю (артефакт мусора).',
          },
        },
      ],
    },
  ],
}
