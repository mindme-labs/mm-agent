import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

const COOKIE_NAME = 'payload-token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function getServerURL(): string {
  return process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
}

export function generatePayloadToken(user: { id: string; email: string }): string {
  const secret = process.env.PAYLOAD_SECRET || ''
  return jwt.sign(
    { id: user.id, collection: 'users', email: user.email },
    secret,
    { expiresIn: '30d' },
  )
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
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
