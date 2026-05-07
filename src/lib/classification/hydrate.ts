/**
 * Server-side hydration of the classification snapshot from a Payload
 * `analysis-results` doc.
 *
 * Mirrors the shape produced by `GET /api/analysis/classification-state`,
 * so the same components can be hydrated either via initial server render
 * (this helper) or via the polling fetch (the GET endpoint).
 */

import type { AnalysisResult } from '@/payload-types'
import type { BusinessModel } from './matrix'
import type { ClassificationStateResponse } from './client'
import type { ClassificationStatus } from './types'

type Classification = NonNullable<ClassificationStateResponse['classification']>

interface HydrateOptions {
  maxAttempts: number
}

export function hydrateClassificationFromDraft(
  draft: AnalysisResult,
  options: HydrateOptions,
): Classification {
  const persistedStatus = (draft.classificationStatus ?? null) as
    | 'success'
    | 'degraded'
    | 'refused_manual'
    | 'disabled'
    | null

  const requestedAccounts = unwrapStringArray(draft.requestedAdditionalAccounts)

  // Reverse-derive the AI-side status from the persisted draft. We can't
  // distinguish 'success' from 'needs_data' perfectly without storing the
  // original AI response — `requestedAccounts.length > 0` is the closest
  // signal we have, and `refused_manual` always implies AI couldn't decide.
  let status: ClassificationStatus = 'success'
  if (persistedStatus === 'refused_manual') status = 'cannot_classify'
  else if (requestedAccounts && requestedAccounts.length > 0) status = 'needs_data'

  const rationale =
    typeof draft.businessModelRationale === 'string'
      ? draft.businessModelRationale
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

  return {
    status,
    model: (draft.businessModel as BusinessModel) ?? null,
    confidence: draft.businessModelConfidence ?? null,
    rationale,
    indicators: (draft.businessModelIndicators as Record<string, unknown> | null) ?? {},
    requestedAccounts,
    dataQualityWarning: draft.dataQualityWarning ?? null,
    persistedStatus,
    userOverridden: draft.businessModelUserOverridden === true,
    originalAi: draft.businessModelOriginalAi ?? null,
    attempts: draft.classificationAttempts ?? 0,
    maxAttempts: options.maxAttempts,
  }
}

function unwrapStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const out = value.filter((v): v is string => typeof v === 'string')
  return out.length > 0 ? out : null
}
