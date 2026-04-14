import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { seedDemoForUser } from '@/lib/demo'
import { logEvent } from '@/lib/logger'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await logEvent(user.id, 'onboarding.analysis_start', undefined, undefined, {
      mode: user.mode,
    })

    const count = await seedDemoForUser(user.id)

    await logEvent(user.id, 'onboarding.analysis_complete', undefined, undefined, {
      recommendationCount: count,
      mode: user.mode,
    })

    return NextResponse.json({ ok: true, recommendationCount: count })
  } catch (err) {
    console.error('[Demo Seed] Error:', err)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
