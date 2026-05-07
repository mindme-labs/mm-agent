'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Drives the post-confirmation half of the onboarding pipeline:
 *   1. POST /api/analysis/run — runs metrics + rules engine, upgrades the
 *      classification draft into a full analysis-results record.
 *   2. Loops POST /api/analysis/ai-enhance-batch until all eligible
 *      candidates are AI-enhanced (or the batch returns done/no-progress).
 *   3. POST /api/onboarding/complete — sets hasCompletedOnboarding=true.
 *   4. Redirects to /app/inbox.
 *
 * Rendered by /app/onboarding/page.tsx whenever `wizardState` is in
 * { 'analyzing', 'enhancing' }. Idempotent — relies on the wizardState
 * gate on /api/analysis/run + /api/onboarding/complete to avoid double-runs
 * if the user reloads the page mid-flight.
 */

const STAGES = [
  { id: 'rules', label: 'Расчёт метрик и проверка правил' },
  { id: 'enhancing', label: 'AI: формирование рекомендаций' },
  { id: 'complete', label: 'Готово' },
] as const

interface AnalysisStatus {
  total: number
  enhanced: number
  remaining: number
  failed: number
  done?: boolean
}

async function safeFetch(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { credentials: 'include', ...init })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data }
  } catch (err) {
    return { ok: false, data: { error: err instanceof Error ? err.message : 'Сетевая ошибка' } }
  }
}

export default function AnalyzingProgress() {
  const router = useRouter()
  const [stageIdx, setStageIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [recommendationCount, setRecommendationCount] = useState(0)
  const [enhancedCount, setEnhancedCount] = useState(0)
  const running = useRef(false)

  useEffect(() => {
    if (running.current) return
    running.current = true

    const run = async () => {
      // Stage 1: rules engine.
      setStageIdx(0)
      const runRes = await safeFetch('/api/analysis/run', { method: 'POST' })
      if (!runRes.ok) {
        setError((runRes.data.error as string) || 'Ошибка анализа')
        return
      }
      const total = (runRes.data.total as number) ?? (runRes.data.recommendationCount as number) ?? 0
      setRecommendationCount(total)

      // Stage 2: AI enhancement loop.
      setStageIdx(1)
      for (let attempt = 0; attempt < 30; attempt++) {
        const batch = await safeFetch('/api/analysis/ai-enhance-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (!batch.ok) break

        const status = await safeFetch('/api/analysis/status')
        if (status.ok) {
          const s = status.data as unknown as AnalysisStatus
          setEnhancedCount(s.enhanced ?? 0)
        }

        if (batch.data.done) break
        const processed = (batch.data.processed as number) ?? 0
        const failed = (batch.data.failed as number) ?? 0
        if (processed === 0 && failed === 0) break
        await new Promise((r) => setTimeout(r, 300))
      }

      // Stage 3: finalize.
      setStageIdx(2)
      const completeRes = await safeFetch('/api/onboarding/complete', { method: 'POST' })
      if (!completeRes.ok) {
        setError((completeRes.data.error as string) || 'Не удалось завершить онбординг')
        return
      }

      // Brief pause so the user sees "Готово", then jump to inbox.
      await new Promise((r) => setTimeout(r, 600))
      router.push('/app/inbox')
    }

    void run()
  }, [router])

  const progress = Math.round(((stageIdx + 1) / STAGES.length) * 100)

  return (
    <div className="min-h-dvh px-5 py-12" style={{ background: 'var(--mm-bg)' }}>
      <div className="mx-auto w-full max-w-md text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: 'var(--mm-green-bg)',
            border: '2px solid rgba(15,123,92,.18)',
            animation: 'mmPulse 2s ease-in-out infinite',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
              stroke="var(--mm-green)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="mb-1.5 text-xl font-extrabold md:text-2xl" style={{ color: 'var(--mm-ink)' }}>
          {stageIdx === 2 ? 'Готово' : 'Запускаем анализ'}
        </h1>
        <p className="mb-7 text-sm" style={{ color: 'var(--mm-muted)' }}>
          {stageIdx === 2
            ? `Найдено ${recommendationCount} ${pluralize(recommendationCount, 'рекомендация', 'рекомендации', 'рекомендаций')}.`
            : 'Около минуты. Не закрывайте страницу.'}
        </p>

        <div
          className="mb-6 h-1 w-full overflow-hidden rounded-full"
          style={{ background: 'var(--mm-border)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'var(--mm-green)' }}
          />
        </div>

        <div className="flex flex-col gap-1.5 text-left">
          {STAGES.map((s, i) => {
            const isDone = i < stageIdx
            const isOn = i === stageIdx
            const label = isOn && i === 1 && recommendationCount > 0
              ? `${s.label} · ${enhancedCount} из ${recommendationCount}`
              : s.label
            return (
              <div
                key={s.id}
                className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-all"
                style={{
                  background: isDone ? 'var(--mm-green-bg)' : isOn ? 'var(--mm-white)' : 'transparent',
                  border: isOn ? '1px solid var(--mm-border)' : '1px solid transparent',
                  opacity: !isDone && !isOn ? 0.3 : 1,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: isDone ? 'var(--mm-green)' : 'var(--mm-bg)',
                      border: `1px solid ${isDone ? 'var(--mm-green)' : 'var(--mm-border)'}`,
                    }}
                  >
                    {isDone && (
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: isDone || isOn ? 'var(--mm-ink)' : 'var(--mm-muted)' }}
                  >
                    {label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div
            className="mt-4 rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: 'var(--mm-red-bg)', color: 'var(--mm-red)' }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}
