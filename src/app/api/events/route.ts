import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { logEvent } from '@/lib/logger'

// Events that the browser is allowed to log directly via this endpoint.
// Server-side events go through `logEvent()` with no whitelist.
const ALLOWED_EVENTS = [
  'recommendation.text_copied',
  'recommendation.viewed',
  'page.view',
  // v3.3.1 — wizard transitions observed only on the client side.
  'wizard.resumed',
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
