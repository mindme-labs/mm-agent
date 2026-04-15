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
  ],
}
