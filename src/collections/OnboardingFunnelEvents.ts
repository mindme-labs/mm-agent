import type { CollectionConfig } from 'payload'

/**
 * Aggregated per-user-onboarding funnel record. One row per onboarding
 * attempt; updated in place as the user progresses through the wizard.
 *
 * Schema source: docs/mmlabs-landing-analytics-spec.md §3.2.
 *
 * Access:
 *   - read   : admin only
 *   - create : server-side only (via `updateFunnelEvent` helper)
 *   - update : server-side only
 *   - delete : forbidden — this is an analytical archive, not editable
 *
 * Indexes (see fields below): owner+attemptNumber, outcome+updatedAt,
 * startedAt — used by `/api/admin/funnel/*` (iter-23) and the abandoned
 * sweep cron.
 */
export const OnboardingFunnelEvents: CollectionConfig = {
  slug: 'onboarding-funnel-events',
  labels: {
    singular: 'Запись воронки онбординга',
    plural: 'Воронка онбординга',
  },
  admin: {
    useAsTitle: 'attemptNumber',
    defaultColumns: ['owner', 'attemptNumber', 'outcome', 'updatedAt'],
    listSearchableFields: ['outcome'],
    description: 'Аналитический архив. Записи нельзя удалять (даже admin).',
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'admin',
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'attemptNumber',
      type: 'number',
      defaultValue: 1,
      required: true,
      min: 1,
      admin: { position: 'sidebar' },
    },
    // ─── Step flags ─────────────────────────────────────────────────────────
    { name: 'reachedStart', type: 'checkbox', defaultValue: false },
    { name: 'reachedUpload', type: 'checkbox', defaultValue: false },
    { name: 'reachedMinimumSet', type: 'checkbox', defaultValue: false },
    { name: 'reachedRecommendedSet', type: 'checkbox', defaultValue: false },
    { name: 'reachedRecognition', type: 'checkbox', defaultValue: false },
    { name: 'reachedExtraction', type: 'checkbox', defaultValue: false },
    { name: 'reachedClassification', type: 'checkbox', defaultValue: false },
    { name: 'reachedConfirmation', type: 'checkbox', defaultValue: false },
    { name: 'reachedAnalysis', type: 'checkbox', defaultValue: false },
    // ─── Timestamps ─────────────────────────────────────────────────────────
    { name: 'startedAt', type: 'date' },
    { name: 'uploadStartedAt', type: 'date' },
    { name: 'minimumSetCompletedAt', type: 'date' },
    { name: 'recommendedSetCompletedAt', type: 'date' },
    { name: 'classificationStartedAt', type: 'date' },
    { name: 'classificationCompletedAt', type: 'date' },
    { name: 'confirmationCompletedAt', type: 'date' },
    { name: 'analysisCompletedAt', type: 'date' },
    { name: 'abandonedAt', type: 'date' },
    // ─── Durations (ms, computed at finalization) ──────────────────────────
    { name: 'durationToUpload', type: 'number' },
    { name: 'durationUpload', type: 'number' },
    { name: 'durationRecognition', type: 'number' },
    { name: 'durationExtraction', type: 'number' },
    { name: 'durationClassification', type: 'number' },
    { name: 'durationConfirmation', type: 'number' },
    { name: 'durationAnalysis', type: 'number' },
    { name: 'durationTotal', type: 'number' },
    // ─── Files & accounts ───────────────────────────────────────────────────
    { name: 'filesUploaded', type: 'number', defaultValue: 0, min: 0 },
    {
      name: 'uploadedAccounts',
      type: 'json',
      defaultValue: [],
      admin: { description: 'Массив строк (кодов счетов).' },
    },
    {
      name: 'missingRequiredAccounts',
      type: 'json',
      defaultValue: [],
    },
    {
      name: 'missingRecommendedAccounts',
      type: 'json',
      defaultValue: [],
    },
    // ─── Classification ─────────────────────────────────────────────────────
    { name: 'classificationAttempts', type: 'number', defaultValue: 0, min: 0 },
    {
      name: 'classificationFinalStatus',
      type: 'select',
      options: [
        { label: 'Успешно', value: 'success' },
        { label: 'Degraded', value: 'degraded' },
        { label: 'Refused (ручной выбор)', value: 'refused_manual' },
        { label: 'Disabled (классификация выключена)', value: 'disabled' },
      ],
    },
    { name: 'initialAiModel', type: 'text' },
    { name: 'initialAiConfidence', type: 'number' },
    { name: 'finalModel', type: 'text' },
    { name: 'finalConfidence', type: 'number' },
    { name: 'userOverridden', type: 'checkbox', defaultValue: false },
    { name: 'hasDataQualityWarning', type: 'checkbox', defaultValue: false },
    {
      name: 'requestedAccountsHistory',
      type: 'json',
      defaultValue: [],
      admin: {
        description: 'Массив массивов: каждая попытка классификации добавляет новый ряд.',
      },
    },
    // ─── Fork choices ───────────────────────────────────────────────────────
    {
      name: 'forkChoices',
      type: 'json',
      defaultValue: [],
      admin: {
        description: 'Лог выборов в развилке: [{attempt, choice, timestamp}]',
      },
    },
    { name: 'pauseCount', type: 'number', defaultValue: 0, min: 0 },
    { name: 'totalPauseDurationMs', type: 'number', defaultValue: 0, min: 0 },
    // ─── Final ──────────────────────────────────────────────────────────────
    {
      name: 'outcome',
      type: 'select',
      defaultValue: 'in_progress',
      required: true,
      index: true,
      options: [
        { label: 'В процессе', value: 'in_progress' },
        { label: 'Завершён', value: 'completed' },
        { label: 'Брошен', value: 'abandoned' },
        { label: 'Отказ', value: 'refused' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'recommendationsCreated', type: 'number', defaultValue: 0, min: 0 },
  ],
}
