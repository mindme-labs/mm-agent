import { NextRequest, NextResponse } from 'next/server'
import { sweepAbandoned } from '@/lib/funnel/abandoned-sweep'

/**
 * Vercel-scheduled function — flips long-idle onboarding funnel records to
 * outcome='abandoned'. Runs hourly per `vercel.json`.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}`. Vercel
 * automatically attaches this header for cron-triggered invocations
 * (provided `CRON_SECRET` is set in env). Protects against random
 * internet traffic hitting the endpoint.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (expected) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await sweepAbandoned()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron sweep-abandoned] failed:', err)
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown',
      },
      { status: 500 },
    )
  }
}
