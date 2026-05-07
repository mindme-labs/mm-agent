import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { runClassification, getMaxAttempts } from '@/lib/classification/service'
import { logEvent } from '@/lib/logger'

/**
 * POST /api/analysis/classify
 *
 * Wizard-driven AI classification of the user's business model.
 *
 * Allowed `wizardState` values on entry:
 *   - 'idle'                       (first onboarding, no UI restriction yet)
 *   - 'uploading' / 'recognizing' / 'extracting'
 *                                  (called by the wizard once files are ready)
 *   - 'classifying'                (retry from the same state — idempotent)
 *   - 'awaiting_additional_files'  (resume after pause + dozagruzka)
 *
 * Returns 409 from any other state. Returns 429 once
 * `currentClassificationAttempts >= maxClassificationAttempts`.
 *
 * The orchestrator (`runClassification`) handles AI-disabled fallback,
 * persistence into a draft analysis-results, wizardState update, and
 * event logging. The endpoint just enforces the state machine and surfaces
 * the result.
 */
const ALLOWED_ENTRY_STATES = new Set([
  'idle',
  'uploading',
  'recognizing',
  'extracting',
  'classifying',
  'awaiting_additional_files',
])

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const wizardState = user.wizardState ?? 'idle'
    if (!ALLOWED_ENTRY_STATES.has(wizardState)) {
      return NextResponse.json(
        {
          error: `cannot classify from wizardState='${wizardState}'`,
          wizardState,
        },
        { status: 409 },
      )
    }

    const maxAttempts = await getMaxAttempts()
    const attempts = user.currentClassificationAttempts ?? 0
    if (attempts >= maxAttempts) {
      return NextResponse.json(
        {
          error: 'max_attempts_reached',
          attempts,
          maxAttempts,
        },
        { status: 429 },
      )
    }

    // Pre-flight: flip user to 'classifying' so a parallel poll sees the right state.
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { wizardState: 'classifying' },
    })

    await logEvent(user.id, 'classification.started', undefined, undefined, {
      attempt: attempts + 1,
      maxAttempts,
      previousState: wizardState,
    })

    const outcome = await runClassification(user.id)

    return NextResponse.json({
      ok: true,
      wizardState: outcome.wizardState,
      classificationStatus: outcome.classificationStatus,
      analysisId: outcome.analysisId,
      attempts: outcome.attempts,
      maxAttempts,
      result: outcome.result,
    })
  } catch (err) {
    console.error('[Classify] Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Ошибка классификации: ${message}` }, { status: 500 })
  }
}
