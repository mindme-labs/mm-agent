import type { CollectionConfig } from 'payload'

const ownerOrAdmin = ({ req: { user } }: { req: { user: any } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { owner: { equals: user.id } }
}

export const RecommendationFeedback: CollectionConfig = {
  slug: 'recommendation-feedback',
  labels: { singular: 'Отзыв', plural: 'Обратная связь' },
  access: {
    read: ownerOrAdmin,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => user?.role === 'admin',
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
      name: 'recommendation',
      type: 'relationship',
      relationTo: 'recommendations',
      required: true,
      hasMany: false,
    },
    {
      name: 'rating',
      type: 'select',
      label: 'Оценка',
      required: true,
      options: [
        { label: '👍 Полезно', value: 'positive' },
        { label: '👎 Не полезно', value: 'negative' },
      ],
    },
    {
      name: 'comment',
      type: 'textarea',
      label: 'Комментарий',
      maxLength: 500,
    },
  ],
}
