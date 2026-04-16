import type { CollectionConfig } from 'payload'

export const EventLog: CollectionConfig = {
  slug: 'event-log',
  labels: { singular: 'Событие', plural: 'Журнал событий' },
  admin: {
    defaultColumns: ['eventType', 'owner', 'entityType', 'entityId', 'createdAt'],
    listSearchableFields: ['eventType', 'entityType', 'entityId'],
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
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'eventType',
      type: 'select',
      label: 'Тип события',
      required: true,
      options: [
        { label: 'Вход', value: 'auth.login' },
        { label: 'Выход', value: 'auth.logout' },
        { label: 'Запрос доступа', value: 'access.request' },
        { label: 'Инвайт использован', value: 'invite.used' },
        { label: 'Онбординг: старт анализа', value: 'onboarding.analysis_start' },
        { label: 'Онбординг: анализ завершён', value: 'onboarding.analysis_complete' },
        { label: 'Онбординг: завершён', value: 'onboarding.complete' },
        { label: 'Онбординг: загрузка файла', value: 'onboarding.file_upload' },
        { label: 'Рекомендация: статус', value: 'recommendation.status_changed' },
        { label: 'Рекомендация: отзыв', value: 'recommendation.feedback' },
        { label: 'Рекомендация: текст скопирован', value: 'recommendation.text_copied' },
        { label: 'Рекомендация: просмотр', value: 'recommendation.viewed' },
        { label: 'AI: запрос', value: 'ai.request' },
        { label: 'AI: ответ', value: 'ai.response' },
        { label: 'AI: ошибка', value: 'ai.error' },
        { label: 'AI: фоллбэк', value: 'ai.fallback' },
        { label: 'Просмотр страницы', value: 'page.view' },
      ],
      admin: {
        position: 'sidebar',
      },
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
