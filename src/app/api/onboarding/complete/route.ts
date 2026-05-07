import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { logEvent } from '@/lib/logger'
import { computeDurations } from '@/lib/funnel/compute-durations'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = await getPayload({ config })
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        hasCompletedOnboarding: true,
        // v3.3.1 — terminal wizard state. Layout uses this to short-circuit
        // wizard routing for users who finished onboarding.
        wizardState: 'completed',
      },
    })

    await logEvent(user.id, 'onboarding.complete', undefined, undefined, {
      mode: user.mode,
    })

    // v3.3.1 — funnel: terminal transition + duration snapshot.
    // Done inline (not via updateFunnelEvent) because we need the final
    // record to compute durations and we want a single atomic write.
    try {
      const fresh = await payload.find({
        collection: 'onboarding-funnel-events',
        where: {
          owner: { equals: user.id },
          outcome: { equals: 'in_progress' },
        },
        sort: '-createdAt',
        limit: 1,
      })
      const record = fresh.docs[0]
      if (record) {
        const durations = computeDurations(record)
        await payload.update({
          collection: 'onboarding-funnel-events',
          id: record.id,
          data: {
            outcome: 'completed',
            ...durations,
          },
        })
      }
    } catch (err) {
      console.error('[funnel] finalize on complete failed:', err)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Onboarding] Complete error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
