import type { CollectionConfig } from 'payload'

export const AccessRequests: CollectionConfig = {
  slug: 'access-requests',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'inviteCode', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'admin',
    create: () => true,
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      label: 'Email',
    },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Ожидает', value: 'pending' },
        { label: 'Одобрен', value: 'approved' },
        { label: 'Отклонён', value: 'rejected' },
      ],
    },
    {
      name: 'inviteCode',
      type: 'text',
      label: 'Инвайт-код (при одобрении)',
    },
    {
      name: 'approvedAt',
      type: 'date',
      label: 'Дата одобрения',
    },
  ],
}
