import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

const COOKIE_NAME = 'payload-token'

export function getServerURL(): string {
  return process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
}

export function getGoogleOAuthURL(): string {
  const rootURL = 'https://accounts.google.com/o/oauth2/v2/auth'
  const options = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: `${getServerURL()}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${rootURL}?${options.toString()}`
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: `${getServerURL()}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })
  return res.json()
}

export async function getGoogleUserInfo(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.json()
}

export function generatePayloadToken(user: { id: string; email: string }): string {
  const secret = process.env.PAYLOAD_SECRET || ''
  return jwt.sign(
    { id: user.id, collection: 'users', email: user.email },
    secret,
    { expiresIn: '7d' },
  )
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax',
  })
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const secret = process.env.PAYLOAD_SECRET || ''
    const decoded = jwt.verify(token, secret) as { id: string; collection: string; email: string }

    const payload = await getPayload({ config })
    const user = await payload.findByID({
      collection: 'users',
      id: decoded.id,
    })

    return user
  } catch {
    return null
  }
}
