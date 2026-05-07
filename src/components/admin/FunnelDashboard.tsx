'use client'

import { useCallback, useEffect, useState } from 'react'
import { MODELS, type BusinessModel } from '@/lib/classification/matrix'

/**
 * Admin onboarding funnel dashboard. Pure client component, single fetch
 * to /api/admin/funnel/overview, renders 6 visualization blocks. No
 * recharts dep — all charts are hand-rolled SVG/CSS.
 *
 * The same filter bar drives all 6 blocks. Refetches on filter change with
 * 60s server-side cache.
 */

interface FunnelStep {
  id: string
  label: string
  reached: number
  dropOff: number | null
}

interface ForkAnalysis {
  totalAttempts: number
  recordsWithForkActivity: number
  byChoice: { upload_now: number; upload_later: number; continue_degraded: number }
  pauseDistribution: { count0: number; count1: number; count2plus: number }
}

interface ModelDistributionRow {
  model: string
  count: number
  share: number
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
  n: number
}

interface CohortRow {
  cohortDay: string
  total: number
  byOutcome: Record<'completed' | 'abandoned' | 'refused' | 'in_progress', number>
}

interface OverviewResponse {
  period: { from: string | null; to: string | null }
  totals: { records: number; completed: number; abandoned: number; refused: number; inProgress: number }
  funnelSteps: FunnelStep[]
  forkAnalysis: ForkAnalysis
  models: ModelDistributionRow[]
  overridePairs: OverridePair[]
  durations: DurationsRow[]
  cohorts: CohortRow[]
}

interface UserDropoutRow {
  userId: string
  email: string
  attemptNumber: number
  outcome: string | null
  startedAt: string | null
  updatedAt: string | null
  finalModel: string | null
  filesUploaded: number
  missingRequiredAccounts: string[]
  classificationAttempts: number
}

const PERIODS: { id: string; label: string }[] = [
  { id: 'today', label: 'Сегодня' },
  { id: '7d', label: '7 дней' },
  { id: '30d', label: '30 дней' },
]

const STATUSES: { id: string; label: string }[] = [
  { id: '', label: 'Все статусы' },
  { id: 'success', label: 'Успешно' },
  { id: 'degraded', label: 'Degraded' },
  { id: 'refused_manual', label: 'Refused' },
  { id: 'disabled', label: 'Disabled' },
]

