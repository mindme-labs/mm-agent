/**
 * Browser-side fetchers for the classification endpoints.
 * Centralizes URL paths and response shapes so each onboarding screen calls
 * a stable signature instead of hand-rolling fetches.
 */

import type { BusinessModel } from './matrix'
import type { ClassificationStatus } from './types'

export interface ClassificationStateResponse {
  wizardState: string
  classification: null | {
    status: ClassificationStatus
    model: BusinessModel | null
    confidence: number | null
    rationale: string[]
    indicators: Record<string, unknown>
    requestedAccounts: string[] | null
    dataQualityWarning: string | null
    persistedStatus: 'success' | 'degraded' | 'refused_manual' | 'disabled' | null
    userOverridden: boolean
    originalAi: string | null
    attempts: number
    maxAttempts: number
  }
}

export type ForkChoice = 'upload_now' | 'upload_later' | 'continue_degraded'

export interface PatchClassificationBody {
  model?: BusinessModel
  isOverride?: boolean
  acceptDegraded?: boolean
  choice?: ForkChoice
}

export interface PatchClassificationResponse {
  ok: boolean
  status: 'paused' | 'reupload' | 'confirmed'
  wizardState: string
  nextStage: string
  model?: BusinessModel
  classificationStatus?: 'success' | 'degraded' | 'refused_manual'
  error?: string
}

export async function fetchClassificationState(): Promise<ClassificationStateResponse | null> {
  try {
    const res = await fetch('/api/analysis/classification-state', { credentials: 'include' })
    if (!res.ok) return null
    return (await res.json()) as ClassificationStateResponse
  } catch {
    return null
  }
}

export async function patchClassification(
  body: PatchClassificationBody,
): Promise<PatchClassificationResponse> {
  const res = await fetch('/api/analysis/classification', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  return (await res.json()) as PatchClassificationResponse
}

export interface RefuseClassificationResponse {
  ok: boolean
  supportContact?: string
  error?: string
}

export async function refuseClassification(): Promise<RefuseClassificationResponse> {
  const res = await fetch('/api/analysis/refuse-classification', {
    method: 'POST',
    credentials: 'include',
  })
  return (await res.json()) as RefuseClassificationResponse
}
