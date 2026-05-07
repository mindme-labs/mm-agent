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

/**
 * Resolve the requesting user from EITHER auth surface:
 *   1. Custom `payload-token` JWT minted by `/api/auth/login` (CEO-app login).
 *   2. Payload Admin session cookie issued by `/8ca90f70/login` (admin UI).
 *
 * Use this in routes that admins need to call from the Payload Admin UI
 * (e.g. `SeedPromptsButton`) but that may also be hit by the CEO-app or by
 * automation that authenticates via the custom JWT. Returns `null` if neither
 * surface yields a logged-in user.
 *
 * Note: The two surfaces return slightly different user shapes (Payload's
 * `TypedUser` vs the Mongo doc returned by `findByID`). For the read-only
 * admin checks we do today (`user.role === 'admin'`) the overlap is enough;
 * if a route needs richer per-collection fields, prefer `getCurrentUser()`.
 */
export async function getRequestUser(req: Request) {
  const customUser = await getCurrentUser()
  if (customUser) return customUser

  try {
    const payload = await getPayload({ config })
    const result = await payload.auth({ headers: req.headers })
    return result.user ?? null
  } catch {
    return null
  }
}
