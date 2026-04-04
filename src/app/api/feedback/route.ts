import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { logEvent } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { recommendationId, rating, comment } = await request.json()

    if (!recommendationId || !['positive', 'negative'].includes(rating)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    await payload.create({
      collection: 'recommendation-feedback',
      data: {
        owner: user.id,
        recommendation: recommendationId,
        rating,
        comment: comment?.slice(0, 500),
      },
    })

    await logEvent(user.id, 'recommendation.feedback', 'recommendation', recommendationId, {
      rating,
      hasComment: !!comment,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Feedback] Error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
