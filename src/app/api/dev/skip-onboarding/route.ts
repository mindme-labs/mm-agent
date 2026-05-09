import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const payload = await getPayload({ config })
  // Mirror /api/onboarding/complete — flip both fields so the layout's
  // wizardState routing treats this as a completed onboarding immediately.
  const updated = await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      hasCompletedOnboarding: true,
      wizardState: 'completed',
    },
  })

  return NextResponse.json({
    ok: true,
    email: updated.email,
    hasCompletedOnboarding: updated.hasCompletedOnboarding,
  })
}
