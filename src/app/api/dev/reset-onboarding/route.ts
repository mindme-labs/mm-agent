import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { clearDemoForUser } from '@/lib/demo'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  await clearDemoForUser(user.id)

  return NextResponse.json({
    ok: true,
    message: 'Onboarding reset. Demo data cleared.',
  })
}
