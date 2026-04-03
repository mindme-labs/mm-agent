import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { logEvent } from '@/lib/logger'

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
      data: { hasCompletedOnboarding: true },
    })

    await logEvent(user.id, 'onboarding.complete', undefined, undefined, {
      mode: user.mode,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Onboarding] Complete error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