export default function FunnelDashboard() {
  const [period, setPeriod] = useState('30d')
  const [classificationStatus, setClassificationStatus] = useState('')
  const [completedOnly, setCompletedOnly] = useState(false)
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drillStep, setDrillStep] = useState<string | null>(null)
  const [drillRows, setDrillRows] = useState<UserDropoutRow[] | null>(null)
  const [drillLoading, setDrillLoading] = useState(false)

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('period', period)
      if (classificationStatus) params.set('classificationStatus', classificationStatus)
      if (completedOnly) params.set('completedOnly', 'true')
      const res = await fetch(`/api/admin/funnel/overview?${params.toString()}`, {
        credentials: 'include',
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body?.error || 'Ошибка загрузки')
        setData(null)
        return
      }
      setData(body as OverviewResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Сетевая ошибка')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [period, classificationStatus, completedOnly])

  useEffect(() => {
    void fetchOverview()
  }, [fetchOverview])

  const openDrill = async (stepId: string) => {
    setDrillStep(stepId)
    setDrillLoading(true)
    setDrillRows(null)
    try {
      // The reachedXxx flag id arrives prefixed; strip the "reached" prefix.
      const stepKey = stepId.replace(/^reached/, '')
      const camel = stepKey.charAt(0).toLowerCase() + stepKey.slice(1)
      const params = new URLSearchParams({ step: camel, completed: 'false', limit: '100' })
      const res = await fetch(`/api/admin/funnel/users?${params}`, { credentials: 'include' })
      const body = await res.json()
      if (res.ok) setDrillRows(body.rows ?? [])
    } finally {
      setDrillLoading(false)
    }
  }

  const closeDrill = () => {
    setDrillStep(null)
    setDrillRows(null)
  }

  const downloadCsv = () => {
    const params = new URLSearchParams({ period })
    if (classificationStatus) params.set('classificationStatus', classificationStatus)
    window.location.href = `/api/admin/funnel/export?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--mm-ink)' }}>
            Воронка онбординга
          </h1>
          <p className="text-sm" style={{ color: 'var(--mm-muted)' }}>
            {data
              ? `${data.totals.records} попыток · ${data.totals.completed} завершены · ${data.totals.abandoned} брошены · ${data.totals.refused} отказ`
              : 'Загрузка…'}
          </p>
        </div>
        <button
          onClick={downloadCsv}
          className="rounded-lg border px-3 py-2 text-sm font-semibold"
          style={{
            background: 'var(--mm-white)',
            borderColor: 'var(--mm-border)',
            color: 'var(--mm-ink)',
          }}
        >
          Экспорт CSV
        </button>
      </header>

      <FilterBar
        period={period}
        setPeriod={setPeriod}
        classificationStatus={classificationStatus}
        setClassificationStatus={setClassificationStatus}
        completedOnly={completedOnly}
        setCompletedOnly={setCompletedOnly}
      />

      {error && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--mm-red-bg)', color: 'var(--mm-red)' }}
        >
          {error}
        </div>
      )}

      {loading && !data && <div style={{ color: 'var(--mm-muted)' }}>Загрузка…</div>}

      {data && (
        <>
          <Block title="1. Воронка шагов" subtitle="Кликните по строке, чтобы увидеть, кто остановился">
            <FunnelChart steps={data.funnelSteps} onClick={openDrill} />
          </Block>

          <Block title="2. Развилка и паузы">
            <ForkAnalysisCards data={data.forkAnalysis} />
          </Block>

          <Block title="3. Распределение моделей">
            <ModelDistribution rows={data.models} />
          </Block>

          <Block title="4. Override-пары" subtitle="Топ-10 случаев «AI определил X → пользователь поменял на Y»">
            <OverridePairsTable pairs={data.overridePairs} />
          </Block>

          <Block title="5. Времена этапов" subtitle="p50 / p95 / p99 в миллисекундах">
            <DurationsTable rows={data.durations} />
          </Block>

          <Block title="6. Когорты по дням">
            <CohortRetention rows={data.cohorts} />
          </Block>
        </>
      )}

      {drillStep && (
        <UserDropoutModal
          step={drillStep}
          loading={drillLoading}
          rows={drillRows}
          onClose={closeDrill}
        />
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Layout primitives

function Block({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl border p-5"
      style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}
    >
      <div className="mb-4">
        <h2 className="text-base font-bold" style={{ color: 'var(--mm-ink)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs" style={{ color: 'var(--mm-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

function FilterBar({
  period,
  setPeriod,
  classificationStatus,
  setClassificationStatus,
  completedOnly,
  setCompletedOnly,
}: {
  period: string
  setPeriod: (v: string) => void
  classificationStatus: string
  setClassificationStatus: (v: string) => void
  completedOnly: boolean
  setCompletedOnly: (v: boolean) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
      style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold" style={{ color: 'var(--mm-muted)' }}>Период:</span>
        <div className="flex rounded-lg border" style={{ borderColor: 'var(--mm-border)' }}>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="px-3 py-1 text-xs font-semibold first:rounded-l-lg last:rounded-r-lg"
              style={{
                background: period === p.id ? 'var(--mm-green)' : 'var(--mm-white)',
                color: period === p.id ? '#fff' : 'var(--mm-ink2)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold" style={{ color: 'var(--mm-muted)' }}>Статус:</span>
        <select
          value={classificationStatus}
          onChange={(e) => setClassificationStatus(e.target.value)}
          className="rounded-lg border px-2 py-1 text-xs"
          style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)', color: 'var(--mm-ink)' }}
        >
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--mm-ink2)' }}>
        <input
          type="checkbox"
          checked={completedOnly}
          onChange={(e) => setCompletedOnly(e.target.checked)}
        />
        Только завершённые
      </label>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Block components

function FunnelChart({
  steps,
  onClick,
}: {
  steps: FunnelStep[]
  onClick: (stepId: string) => void
}) {
  const max = Math.max(1, ...steps.map((s) => s.reached))
  return (
    <div className="space-y-1.5">
      {steps.map((s) => {
        const widthPct = max > 0 ? (s.reached / max) * 100 : 0
        return (
          <button
            key={s.id}
            onClick={() => onClick(s.id)}
            className="block w-full rounded-md text-left transition-colors hover:bg-[var(--mm-bg)]"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold" style={{ color: 'var(--mm-ink)' }}>{s.label}</span>
              <span style={{ color: 'var(--mm-muted)' }}>
                {s.reached.toLocaleString('ru-RU')}
                {s.dropOff !== null && s.dropOff > 0 && (
                  <span style={{ color: 'var(--mm-red)' }}>
                    {' '}↓ {Math.round(s.dropOff * 100)}%
                  </span>
                )}
              </span>
            </div>
            <div
              className="mt-0.5 h-2 rounded-full"
              style={{ background: 'var(--mm-bg)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${widthPct}%`, background: 'var(--mm-green)' }}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ForkAnalysisCards({ data }: { data: ForkAnalysis }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Всего попыток" value={data.totalAttempts.toLocaleString('ru-RU')} />
      <Stat label="С развилкой" value={data.recordsWithForkActivity.toLocaleString('ru-RU')} />
      <Stat label="Загрузить сейчас" value={data.byChoice.upload_now.toLocaleString('ru-RU')} />
      <Stat label="Загрузить позже" value={data.byChoice.upload_later.toLocaleString('ru-RU')} />
      <Stat label="Без дозагрузки" value={data.byChoice.continue_degraded.toLocaleString('ru-RU')} />
      <Stat label="Без пауз" value={data.pauseDistribution.count0.toLocaleString('ru-RU')} />
      <Stat label="1 пауза" value={data.pauseDistribution.count1.toLocaleString('ru-RU')} />
      <Stat label="2+ пауз" value={data.pauseDistribution.count2plus.toLocaleString('ru-RU')} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg border px-3 py-2.5"
      style={{ background: 'var(--mm-bg)', borderColor: 'var(--mm-border)' }}
    >
      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--mm-muted)' }}>
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold" style={{ color: 'var(--mm-ink)' }}>
        {value}
      </div>
    </div>
  )
}

