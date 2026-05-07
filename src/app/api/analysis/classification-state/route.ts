import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { ClassificationStatus } from '@/lib/classification/types'

/**
 * GET /api/analysis/classification-state
 *
 * Read-only snapshot of the user's wizard state and classification draft.
 * Used by the wizard UI for polling (after page reload, after AI fallback,
 * during awaiting_confirmation) and for hydrating the onboarding pages
 * server-side.
 *
 * Returns:
 *   {
 *     wizardState: <users.wizardState>,
 *     classification: null | {
 *       status:              'success' | 'needs_data' | 'cannot_classify',
 *       model:               BusinessModel | null,
 *       confidence:          number | null,
 *       rationale:           string[],
 *       indicators:          Record<string, unknown>,
 *       requestedAccounts:   string[] | null,
 *       dataQualityWarning:  string | null,
 *       persistedStatus:     'success' | 'degraded' | 'refused_manual' | 'disabled' | null,
 *       userOverridden:      boolean,
 *       originalAi:          string | null,
 *       attempts:            number,
 *       maxAttempts:         number,
 *     }
 *   }
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await getPayload({ config })

    const draftResult = await payload.find({
      collection: 'analysis-results',
      where: { owner: { equals: user.id } },
      sort: '-createdAt',
      limit: 1,
    })
    const draft = draftResult.docs[0]

    if (!draft || !draft.businessModel) {
      return NextResponse.json({
        wizardState: user.wizardState ?? 'idle',
        classification: null,
      })
    }

    const settings = await payload.findGlobal({ slug: 'global-settings' })
    const maxAttempts =
      typeof settings.maxClassificationAttempts === 'number'
        ? settings.maxClassificationAttempts
        : 3

    // Reverse-derive `status` (success / needs_data / cannot_classify) from
    // the persisted draft. The original AI-side status isn't stored verbatim;
    // we synthesize it for the UI from the most distinctive signals.
    const requestedAccounts = unwrapStringArray(draft.requestedAdditionalAccounts)
    const persistedStatus = (draft.classificationStatus ?? null) as
      | 'success'
      | 'degraded'
      | 'refused_manual'
      | 'disabled'
      | null

    let status: ClassificationStatus = 'success'
    if (persistedStatus === 'refused_manual') status = 'cannot_classify'
    else if (requestedAccounts && requestedAccounts.length > 0) status = 'needs_data'

    const rationale = typeof draft.businessModelRationale === 'string'
      ? draft.businessModelRationale.split('\n').map((s) => s.trim()).filter(Boolean)
      : []

    return NextResponse.json({
      wizardState: user.wizardState ?? 'idle',
      classification: {
        status,
        model: draft.businessModel,
        confidence: draft.businessModelConfidence,
        rationale,
        indicators: draft.businessModelIndicators ?? {},
        requestedAccounts,
        dataQualityWarning: draft.dataQualityWarning ?? null,
        persistedStatus,
        userOverridden: draft.businessModelUserOverridden === true,
        originalAi: draft.businessModelOriginalAi ?? null,
        attempts: draft.classificationAttempts ?? 0,
        maxAttempts,
      },
    })
  } catch (err) {
    console.error('[ClassificationState] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function unwrapStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const out = value.filter((v): v is string => typeof v === 'string')
  return out.length > 0 ? out : null
}
