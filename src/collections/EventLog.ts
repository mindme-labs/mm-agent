import type { CollectionConfig } from 'payload'

export const EventLog: CollectionConfig = {
  slug: 'event-log',
  labels: { singular: 'Событие', plural: 'Журнал событий' },
  admin: {
    defaultColumns: ['eventType', 'owner', 'entityType', 'createdAt'],
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
      hasMany: false,
    },
    {
      name: 'eventType',
      type: 'text',
      label: 'Тип события',
      required: true,
    },
    {
      name: 'entityType',
      type: 'text',
      label: 'Тип сущности',
    },
    {
      name: 'entityId',
      type: 'text',
      label: 'ID сущности',
    },
    {
      name: 'payload',
      type: 'json',
      label: 'Данные',
    },
  ],
}
