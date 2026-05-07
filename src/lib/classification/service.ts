/**
 * `runClassification` — orchestrator that wires the AI classifier to Payload
 * persistence and to the user's `wizardState`.
 *
 * Used by:
 *   - `POST /api/analysis/classify` (primary path, called by the wizard UI)
 *   - `POST /api/analysis/run` (fallback path when no draft exists yet)
 *
 * Always resolves — the underlying `classify()` never throws and returns a
 * safe fallback on any AI failure. The orchestrator persists whatever it
 * gets so the caller has a stable shape to render.
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { logEvent } from '@/lib/logger'
import type { ParsedAccountData, UploadedFileParsedData } from '@/types'
import { classify, safeFallback } from './classifier'
import type { BusinessModel } from './matrix'
import type { ClassificationResult } from './types'
import type { GlobalSetting, AnalysisResult } from '@/payload-types'

export type WizardClassificationState =
  | 'awaiting_confirmation'
  | 'classification_refused'
  | 'awaiting_additional_files'

export interface RunClassificationOutcome {
  result: ClassificationResult
  /** Final classification status persisted to analysis-results. */
  classificationStatus: 'success' | 'degraded' | 'refused_manual' | 'disabled'
  /** Saved analysis-results document id (draft). */
  analysisId: string
  /** New `users.wizardState` after this call. */
  wizardState: WizardClassificationState
  /** Total attempts made by this user so far in the current onboarding. */
  attempts: number
}

interface ResolvedSettings {
  aiClassificationEnabled: boolean
  confidenceThreshold: number
  maxAttempts: number
}

function readSettings(settings: GlobalSetting): ResolvedSettings {
  return {
    aiClassificationEnabled: settings.aiClassificationEnabled !== false,
    confidenceThreshold:
      typeof settings.classificationConfidenceThreshold === 'number'
        ? settings.classificationConfidenceThreshold
        : 0.7,
    maxAttempts:
      typeof settings.maxClassificationAttempts === 'number'
        ? settings.maxClassificationAttempts
        : 3,
  }
}

export async function runClassification(userId: string): Promise<RunClassificationOutcome> {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'global-settings' })
  const resolved = readSettings(settings)

  // 1. AI disabled globally -> short-circuit to safe defaults (matches v3.2).
  if (!resolved.aiClassificationEnabled) {
    const result: ClassificationResult = {
      status: 'success',
      model: 'trading',
      confidence: null,
      rationale: ['AI-классификация отключена администратором'],
      indicators: { _missing: [] },
      requestedAccounts: null,
      dataQualityWarning: null,
    }
    const persisted = await persistDraft(userId, result, 'disabled')
    await updateUserState(userId, 'awaiting_confirmation', persisted.classificationAttempts ?? 1)
    await logEvent(userId, 'classification.completed', 'analysis-results', String(persisted.id), {
      status: 'success',
      model: 'trading',
      classificationStatus: 'disabled',
      reason: 'aiClassificationEnabled=false',
    })
    return {
      result,
      classificationStatus: 'disabled',
      analysisId: String(persisted.id),
      wizardState: 'awaiting_confirmation',
      attempts: persisted.classificationAttempts ?? 1,
    }
  }

  // 2. Load parsedData from the user's uploaded files.
  const parsedData = await loadParsedDataForUser(userId)
  const period = pickPeriod(parsedData)

  // 3. Run AI classifier (always resolves; safeFallback on failures).
  let aiResult: ClassificationResult
  try {
    aiResult = await classify(parsedData, period, userId)
  } catch (err) {
    console.error('[runClassification] classify() unexpectedly threw:', err)
    aiResult = safeFallback('Внутренняя ошибка классификатора')
  }

  // 4. Compute the persisted classificationStatus.
  // Mapping:
  //   AI 'cannot_classify'                            -> 'refused_manual'
  //   AI 'success' with high confidence + no warning  -> 'success'
  //   Anything else (low confidence, needs_data,
  //                  data quality warning)            -> 'success' (UI uses
  //                                                      result.status to
  //                                                      decide which screen
  //                                                      to render — degraded
  //                                                      is reserved for the
  //                                                      explicit user choice
  //                                                      in iter-20)
  let classificationStatus: 'success' | 'degraded' | 'refused_manual' | 'disabled' = 'success'
  let nextWizardState: WizardClassificationState = 'awaiting_confirmation'

  if (aiResult.status === 'cannot_classify') {
    classificationStatus = 'refused_manual'
    nextWizardState = 'classification_refused'
  }

  // 5. Persist the draft.
  const persisted = await persistDraft(userId, aiResult, classificationStatus, period)

  // 6. Update users.wizardState + currentClassificationAttempts.
  await updateUserState(userId, nextWizardState, persisted.classificationAttempts ?? 1)

  // 7. Log completion.
  await logEvent(userId, 'classification.completed', 'analysis-results', String(persisted.id), {
    status: aiResult.status,
    model: aiResult.model,
    confidence: aiResult.confidence,
    classificationStatus,
    attempts: persisted.classificationAttempts ?? 1,
    indicatorsMissing: aiResult.indicators._missing.length,
    requestedAccounts: aiResult.requestedAccounts ?? [],
    hasDataQualityWarning: !!aiResult.dataQualityWarning,
  })

  return {
    result: aiResult,
    classificationStatus,
    analysisId: String(persisted.id),
    wizardState: nextWizardState,
    attempts: persisted.classificationAttempts ?? 1,
  }
}

