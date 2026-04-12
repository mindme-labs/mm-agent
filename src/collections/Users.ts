import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30, // 30 days
  },
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
    create: () => true,
    delete: ({ req: { user } }) => {
      return user?.role === 'admin'
    },
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
      defaultValue: 'trial',
      options: [
        { label: 'Триал', value: 'trial' },
        { label: 'Полный', value: 'full' },
        { label: 'Истёк', value: 'expired' },
      ],
    },
    {
      name: 'hasCompletedOnboarding',
      type: 'checkbox',
      label: 'Прошёл онбординг',
      defaultValue: false,
    },
    {
      name: 'trialExpiresAt',
      type: 'date',
      label: 'Триал истекает',
    },
    {
      name: 'analysisStatus',
      type: 'select',
      label: 'Статус анализа',
      options: [
        { label: 'Нет', value: 'none' },
        { label: 'В процессе', value: 'processing' },
        { label: 'Готов', value: 'complete' },
        { label: 'Ошибка', value: 'error' },
      ],
      defaultValue: 'none',
    },
    {
      name: 'inviteCode',
      type: 'text',
      label: 'Инвайт-код',
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
