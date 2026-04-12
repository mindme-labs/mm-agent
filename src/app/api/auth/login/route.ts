import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generatePayloadToken, setAuthCookie } from '@/lib/auth'
import { logEvent } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const result = await payload.login({
      collection: 'users',
      data: { email: email.trim().toLowerCase(), password },
    })

    if (!result.user) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
    }

    const token = generatePayloadToken({ id: result.user.id, email: result.user.email })
    await setAuthCookie(token)

    await logEvent(result.user.id, 'auth.login', undefined, undefined, {
      mode: result.user.mode,
      isFirstLogin: false,
    })

    return NextResponse.json({
      ok: true,
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
    })
  } catch (err) {
    console.error('[Login] Error:', err)
    const message = err instanceof Error && err.message.includes('credentials')
      ? 'Неверный email или пароль'
      : 'Ошибка входа'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
