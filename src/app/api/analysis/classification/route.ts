import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { ALL_BUSINESS_MODELS, type BusinessModel } from '@/lib/classification/matrix'
import { logEvent } from '@/lib/logger'
import type { AnalysisResult } from '@/payload-types'

/**
 * PATCH /api/analysis/classification
 *
 * Receives the user's decision on the AI's classification. The body covers
 * three concrete user actions in the onboarding wizard:
 *
 *   - Confirm AI's choice as-is.
 *   - Override AI's choice with a different model.
 *   - Pick a fork branch (upload more files now / later, or accept degraded).
 *
 * Body: {
 *   model:           BusinessModel       // final model the user wants to use
 *   isOverride?:     boolean             // true if user changed AI's pick
 *   acceptDegraded?: boolean             // true when user proceeds knowing data is incomplete
 *   choice?:         'upload_now' | 'upload_later' | 'continue_degraded'
 * }
 *
 * State machine: only valid from `awaiting_confirmation` (Confirm/Fork screen)
 * and `classification_refused` (Refused screen). Any other state -> 409.
 *
 * Returns:
 *   { ok, status: 'paused' | 'reupload' | 'confirmed', nextStage: string,
 *     wizardState: <new state> }
 *
 * `nextStage` is a frontend-only hint at where the wizard should navigate.
 * The actual routing is enforced by the layout in iter-21.
 */
const ALLOWED_ENTRY_STATES = new Set(['awaiting_confirmation', 'classification_refused'])
const VALID_BUSINESS_MODELS: ReadonlySet<string> = new Set(ALL_BUSINESS_MODELS)
const VALID_FORK_CHOICES = new Set(['upload_now', 'upload_later', 'continue_degraded'])

interface PatchBody {
  model?: unknown
  isOverride?: unknown
  acceptDegraded?: unknown
  choice?: unknown
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const wizardState = user.wizardState ?? 'idle'
    if (!ALLOWED_ENTRY_STATES.has(wizardState)) {
      return NextResponse.json(
        { error: `cannot patch classification from wizardState='${wizardState}'`, wizardState },
        { status: 409 },
      )
    }

    const body = (await request.json()) as PatchBody
    const isOverride = body.isOverride === true
    const acceptDegraded = body.acceptDegraded === true
    const rawChoice = typeof body.choice === 'string' ? body.choice : null
    const choice = rawChoice && VALID_FORK_CHOICES.has(rawChoice) ? rawChoice : null

    const payload = await getPayload({ config })

    // Locate the user's draft analysis-results (analysisPhase='classifying').
    const draftResult = await payload.find({
      collection: 'analysis-results',
      where: { owner: { equals: user.id }, analysisPhase: { equals: 'classifying' } },
      sort: '-createdAt',
      limit: 1,
    })
    const draft = draftResult.docs[0] as AnalysisResult | undefined
    if (!draft) {
      return NextResponse.json({ error: 'no_classification_draft' }, { status: 412 })
    }

    // ---- Branch 1: pause the wizard ----
    if (choice === 'upload_later') {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: { wizardState: 'awaiting_additional_files' },
      })
      await logEvent(user.id, 'classification.user_choice', 'analysis-results', String(draft.id), {
        choice,
        currentModel: draft.businessModel,
      })
      await logEvent(user.id, 'wizard.paused', undefined, undefined, {
        from: 'awaiting_confirmation',
        choice,
      })
      return NextResponse.json({
        ok: true,
        status: 'paused',
        wizardState: 'awaiting_additional_files',
        nextStage: '/app/onboarding/resume',
      })
    }

    // ---- Branch 2: re-upload now ----
    if (choice === 'upload_now') {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: { wizardState: 'uploading' },
      })
      await logEvent(user.id, 'classification.user_choice', 'analysis-results', String(draft.id), {
        choice,
        currentModel: draft.businessModel,
      })
      return NextResponse.json({
        ok: true,
        status: 'reupload',
        wizardState: 'uploading',
        nextStage: '/app/onboarding',
      })
    }

    // ---- Branch 3: confirm (with optional override or degraded acceptance) ----
    const rawModel = typeof body.model === 'string' ? body.model : null
    if (!rawModel || !VALID_BUSINESS_MODELS.has(rawModel)) {
      return NextResponse.json({ error: 'invalid_model' }, { status: 400 })
    }
    const model = rawModel as BusinessModel

    const wasRefused = wizardState === 'classification_refused'
    const previousAiModel = draft.businessModelOriginalAi || draft.businessModel || null
    const isActualOverride = isOverride && previousAiModel && previousAiModel !== model

    let nextClassificationStatus: 'success' | 'degraded' | 'refused_manual' = 'success'
    if (wasRefused) {
      nextClassificationStatus = 'refused_manual'
    } else if (acceptDegraded) {
      nextClassificationStatus = 'degraded'
    } else if (draft.classificationStatus === 'disabled') {
      // Preserve the disabled marker for downstream analytics.
      nextClassificationStatus = 'success'
    }

    await payload.update({
      collection: 'analysis-results',
      id: draft.id,
      data: {
        businessModel: model,
        businessModelUserOverridden: isActualOverride ? true : draft.businessModelUserOverridden,
        businessModelOriginalAi: isActualOverride
          ? (previousAiModel ?? draft.businessModelOriginalAi)
          : draft.businessModelOriginalAi,
        classificationStatus: nextClassificationStatus,
      },
    })

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { wizardState: 'analyzing' },
    })

    if (isActualOverride) {
      await logEvent(user.id, 'classification.user_override', 'analysis-results', String(draft.id), {
        from: previousAiModel,
        to: model,
        wasRefused,
      })
    }
    if (acceptDegraded) {
      await logEvent(user.id, 'classification.degraded_accepted', 'analysis-results', String(draft.id), {
        model,
      })
    }
    if (wasRefused && isActualOverride) {
      await logEvent(user.id, 'classification.refused_manual_override', 'analysis-results', String(draft.id), {
        model,
      })
    }
    if (choice === 'continue_degraded') {
      await logEvent(user.id, 'classification.user_choice', 'analysis-results', String(draft.id), {
        choice,
        finalModel: model,
      })
    }
    await logEvent(user.id, 'classification.confirmed', 'analysis-results', String(draft.id), {
      model,
      isOverride: isActualOverride,
      classificationStatus: nextClassificationStatus,
    })

    return NextResponse.json({
      ok: true,
      status: 'confirmed',
      wizardState: 'analyzing',
      nextStage: '/app/onboarding',
      model,
      classificationStatus: nextClassificationStatus,
    })
  } catch (err) {
    console.error('[Classification PATCH] Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Ошибка: ${message}` }, { status: 500 })
  }
}