function ModelDistribution({ rows }: { rows: ModelDistributionRow[] }) {
  if (rows.length === 0) {
    return <div style={{ color: 'var(--mm-muted)' }}>Нет данных</div>
  }
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const def = MODELS[r.model as BusinessModel]
        const label = def?.name ?? r.model
        const widthPct = (r.count / max) * 100
        return (
          <div key={r.model}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold" style={{ color: 'var(--mm-ink)' }}>
                {label}
              </span>
              <span style={{ color: 'var(--mm-muted)' }}>
                {r.count} · {Math.round(r.share * 100)}%
                {r.avgConfidence !== null && (
                  <span> · ср. {Math.round(r.avgConfidence * 100)}%</span>
                )}
              </span>
            </div>
            <div className="mt-0.5 h-2 rounded-full" style={{ background: 'var(--mm-bg)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${widthPct}%`, background: 'var(--mm-green)' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OverridePairsTable({ pairs }: { pairs: OverridePair[] }) {
  if (pairs.length === 0) {
    return <div style={{ color: 'var(--mm-muted)' }}>Нет override</div>
  }
  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--mm-border)' }}>
      <table className="w-full text-sm">
        <thead style={{ background: 'var(--mm-bg)' }}>
          <tr>
            <Th>AI определил</Th>
            <Th>Юзер выбрал</Th>
            <Th align="right">Случаев</Th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((p, i) => (
            <tr key={i} className="border-t" style={{ borderColor: 'var(--mm-border)' }}>
              <Td>{modelLabel(p.fromAi)}</Td>
              <Td>{modelLabel(p.toUser)}</Td>
              <Td align="right" mono>
                {p.count}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DurationsTable({ rows }: { rows: DurationsRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--mm-border)' }}>
      <table className="w-full text-sm">
        <thead style={{ background: 'var(--mm-bg)' }}>
          <tr>
            <Th>Этап</Th>
            <Th align="right">p50</Th>
            <Th align="right">p95</Th>
            <Th align="right">p99</Th>
            <Th align="right">N</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.stage} className="border-t" style={{ borderColor: 'var(--mm-border)' }}>
              <Td>{r.stage}</Td>
              <Td align="right" mono>{formatMs(r.p50)}</Td>
              <Td align="right" mono>{formatMs(r.p95)}</Td>
              <Td align="right" mono>{formatMs(r.p99)}</Td>
              <Td align="right" mono>{r.n}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CohortRetention({ rows }: { rows: CohortRow[] }) {
  if (rows.length === 0) {
    return <div style={{ color: 'var(--mm-muted)' }}>Нет данных за период</div>
  }
  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--mm-border)' }}>
      <table className="w-full text-sm">
        <thead style={{ background: 'var(--mm-bg)' }}>
          <tr>
            <Th>День</Th>
            <Th align="right">Всего</Th>
            <Th align="right">Завершён</Th>
            <Th align="right">Брошен</Th>
            <Th align="right">Отказ</Th>
            <Th align="right">В процессе</Th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 30).map((r) => (
            <tr key={r.cohortDay} className="border-t" style={{ borderColor: 'var(--mm-border)' }}>
              <Td mono>{r.cohortDay}</Td>
              <Td align="right" mono>{r.total}</Td>
              <Td align="right" mono>
                <span style={{ color: 'var(--mm-green)' }}>{r.byOutcome.completed}</span>
              </Td>
              <Td align="right" mono>
                <span style={{ color: 'var(--mm-amber)' }}>{r.byOutcome.abandoned}</span>
              </Td>
              <Td align="right" mono>
                <span style={{ color: 'var(--mm-red)' }}>{r.byOutcome.refused}</span>
              </Td>
              <Td align="right" mono>{r.byOutcome.in_progress}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UserDropoutModal({
  step,
  loading,
  rows,
  onClose,
}: {
  step: string
  loading: boolean
  rows: UserDropoutRow[] | null
  onClose: () => void
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,.4)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-2xl border p-5"
        style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: 'var(--mm-ink)' }}>
            Дропнулись на шаге: {step.replace(/^reached/, '')}
          </h3>
          <button
            onClick={onClose}
            className="text-xl"
            style={{ color: 'var(--mm-muted)', background: 'none', border: 'none' }}
          >
            ×
          </button>
        </div>
        {loading && <div style={{ color: 'var(--mm-muted)' }}>Загрузка…</div>}
        {rows && rows.length === 0 && (
          <div style={{ color: 'var(--mm-muted)' }}>Нет дроп-офов на этом шаге.</div>
        )}
        {rows && rows.length > 0 && (
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--mm-border)' }}>
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--mm-bg)' }}>
                <tr>
                  <Th>Email</Th>
                  <Th align="right">Попытка</Th>
                  <Th>Outcome</Th>
                  <Th align="right">Файлов</Th>
                  <Th>Не хватает</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={`${r.userId}-${r.attemptNumber}`}
                    className="border-t"
                    style={{ borderColor: 'var(--mm-border)' }}
                  >
                    <Td mono>{r.email || r.userId}</Td>
                    <Td align="right" mono>{r.attemptNumber}</Td>
                    <Td>{r.outcome ?? '—'}</Td>
                    <Td align="right" mono>{r.filesUploaded}</Td>
                    <Td>
                      {r.missingRequiredAccounts.length > 0
                        ? r.missingRequiredAccounts.join(', ')
                        : '—'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Tiny table cell components

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      className="px-3 py-2 text-xs font-semibold"
      style={{ color: 'var(--mm-muted)', textAlign: align }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align = 'left',
  mono = false,
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
  mono?: boolean
}) {
  return (
    <td
      className="px-3 py-2"
      style={{
        color: 'var(--mm-ink)',
        textAlign: align,
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, monospace' : 'inherit',
        fontSize: 13,
      }}
    >
      {children}
    </td>
  )
}

// -----------------------------------------------------------------------------
// Helpers

function formatMs(value: number | null): string {
  if (value === null) return '—'
  if (value < 1000) return `${value} мс`
  if (value < 60_000) return `${(value / 1000).toFixed(1)} с`
  if (value < 3_600_000) return `${Math.round(value / 60_000)} мин`
  return `${(value / 3_600_000).toFixed(1)} ч`
}

function modelLabel(value: string): string {
  const def = MODELS[value as BusinessModel]
  return def?.name ?? value
}
