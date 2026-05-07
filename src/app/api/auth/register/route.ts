import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generatePayloadToken, setAuthCookie } from '@/lib/auth'
import { logEvent } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, inviteCode } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Пароль должен быть не менее 8 символов' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    if (inviteCode) {
      const codes = await payload.find({
        collection: 'invite-codes',
        where: {
          code: { equals: inviteCode.trim().toUpperCase() },
          isUsed: { equals: false },
        },
        limit: 1,
      })

      if (codes.docs.length === 0) {
        return NextResponse.json({ error: 'Инвайт-код недействителен или уже использован' }, { status: 400 })
      }

      const invite = codes.docs[0]
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Срок действия кода истёк' }, { status: 400 })
      }
    }

    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: email.trim().toLowerCase() } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 409 })
    }

    const trialExpiresAt = new Date()
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 7)

    const user = await payload.create({
      collection: 'users',
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password,
        role: 'ceo',
        mode: 'trial',
        hasCompletedOnboarding: false,
        trialExpiresAt: trialExpiresAt.toISOString(),
        analysisStatus: 'none',
        inviteCode: inviteCode?.trim().toUpperCase() || undefined,
        wizardState: 'idle',
        currentClassificationAttempts: 0,
      },
    })

    if (inviteCode) {
      const codes = await payload.find({
        collection: 'invite-codes',
        where: { code: { equals: inviteCode.trim().toUpperCase() } },
        limit: 1,
      })
      if (codes.docs.length > 0) {
        await payload.update({
          collection: 'invite-codes',
          id: codes.docs[0].id,
          data: {
            isUsed: true,
            usedBy: user.id,
          },
        })
        await logEvent(user.id, 'invite.used', undefined, undefined, {
          code: inviteCode.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
        })
      }
    }

    const token = generatePayloadToken({ id: user.id, email: user.email })
    await setAuthCookie(token)

    await logEvent(user.id, 'auth.login', undefined, undefined, {
      mode: 'trial',
      isFirstLogin: true,
    })

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    console.error('[Register] Error:', err)
    const message = err instanceof Error ? err.message : 'Ошибка регистрации'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
