import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import type { OnboardingFunnelEvent, User } from '@/payload-types'

/**
 * GET /api/admin/funnel/export
 *
 * CSV export of onboarding-funnel-events. UTF-8 with BOM so Excel
 * auto-detects the encoding. Streams whole result in one response (the
 * collection caps at a few thousand rows in practice).
 *
 * Query params: same as /api/admin/funnel/overview.
 */
const COLUMNS = [
  'attemptNumber',
  'email',
  'outcome',
  'startedAt',
  'updatedAt',
  'reachedStart',
  'reachedUpload',
  'reachedMinimumSet',
  'reachedRecommendedSet',
  'reachedRecognition',
  'reachedExtraction',
  'reachedClassification',
  'reachedConfirmation',
  'reachedAnalysis',
  'classificationAttempts',
  'classificationFinalStatus',
  'initialAiModel',
  'initialAiConfidence',
  'finalModel',
  'finalConfidence',
  'userOverridden',
  'hasDataQualityWarning',
  'filesUploaded',
  'pauseCount',
  'recommendationsCreated',
  'durationToUpload',
  'durationUpload',
  'durationRecognition',
  'durationExtraction',
  'durationClassification',
  'durationConfirmation',
  'durationAnalysis',
  'durationTotal',
  'uploadedAccounts',
  'missingRequiredAccounts',
  'missingRecommendedAccounts',
  'forkChoices',
  'requestedAccountsHistory',
] as const

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const url = new URL(request.url)
  const period = url.searchParams.get('period') ?? '30d'
  const dateFrom = url.searchParams.get('date_from')
  const dateTo = url.searchParams.get('date_to')
  const filterStatus = url.searchParams.get('classificationStatus')
  const range = resolveDateRange(period, dateFrom, dateTo)

  try {
    const payload = await getPayload({ config })
    const where: Where = {}
    if (range.from) where.startedAt = { greater_than_equal: range.from }
    if (range.to) {
      where.startedAt = { ...(where.startedAt ?? {}), less_than_equal: range.to }
    }
    if (filterStatus) where.classificationFinalStatus = { equals: filterStatus }

    const records = await payload.find({
      collection: 'onboarding-funnel-events',
      where,
      limit: 5000,
      sort: '-startedAt',
      depth: 1,
    })

    const lines: string[] = []
    lines.push(COLUMNS.join(','))
    for (const doc of records.docs) {
      const owner = (typeof doc.owner === 'object' && doc.owner !== null
        ? (doc.owner as User)
        : null)
      const cells = COLUMNS.map((col) => {
        if (col === 'email') return csvEscape(owner?.email ?? '')
        return csvEscape(serializeCell((doc as unknown as Record<string, unknown>)[col]))
      })
      lines.push(cells.join(','))
    }

    // Excel needs BOM to auto-detect UTF-8 with Cyrillic.
    const body = '\ufeff' + lines.join('\r\n') + '\r\n'
    const filename = `funnel-${period}-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[admin/funnel/export] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}

function resolveDateRange(period: string, customFrom: string | null, customTo: string | null) {
  const now = new Date()
  if (period === 'custom') {
    return { from: customFrom ?? null, to: customTo ?? null }
  }
  if (period === 'today') {
    const d = new Date(now)
    d.setUTCHours(0, 0, 0, 0)
    return { from: d.toISOString(), to: now.toISOString() }
  }
  const days = period === '7d' ? 7 : 30
  const from = new Date(now.getTime() - days * 86400_000)
  return { from: from.toISOString(), to: now.toISOString() }
}

function serializeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  // Arrays + objects -> JSON-string for CSV cells.
  return JSON.stringify(value)
}

function csvEscape(value: string): string {
  if (value === '') return ''
  if (/[",\r\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}
