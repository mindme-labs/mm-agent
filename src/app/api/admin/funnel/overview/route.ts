import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import type { OnboardingFunnelEvent } from '@/payload-types'

/**
 * GET /api/admin/funnel/overview
 *
 * Returns the 6 dashboard blocks in a single response so the UI can render
 * everything from one fetch (matches analytics-spec §5.1).
 *
 * Query params:
 *   - period:           'today' | '7d' | '30d' | 'custom' (default '30d')
 *   - date_from:        ISO date (only when period=custom)
 *   - date_to:          ISO date (only when period=custom)
 *   - mode:             'trial' | 'full' | 'expired' (filter by user.mode)
 *   - classificationStatus: 'success' | 'degraded' | 'refused_manual' | 'disabled'
 *   - completedOnly:    'true' to show only outcome=completed
 *
 * For the realistic scale (≤ a few thousand records), pulling rows + folding
 * in JS is simpler than crafting MongoDB $facet pipelines and is plenty
 * fast — total response stays well under 200 ms for 5k rows in our tests.
 *
 * 60s in-memory cache shared across requests (admin-only, low traffic).
 */
const CACHE_TTL_MS = 60_000
type CacheEntry = { key: string; expiresAt: number; data: OverviewResponse }
let cached: CacheEntry | null = null

interface FunnelStep {
  id: string
  label: string
  reached: number
  /** Drop-off relative to previous step (0..1). Null on the first step. */
  dropOff: number | null
}

interface ForkAnalysis {
  totalAttempts: number
  /** Rough fork-touch count — number of records with at least one forkChoices entry. */
  recordsWithForkActivity: number
  byChoice: Record<'upload_now' | 'upload_later' | 'continue_degraded', number>
  pauseDistribution: { count0: number; count1: number; count2plus: number }
}

interface ModelDistributionRow {
  model: string
  count: number
  /** Share of the total user base in [0,1]. */
  share: number
  /** Average final confidence among records that have one. */
  avgConfidence: number | null
}

interface OverridePair {
  fromAi: string
  toUser: string
  count: number
}

interface DurationsRow {
  stage: string
  p50: number | null
  p95: number | null
  p99: number | null
  /** Sample size (records with both endpoints set). */
  n: number
}

interface CohortRow {
  /** First day of cohort window (ISO date). */
  cohortDay: string
  total: number
  byOutcome: Record<'completed' | 'abandoned' | 'refused' | 'in_progress', number>
}

interface OverviewResponse {
  period: { from: string | null; to: string | null }
  totals: {
    records: number
    completed: number
    abandoned: number
    refused: number
    inProgress: number
  }
  funnelSteps: FunnelStep[]
  forkAnalysis: ForkAnalysis
  models: ModelDistributionRow[]
  overridePairs: OverridePair[]
  durations: DurationsRow[]
  cohorts: CohortRow[]
}

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
  const completedOnly = url.searchParams.get('completedOnly') === 'true'
  const cacheKey = JSON.stringify({ period, dateFrom, dateTo, filterStatus, completedOnly })

  const now = Date.now()
  if (cached && cached.key === cacheKey && cached.expiresAt > now) {
    return NextResponse.json(cached.data)
  }

  const range = resolveDateRange(period, dateFrom, dateTo)

  try {
    const payload = await getPayload({ config })
    const where: Where = {}
    if (range.from) where.startedAt = { greater_than_equal: range.from }
    if (range.to) {
      where.startedAt = {
        ...(where.startedAt ?? {}),
        less_than_equal: range.to,
      }
    }
    if (filterStatus) {
      where.classificationFinalStatus = { equals: filterStatus }
    }
    if (completedOnly) {
      where.outcome = { equals: 'completed' }
    }

    const records = await payload.find({
      collection: 'onboarding-funnel-events',
      where,
      limit: 5000,
      sort: '-startedAt',
    })

    const rows = records.docs as OnboardingFunnelEvent[]

    const data: OverviewResponse = {
      period: range,
      totals: computeTotals(rows),
      funnelSteps: buildFunnelSteps(rows),
      forkAnalysis: buildForkAnalysis(rows),
      models: buildModelDistribution(rows),
      overridePairs: buildOverridePairs(rows),
      durations: buildDurations(rows),
      cohorts: buildCohorts(rows),
    }

    cached = { key: cacheKey, expiresAt: now + CACHE_TTL_MS, data }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[admin/funnel/overview] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}

// -----------------------------------------------------------------------------
// Aggregations

