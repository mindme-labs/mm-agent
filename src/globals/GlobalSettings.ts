import type { GlobalConfig } from 'payload'

export const GlobalSettings: GlobalConfig = {
  slug: 'global-settings',
  label: 'Настройки',
  access: {
    read: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'aiEnabled',
      type: 'checkbox',
      label: 'AI включён',
      defaultValue: true,
    },
    {
      name: 'aiProvider',
      type: 'select',
      label: 'Провайдер AI',
      defaultValue: 'anthropic',
      options: [
        { label: 'Anthropic', value: 'anthropic' },
        { label: 'OpenAI', value: 'openai' },
      ],
    },
    {
      name: 'aiModel',
      type: 'text',
      label: 'Модель AI',
      defaultValue: 'claude-sonnet-4-6',
    },
    {
      name: 'trialDays',
      type: 'number',
      label: 'Дней триала',
      defaultValue: 7,
    },
    {
      name: 'aiRulesEnabled',
      type: 'checkbox',
      label: 'AI-анализ правил включён',
      defaultValue: false,
      admin: {
        description: 'Если выключено — все правила используют статические шаблоны',
      },
    },
    {
      name: 'aiRulesEnabledFor',
      type: 'select',
      label: 'Правила с AI-анализом',
      hasMany: true,
      defaultValue: ['ДЗ-1'],
      options: [
        { label: 'ДЗ-1 — Просроченная дебиторка', value: 'ДЗ-1' },
        { label: 'ДЗ-2 — Концентрация дебиторов', value: 'ДЗ-2' },
        { label: 'ДЗ-3 — Отток клиентов', value: 'ДЗ-3' },
        { label: 'КЗ-1 — Незакрытые авансы', value: 'КЗ-1' },
        { label: 'ЗАП-1 — Неликвид', value: 'ЗАП-1' },
        { label: 'ЗАП-2 — Затоваривание', value: 'ЗАП-2' },
        { label: 'ПЛ-1 — Снижение маржи', value: 'ПЛ-1' },
        { label: 'ФЦ-1 — Платёжный цикл', value: 'ФЦ-1' },
        { label: 'СВС-1 — Качество данных', value: 'СВС-1' },
      ],
      admin: {
        description: 'Выберите, какие правила обогащать AI. Остальные используют шаблоны.',
      },
    },
    {
      name: 'aiRulesBatchSize',
      type: 'number',
      label: 'Размер батча AI-обогащения',
      defaultValue: 3,
      min: 1,
      max: 10,
      admin: {
        description: 'Сколько кандидатов обрабатывается за один вызов /ai-enhance-batch (Vercel Hobby: 2-3, Pro: 5-8)',
      },
    },
    {
      name: 'aiFileExtractionEnabled',
      type: 'checkbox',
      label: 'AI-распознавание файлов включено',
      defaultValue: false,
      admin: {
        description: 'Если выключено — нестандартные форматы CSV отбрасываются с предупреждением, как раньше',
      },
    },
    {
      name: 'aiFileExtractionMaxKB',
      type: 'number',
      label: 'Лимит размера файла для AI-извлечения, КБ',
      defaultValue: 100,
      min: 10,
      max: 500,
      admin: {
        description: 'Файлы больше лимита будут обрезаны перед отправкой в AI (Phase 2)',
      },
    },
    {
      name: 'aiFileBatchSize',
      type: 'number',
      label: 'Размер батча AI-распознавания файлов',
      defaultValue: 2,
      min: 1,
      max: 5,
      admin: {
        description: 'Файлов на один вызов /api/files/ai-recognize-batch (Vercel Hobby: 2, Pro: 3-5)',
      },
    },
    // v3.3.1 — business model classification flags.
    // When aiClassificationEnabled=false, the system behaves exactly as v3.2:
    // all 9 rules apply and businessModel defaults to 'trading'.
    {
      name: 'aiClassificationEnabled',
      type: 'checkbox',
      label: 'AI-классификация бизнеса включена',
      defaultValue: true,
      admin: {
        description: 'Если выключено — все юзеры классифицируются как «Торговая» и применяются все 9 правил (поведение v3.2)',
      },
    },
    {
      name: 'classificationConfidenceThreshold',
      type: 'number',
      label: 'Порог уверенности классификации',
      defaultValue: 0.7,
      min: 0,
      max: 1,
      admin: {
        description: 'Ниже этого порога юзер обязательно подтверждает модель вручную',
      },
    },
    {
      name: 'classificationAutoConfirmThreshold',
      type: 'number',
      label: 'Порог auto-confirm',
      defaultValue: 0.85,
      min: 0,
      max: 1,
      admin: {
        description: 'При confidence ≥ этого порога экран подтверждения автоматически закрывается через 3 сек',
      },
    },
    {
      name: 'classificationAutoConfirmEnabled',
      type: 'checkbox',
      label: 'Auto-confirm включён',
      defaultValue: false,
      admin: {
        description: 'Если включено — при высокой уверенности юзер пропускает экран подтверждения автоматически',
      },
    },
    {
      name: 'maxClassificationAttempts',
      type: 'number',
      label: 'Максимум попыток классификации',
      defaultValue: 3,
      min: 1,
      max: 10,
      admin: {
        description: 'После этого числа попыток — только продолжение в degraded-режиме (без новой развилки)',
      },
    },
    {
      name: 'supportContact',
      type: 'text',
      label: 'Контакт поддержки',
      defaultValue: '',
      admin: {
        description: 'Email или ссылка для связи при отказе классификации (например: support@mmlabs.ru)',
      },
    },
    {
      name: 'requiredAccountCodes',
      type: 'array',
      label: 'Обязательные счета',
      defaultValue: [
        { code: '90.01' },
        { code: '90.02' },
        { code: '60' },
        { code: '62' },
        { code: '10' },
        { code: '41' },
        { code: '45' },
      ],
      fields: [{ name: 'code', type: 'text', required: true }],
      admin: {
        description: 'Минимальный набор счетов, без которых онбординг не начнётся',
      },
    },
    {
      name: 'recommendedAccountCodes',
      type: 'array',
      label: 'Рекомендуемые счета',
      defaultValue: [{ code: '26' }, { code: '20' }, { code: '43' }, { code: '76' }],
      fields: [{ name: 'code', type: 'text', required: true }],
      admin: {
        description: 'Повышают точность классификации, но не блокируют процесс',
      },
    },
    {
      name: 'optionalAccountCodes',
      type: 'array',
      label: 'Опциональные счета',
      defaultValue: [{ code: '51' }],
      fields: [{ name: 'code', type: 'text', required: true }],
      admin: {
        description: 'Для будущего анализа ликвидности и т.п.',
      },
    },
  ],
}
