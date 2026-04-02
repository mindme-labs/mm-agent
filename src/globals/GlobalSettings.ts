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
      name: 'allowedEmails',
      type: 'array',
      label: 'Разрешённые email',
      fields: [
        {
          name: 'email',
          type: 'email',
          required: true,
        },
      ],
    },
    {
      name: 'defaultMode',
      type: 'select',
      label: 'Режим по умолчанию',
      defaultValue: 'demo',
      options: [
        { label: 'Демо', value: 'demo' },
        { label: 'Пре-прод', value: 'preprod' },
      ],
    },
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
      defaultValue: 'claude-sonnet-4-20250514',
    },
  ],
}
