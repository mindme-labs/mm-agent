import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
  generatePayloadToken,
  setAuthCookie,
  getServerURL,
} from '@/lib/auth'
import { logEvent } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(`${getServerURL()}/auth?error=no_code`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    if (tokens.error) {
      console.error('[OAuth] Token exchange error:', tokens.error)
      return NextResponse.redirect(`${getServerURL()}/auth?error=token_error`)
    }

    const googleUser = await getGoogleUserInfo(tokens.access_token)
    if (!googleUser.email) {
      return NextResponse.redirect(`${getServerURL()}/auth?error=no_email`)
    }

    const payload = await getPayload({ config })

    const globalSettings = await payload.findGlobal({ slug: 'global-settings' })
    const allowedEmails = globalSettings?.allowedEmails?.map(
      (entry: { email?: string }) => entry.email?.toLowerCase(),
    ) || []

    if (allowedEmails.length > 0 && !allowedEmails.includes(googleUser.email.toLowerCase())) {
      await logEvent(null, 'auth.login_denied', undefined, undefined, {
        email: googleUser.email,
      })
      return NextResponse.redirect(`${getServerURL()}/auth?error=not_allowed`)
    }

    const existingUsers = await payload.find({
      collection: 'users',
      where: { email: { equals: googleUser.email } },
      limit: 1,
    })

    let user
    if (existingUsers.docs.length > 0) {
      user = existingUsers.docs[0]
    } else {
      const defaultMode = globalSettings?.defaultMode || 'demo'
      user = await payload.create({
        collection: 'users',
        data: {
          email: googleUser.email,
          name: googleUser.name || '',
          password: crypto.randomUUID(),
          role: 'ceo',
          mode: defaultMode,
          hasCompletedOnboarding: false,
        },
      })
    }

    const token = generatePayloadToken({ id: user.id, email: user.email })
    await setAuthCookie(token)

    const isFirstLogin = !existingUsers.docs.length
    await logEvent(user.id, 'auth.login', undefined, undefined, {
      mode: user.mode,
      isFirstLogin,
    })

    if (user.hasCompletedOnboarding) {
      return NextResponse.redirect(`${getServerURL()}/app/inbox`)
    }
    return NextResponse.redirect(`${getServerURL()}/app/onboarding`)
  } catch (err) {
    console.error('[OAuth] Callback error:', err)
    return NextResponse.redirect(`${getServerURL()}/auth?error=server_error`)
  }
}
