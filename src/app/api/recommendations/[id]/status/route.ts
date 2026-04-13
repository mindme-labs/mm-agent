import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { logEvent } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const { status } = await request.json()

    const validStatuses = ['new', 'in_progress', 'resolved', 'stuck', 'dismissed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const rec = await payload.findByID({ collection: 'recommendations', id })
    if (!rec || (typeof rec.owner === 'string' ? rec.owner : rec.owner?.id) !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const oldStatus = rec.status
    const updateData: Record<string, unknown> = { status }

    if (status === 'in_progress' && oldStatus !== 'in_progress') {
      const now = new Date()
      updateData.takenAt = now.toISOString()
      const due = new Date(now)
      due.setDate(due.getDate() + 14)
      updateData.dueDate = due.toISOString()
    }

    const updated = await payload.update({
      collection: 'recommendations',
      id,
      data: updateData,
    })

    await logEvent(user.id, 'recommendation.status_changed', 'recommendation', id, {
      from: oldStatus,
      to: status,
    })

    return NextResponse.json({ ok: true, status: updated.status })
  } catch (err) {
    console.error('[Recommendation] Status change error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
