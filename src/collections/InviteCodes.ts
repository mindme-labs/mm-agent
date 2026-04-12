import type { CollectionConfig } from 'payload'

export const InviteCodes: CollectionConfig = {
  slug: 'invite-codes',
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'createdBy', 'isUsed', 'channel', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'admin',
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create' && !data?.code) {
          const alphabet = 'abcdefghkmnpqrstuvwxyz23456789'
          let code = ''
          for (let i = 0; i < 8; i++) {
            code += alphabet[Math.floor(Math.random() * alphabet.length)]
          }
          data!.code = code.toUpperCase()
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      label: 'Код',
      admin: { readOnly: true },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Создан кем',
    },
    {
      name: 'usedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Использован кем',
    },
    {
      name: 'isUsed',
      type: 'checkbox',
      label: 'Использован',
      defaultValue: false,
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: 'Действителен до',
    },
    {
      name: 'channel',
      type: 'select',
      label: 'Канал',
      options: [
        { label: 'Telegram', value: 'telegram' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Email', value: 'email' },
        { label: 'LinkedIn', value: 'linkedin' },
        { label: 'Другое', value: 'other' },
      ],
    },
    {
      name: 'note',
      type: 'textarea',
      label: 'Заметка',
    },
  ],
}
