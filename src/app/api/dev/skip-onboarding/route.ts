import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const payload = await getPayload({ config })
  const updated = await payload.update({
    collection: 'users',
    id: user.id,
    data: { hasCompletedOnboarding: true },
  })

  return NextResponse.json({
    ok: true,
    email: updated.email,
    hasCompletedOnboarding: updated.hasCompletedOnboarding,
  })
}
