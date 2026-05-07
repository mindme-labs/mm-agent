import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { migrateToV33 } from '@/scripts/migrate-to-v3.3'

/**
 * Admin-only, dev-only endpoint for kicking the v3.3.1 schema migration.
 *
 * Disabled in production (NODE_ENV === 'production') — production migrations
 * must run via the CLI script with explicit human supervision.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled in production' }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'admin only' }, { status: 403 })
  }

  const result = await migrateToV33()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
