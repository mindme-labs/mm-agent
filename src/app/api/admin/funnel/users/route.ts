import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import type { OnboardingFunnelEvent, User } from '@/payload-types'

/**
 * GET /api/admin/funnel/users
 *
 * Drill-down: lists users who reached `step` but did not advance to the
 * subsequent step. Powers the "click on a funnel cell" interaction in the
 * admin dashboard.
 *
 * Query params:
 *   - step: required. One of the canonical reachedXxx flags (without
 *           the "reached" prefix), in lowerCamelCase.
 *           Examples: "start" | "upload" | "minimumSet" | "recognition" |
 *                     "extraction" | "classification" | "confirmation" |
 *                     "analysis"
 *   - completed: 'true' | 'false' (default 'false'). When false, returns
 *                users who reached `step` but NOT the next step.
 *   - period:    same shape as overview endpoint.
 *   - limit:     1..500 (default 100).
 */
const STEP_ORDER = [
  'start',
  'upload',
  'minimumSet',
  'recognition',
  'extraction',
  'classification',
  'confirmation',
  'analysis',
] as const
type StepKey = (typeof STEP_ORDER)[number]

function flagFor(step: StepKey): keyof OnboardingFunnelEvent {
  return ('reached' + step.charAt(0).toUpperCase() + step.slice(1)) as keyof OnboardingFunnelEvent
}

interface UserDropoutRow {
  userId: string
  email: string
  attemptNumber: number
  outcome: OnboardingFunnelEvent['outcome']
  startedAt: string | null
  updatedAt: string | null
  finalModel: string | null
  filesUploaded: number
  missingRequiredAccounts: string[]
  classificationAttempts: number
}

export async function GET(request: NextRequest) {
  const requester = await getRequestUser(request)
  if (!requester) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (requester.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const url = new URL(request.url)
  const stepRaw = url.searchParams.get('step')
  const completedFilter = url.searchParams.get('completed') === 'true'
  const limitRaw = url.searchParams.get('limit')
  const limit = Math.max(1, Math.min(500, Number(limitRaw) || 100))

  if (!stepRaw || !(STEP_ORDER as readonly string[]).includes(stepRaw)) {
    return NextResponse.json(
      { error: `step must be one of: ${STEP_ORDER.join(', ')}` },
      { status: 400 },
    )
  }
  const step = stepRaw as StepKey
  const stepIdx = STEP_ORDER.indexOf(step)
  const stepFlag = flagFor(step)
  const nextFlag = stepIdx < STEP_ORDER.length - 1 ? flagFor(STEP_ORDER[stepIdx + 1]) : null

  try {
    const payload = await getPayload({ config })
    const where: Where = {
      [stepFlag]: { equals: true },
    }
    if (nextFlag && !completedFilter) {
      where[nextFlag] = { not_equals: true }
    } else if (completedFilter) {
      where.outcome = { equals: 'completed' }
    }

    const records = await payload.find({
      collection: 'onboarding-funnel-events',
      where,
      sort: '-updatedAt',
      limit,
      depth: 1,
    })

    const out: UserDropoutRow[] = records.docs.map((doc) => {
      const owner = (typeof doc.owner === 'object' && doc.owner !== null
        ? (doc.owner as User)
        : null)
      return {
        userId: typeof doc.owner === 'string' ? doc.owner : (owner?.id as string) ?? '',
        email: owner?.email ?? '',
        attemptNumber: doc.attemptNumber ?? 1,
        outcome: doc.outcome,
        startedAt: doc.startedAt ?? null,
        updatedAt: doc.updatedAt ?? null,
        finalModel: (doc.finalModel ?? doc.initialAiModel ?? null) as string | null,
        filesUploaded: doc.filesUploaded ?? 0,
        missingRequiredAccounts: Array.isArray(doc.missingRequiredAccounts)
          ? (doc.missingRequiredAccounts as string[])
          : [],
        classificationAttempts: doc.classificationAttempts ?? 0,
      }
    })

    return NextResponse.json({
      step,
      completedFilter,
      total: records.totalDocs,
      returned: out.length,
      rows: out,
    })
  } catch (err) {
    console.error('[admin/funnel/users] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
