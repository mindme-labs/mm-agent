import type { CollectionConfig } from 'payload'

const ownerOrAdmin = ({ req: { user } }: { req: { user: any } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { owner: { equals: user.id } }
}

export const UploadedFiles: CollectionConfig = {
  slug: 'uploaded-files',
  labels: { singular: 'Файл', plural: 'Загруженные файлы' },
  admin: {
    useAsTitle: 'originalName',
  },
  access: {
    read: ownerOrAdmin,
    update: ownerOrAdmin,
    create: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  upload: {
    mimeTypes: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'originalName',
      type: 'text',
      label: 'Имя файла',
    },
    {
      name: 'detectedType',
      type: 'text',
      label: 'Тип документа',
    },
    {
      name: 'accountCode',
      type: 'text',
      label: 'Номер счёта',
    },
    {
      name: 'period',
      type: 'text',
      label: 'Период',
    },
    {
      name: 'parseStatus',
      type: 'select',
      label: 'Статус парсинга',
      defaultValue: 'pending',
      options: [
        { label: 'Ожидание', value: 'pending' },
        { label: 'Распознавание', value: 'recognizing' },
        { label: 'Парсинг', value: 'parsing' },
        { label: 'Успешно', value: 'success' },
        { label: 'Предупреждение', value: 'warning' },
        { label: 'Ошибка', value: 'error' },
      ],
    },
    {
      name: 'parseErrors',
      type: 'json',
      label: 'Ошибки парсинга',
    },
    {
      name: 'parsedData',
      type: 'json',
      label: 'Результат парсинга',
    },
    {
      name: 'aiRecognitionLog',
      type: 'json',
      label: 'Лог AI-распознавания',
    },
  ],
}
