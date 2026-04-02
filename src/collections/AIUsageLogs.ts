import type { CollectionConfig } from 'payload'

export const AIUsageLogs: CollectionConfig = {
  slug: 'ai-usage-logs',
  labels: { singular: 'AI-лог', plural: 'Логи AI-запросов' },
  admin: {
    defaultColumns: ['promptKey', 'model', 'inputTokens', 'outputTokens', 'cost', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'admin',
    create: () => true,
    update: () => false,
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'promptKey',
      type: 'text',
      label: 'Ключ промпта',
      required: true,
    },
    {
      name: 'inputTokens',
      type: 'number',
      label: 'Входные токены',
    },
    {
      name: 'outputTokens',
      type: 'number',
      label: 'Выходные токены',
    },
    {
      name: 'model',
      type: 'text',
      label: 'Модель',
    },
    {
      name: 'cost',
      type: 'number',
      label: 'Стоимость, $',
    },
    {
      name: 'durationMs',
      type: 'number',
      label: 'Время, мс',
    },
  ],
}
