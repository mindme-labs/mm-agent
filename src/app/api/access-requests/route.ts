import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { logEvent } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const existing = await payload.find({
      collection: 'access-requests',
      where: { email: { equals: email.trim().toLowerCase() } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      return NextResponse.json({ ok: true, message: 'Запрос уже отправлен' })
    }

    await payload.create({
      collection: 'access-requests',
      data: {
        email: email.trim().toLowerCase(),
        status: 'pending',
      },
    })

    await logEvent(null, 'access.request', undefined, undefined, {
      email: email.trim().toLowerCase(),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[AccessRequest] Error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
