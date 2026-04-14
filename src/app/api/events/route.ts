import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { logEvent } from '@/lib/logger'

const ALLOWED_EVENTS = [
  'recommendation.text_copied',
  'recommendation.viewed',
  'page.view',
]

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { eventType, entityType, entityId, payload: eventPayload } = await request.json()

    if (!eventType || !ALLOWED_EVENTS.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    await logEvent(user.id, eventType, entityType, entityId, eventPayload)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
