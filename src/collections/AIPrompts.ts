import type { CollectionConfig } from 'payload'

export const AIPrompts: CollectionConfig = {
  slug: 'ai-prompts',
  labels: { singular: 'AI-промпт', plural: 'AI-промпты' },
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'admin',
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'promptKey',
      type: 'text',
      label: 'Ключ',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'text',
      label: 'Название',
      required: true,
    },
    {
      name: 'systemPrompt',
      type: 'textarea',
      label: 'Системный промпт',
      required: true,
    },
    {
      name: 'userPromptTemplate',
      type: 'textarea',
      label: 'Шаблон пользовательского промпта',
    },
    {
      name: 'version',
      type: 'number',
      label: 'Версия',
      defaultValue: 1,
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Активен',
      defaultValue: true,
    },
  ],
}