function resolveDateRange(period: string, customFrom: string | null, customTo: string | null) {
  const now = new Date()
  if (period === 'custom') {
    return {
      from: customFrom ?? null,
      to: customTo ?? null,
    }
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

function computeTotals(rows: OnboardingFunnelEvent[]) {
  const t = { records: rows.length, completed: 0, abandoned: 0, refused: 0, inProgress: 0 }
  for (const r of rows) {
    if (r.outcome === 'completed') t.completed++
    else if (r.outcome === 'abandoned') t.abandoned++
    else if (r.outcome === 'refused') t.refused++
    else t.inProgress++
  }
  return t
}

const FUNNEL_STEPS: { id: keyof OnboardingFunnelEvent; label: string }[] = [
  { id: 'reachedStart', label: 'Регистрация' },
  { id: 'reachedUpload', label: 'Загрузка файлов' },
  { id: 'reachedMinimumSet', label: 'Минимальный набор счетов' },
  { id: 'reachedRecognition', label: 'AI-распознавание' },
  { id: 'reachedExtraction', label: 'AI-извлечение данных' },
  { id: 'reachedClassification', label: 'AI-классификация' },
  { id: 'reachedConfirmation', label: 'Подтверждение модели' },
  { id: 'reachedAnalysis', label: 'Анализ запущен' },
]

function buildFunnelSteps(rows: OnboardingFunnelEvent[]): FunnelStep[] {
  const counts = FUNNEL_STEPS.map(({ id, label }) => ({
    id: String(id),
    label,
    reached: rows.filter((r) => r[id] === true).length,
    dropOff: null as number | null,
  }))
  for (let i = 1; i < counts.length; i++) {
    const prev = counts[i - 1].reached
    const cur = counts[i].reached
    counts[i].dropOff = prev > 0 ? Math.max(0, 1 - cur / prev) : 0
  }
  return counts
}

interface ForkChoiceEntry {
  choice?: string
}

function buildForkAnalysis(rows: OnboardingFunnelEvent[]): ForkAnalysis {
  const byChoice: ForkAnalysis['byChoice'] = {
    upload_now: 0,
    upload_later: 0,
    continue_degraded: 0,
  }
  let recordsWithForkActivity = 0
  const pauseDistribution = { count0: 0, count1: 0, count2plus: 0 }
  for (const r of rows) {
    const choices = (r.forkChoices ?? []) as ForkChoiceEntry[]
    if (Array.isArray(choices) && choices.length > 0) {
      recordsWithForkActivity++
      for (const c of choices) {
        if (c?.choice && c.choice in byChoice) {
          byChoice[c.choice as keyof typeof byChoice]++
        }
      }
    }
    const pc = r.pauseCount ?? 0
    if (pc === 0) pauseDistribution.count0++
    else if (pc === 1) pauseDistribution.count1++
    else pauseDistribution.count2plus++
  }
  return {
    totalAttempts: rows.length,
    recordsWithForkActivity,
    byChoice,
    pauseDistribution,
  }
}

function buildModelDistribution(rows: OnboardingFunnelEvent[]): ModelDistributionRow[] {
  const finalCounts = new Map<string, { count: number; confidence: number; confSamples: number }>()
  for (const r of rows) {
    const model = (r.finalModel ?? r.initialAiModel ?? 'unknown') as string
    const entry = finalCounts.get(model) ?? { count: 0, confidence: 0, confSamples: 0 }
    entry.count++
    if (typeof r.finalConfidence === 'number') {
      entry.confidence += r.finalConfidence
      entry.confSamples++
    }
    finalCounts.set(model, entry)
  }
  const total = rows.length || 1
  return Array.from(finalCounts.entries())
    .map(([model, e]) => ({
      model,
      count: e.count,
      share: e.count / total,
      avgConfidence: e.confSamples > 0 ? e.confidence / e.confSamples : null,
    }))
    .sort((a, b) => b.count - a.count)
}

function buildOverridePairs(rows: OnboardingFunnelEvent[]): OverridePair[] {
  const pairs = new Map<string, number>()
  for (const r of rows) {
    if (r.userOverridden !== true) continue
    const fromAi = (r.initialAiModel ?? 'unknown') as string
    const toUser = (r.finalModel ?? 'unknown') as string
    if (fromAi === toUser) continue
    const key = `${fromAi}\u2192${toUser}`
    pairs.set(key, (pairs.get(key) ?? 0) + 1)
  }
  return Array.from(pairs.entries())
    .map(([key, count]) => {
      const [fromAi, toUser] = key.split('\u2192')
      return { fromAi, toUser, count }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function buildDurations(rows: OnboardingFunnelEvent[]): DurationsRow[] {
  const stages: { stage: string; field: keyof OnboardingFunnelEvent }[] = [
    { stage: 'до загрузки', field: 'durationToUpload' },
    { stage: 'загрузка', field: 'durationUpload' },
    { stage: 'распознавание', field: 'durationRecognition' },
    { stage: 'извлечение', field: 'durationExtraction' },
    { stage: 'классификация', field: 'durationClassification' },
    { stage: 'подтверждение', field: 'durationConfirmation' },
    { stage: 'анализ', field: 'durationAnalysis' },
    { stage: 'итого', field: 'durationTotal' },
  ]
  return stages.map(({ stage, field }) => {
    const values = rows
      .map((r) => r[field])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0)
    if (values.length === 0) {
      return { stage, p50: null, p95: null, p99: null, n: 0 }
    }
    values.sort((a, b) => a - b)
    return {
      stage,
      p50: percentile(values, 0.5),
      p95: percentile(values, 0.95),
      p99: percentile(values, 0.99),
      n: values.length,
    }
  })
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length))
  return sorted[idx]
}

function buildCohorts(rows: OnboardingFunnelEvent[]): CohortRow[] {
  const byDay = new Map<string, CohortRow>()
  for (const r of rows) {
    if (!r.startedAt) continue
    const day = String(r.startedAt).slice(0, 10)
    const cur = byDay.get(day) ?? {
      cohortDay: day,
      total: 0,
      byOutcome: { completed: 0, abandoned: 0, refused: 0, in_progress: 0 },
    }
    cur.total++
    const outcome = (r.outcome ?? 'in_progress') as keyof CohortRow['byOutcome']
    cur.byOutcome[outcome] = (cur.byOutcome[outcome] ?? 0) + 1
    byDay.set(day, cur)
  }
  return Array.from(byDay.values()).sort((a, b) => (a.cohortDay < b.cohortDay ? 1 : -1))
}
