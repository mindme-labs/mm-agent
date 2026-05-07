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
    // v3.3.1 — wizard state machine. Tracks the user's position in the
    // adaptive onboarding flow. See docs/cursor-dev-spec.md iter-17/21.
    {
      name: 'wizardState',
      type: 'select',
      label: 'Состояние wizard',
      required: true,
      defaultValue: 'idle',
      options: [
        { label: 'Idle (не начат)', value: 'idle' },
        { label: 'Загрузка файлов', value: 'uploading' },
        { label: 'AI: распознавание', value: 'recognizing' },
        { label: 'AI: извлечение данных', value: 'extracting' },
        { label: 'AI: классификация', value: 'classifying' },
        { label: 'Ожидание подтверждения модели', value: 'awaiting_confirmation' },
        { label: 'Ожидание дозагрузки файлов', value: 'awaiting_additional_files' },
        { label: 'Отказ от классификации', value: 'classification_refused' },
        { label: 'Расчёт правил', value: 'analyzing' },
        { label: 'AI: обогащение текстов', value: 'enhancing' },
        { label: 'Завершён', value: 'completed' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'currentClassificationAttempts',
      type: 'number',
      label: 'Попыток классификации',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Сколько раз AI-классификация запускалась в текущем онбординге. Сбрасывается при старте нового онбординга.',
      },
    },
  ],
}