// -----------------------------------------------------------------------------
// Internals

async function loadParsedDataForUser(userId: string): Promise<ParsedAccountData[]> {
  const payload = await getPayload({ config })
  const files = await payload.find({
    collection: 'uploaded-files',
    where: {
      owner: { equals: userId },
      parseStatus: { equals: 'success' },
    },
    limit: 50,
    sort: '-createdAt',
  })

  const out: ParsedAccountData[] = []
  for (const doc of files.docs) {
    const stored = doc.parsedData as UploadedFileParsedData | null | undefined
    if (!stored) continue
    if (stored.parsed) {
      out.push(stored.parsed)
      continue
    }
    if (stored.aiParsed) out.push(stored.aiParsed)
  }
  return out
}

function pickPeriod(parsedData: ParsedAccountData[]): string {
  for (const d of parsedData) {
    if (d.period && d.period.trim().length > 0) return d.period
  }
  return new Date().toISOString().slice(0, 4) + ' г'
}

/**
 * Find the user's most recent draft analysis-results (analysisPhase=
 * 'classifying'). If found, update it; otherwise create a fresh draft.
 *
 * The same record is later upgraded to `analysisPhase='rules_done'` by
 * /api/analysis/run when the rules engine completes.
 */
async function persistDraft(
  userId: string,
  result: ClassificationResult,
  classificationStatus: 'success' | 'degraded' | 'refused_manual' | 'disabled',
  period?: string,
): Promise<AnalysisResult> {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'analysis-results',
    where: {
      owner: { equals: userId },
      analysisPhase: { equals: 'classifying' },
    },
    sort: '-createdAt',
    limit: 1,
  })

  const previousAttempts = existing.docs[0]?.classificationAttempts ?? 0
  const draftPeriod = period ?? existing.docs[0]?.period ?? '—'

  const sharedData = {
    businessModel: (result.model ?? 'trading') as BusinessModel,
    businessModelConfidence: result.confidence,
    businessModelRationale: result.rationale.join('\n'),
    businessModelIndicators: result.indicators as unknown as Record<string, unknown>,
    classificationStatus,
    requestedAdditionalAccounts: (result.requestedAccounts ?? []) as unknown as Record<
      string,
      unknown
    >,
    classificationAttempts: previousAttempts + 1,
    dataQualityWarning: result.dataQualityWarning,
    analysisPhase: 'classifying' as const,
  }

  if (existing.docs.length > 0) {
    return (await payload.update({
      collection: 'analysis-results',
      id: existing.docs[0].id,
      data: sharedData,
    })) as AnalysisResult
  }

  return (await payload.create({
    collection: 'analysis-results',
    data: {
      owner: userId,
      period: draftPeriod,
      isDemo: false,
      ...sharedData,
    },
  })) as AnalysisResult
}

async function updateUserState(
  userId: string,
  wizardState: WizardClassificationState,
  attempts: number,
): Promise<void> {
  const payload = await getPayload({ config })
  await payload.update({
    collection: 'users',
    id: userId,
    data: {
      wizardState,
      currentClassificationAttempts: attempts,
    },
  })
}

export async function getMaxAttempts(): Promise<number> {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'global-settings' })
  return readSettings(settings).maxAttempts
}
