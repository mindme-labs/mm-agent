'use client'

import Link from 'next/link'

interface TasksSummaryBannerProps {
  inProgressCount: number
  inProgressAmount: number
  overdueCount: number
  overdueAmount: number
}

function fmtAmount(n: number): string {
  if (n >= 1_000_000) return `₽${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₽${Math.round(n / 1_000)}K`
  if (n > 0) return `₽${n}`
  return ''
}

export function TasksSummaryBanner({ inProgressCount, inProgressAmount, overdueCount, overdueAmount }: TasksSummaryBannerProps) {
  const hasOverdue = overdueCount > 0

  return (
    <div className="mb-6">
      <Link href="/app/tasks" className="block">
        <div className="flex flex-col gap-2 rounded-xl border px-5 py-4 transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
          style={{
            background: hasOverdue ? 'var(--mm-red-bg)' : 'var(--mm-white)',
            borderColor: hasOverdue ? 'rgba(192,57,43,.15)' : 'var(--mm-border)',
          }}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold" style={{ color: 'var(--mm-ink)' }}>
              В работе {inProgressCount} {inProgressCount === 1 ? 'задача' : inProgressCount < 5 ? 'задачи' : 'задач'}
              {inProgressAmount > 0 && ` на ${fmtAmount(inProgressAmount)}`}
            </span>
            {hasOverdue && (
              <>
                <span style={{ color: 'var(--mm-border)' }}>·</span>
                <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--mm-red)' }}>
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--mm-red)' }} />
                  Просрочено {overdueCount} на {fmtAmount(overdueAmount)}
                </span>
              </>
            )}
          </div>
          <span className="shrink-0 text-xs font-semibold" style={{ color: 'var(--mm-green)' }}>
            Перейти к задачам →
          </span>
        </div>
      </Link>
    </div>
  )
}
