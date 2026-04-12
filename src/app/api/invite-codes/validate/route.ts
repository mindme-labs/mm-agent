import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Код не указан' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'invite-codes',
      where: {
        code: { equals: code.trim().toUpperCase() },
        isUsed: { equals: false },
      },
      limit: 1,
    })

    if (result.docs.length === 0) {
      return NextResponse.json({ valid: false, error: 'Код недействителен или уже использован' })
    }

    const invite = result.docs[0]
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Срок действия кода истёк' })
    }

    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error('[InviteCode] Validation error:', err)
    return NextResponse.json({ valid: false, error: 'Ошибка проверки' }, { status: 500 })
  }
}
