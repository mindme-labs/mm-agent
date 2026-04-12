import { NextResponse } from 'next/server'
import { clearAuthCookie, getCurrentUser, getServerURL } from '@/lib/auth'
import { logEvent } from '@/lib/logger'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (user) {
      await logEvent(user.id, 'auth.logout')
    }
    await clearAuthCookie()
  } catch (err) {
    console.error('[Auth] Logout error:', err)
  }
  return NextResponse.redirect(getServerURL() + '/', { status: 303 })
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (user) {
      await logEvent(user.id, 'auth.logout')
    }
    await clearAuthCookie()
  } catch (err) {
    console.error('[Auth] Logout error:', err)
  }
  return NextResponse.redirect(getServerURL() + '/', { status: 303 })
}
