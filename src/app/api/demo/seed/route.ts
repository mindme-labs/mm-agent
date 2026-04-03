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
    if (user.mode !== 'demo') {
      return NextResponse.json({ error: 'Only available in demo mode' }, { status: 403 })
    }

    const count = await seedDemoForUser(user.id)

    await logEvent(user.id, 'onboarding.analysis_complete', undefined, undefined, {
      recommendationCount: count,
      mode: 'demo',
    })

    return NextResponse.json({ ok: true, recommendationCount: count })
  } catch (err) {
    console.error('[Demo Seed] Error:', err)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
