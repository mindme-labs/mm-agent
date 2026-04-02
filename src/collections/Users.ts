import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { id: { equals: user.id } }
    },
    create: ({ req: { user } }) => {
      if (!user) return true // allow creation during OAuth
      return user.role === 'admin'
    },
    delete: ({ req: { user } }) => {
      return user?.role === 'admin'
    },
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (
          (operation === 'create' || operation === 'update') &&
          (data?.mode === 'preprod' || data?.mode === 'production')
        ) {
          if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error(
              'Для пре-прод режима необходимо настроить ANTHROPIC_API_KEY',
            )
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Имя',
    },
    {
      name: 'role',
      type: 'select',
      label: 'Роль',
      required: true,
      defaultValue: 'ceo',
      options: [
        { label: 'Администратор', value: 'admin' },
        { label: 'CEO', value: 'ceo' },
      ],
    },
    {
      name: 'mode',
      type: 'select',
      label: 'Режим',
      required: true,
      defaultValue: 'demo',
      options: [
        { label: 'Демо', value: 'demo' },
        { label: 'Пре-прод', value: 'preprod' },
        { label: 'Продакшн', value: 'production' },
      ],
    },
    {
      name: 'hasCompletedOnboarding',
      type: 'checkbox',
      label: 'Прошёл онбординг',
      defaultValue: false,
    },
    {
      name: 'companyName',
      type: 'text',
      label: 'Название компании',
    },
    {
      name: 'inn',
      type: 'text',
      label: 'ИНН',
    },
    {
      name: 'companyType',
      type: 'select',
      label: 'Тип компании',
      options: [
        { label: 'ИП', value: 'ip' },
        { label: 'ООО', value: 'ooo' },
      ],
    },
  ],
}
