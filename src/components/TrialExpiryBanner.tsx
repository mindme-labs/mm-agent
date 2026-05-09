'use client'

import Link from 'next/link'

/**
 * Shown on every page in the app shell when the user is on the trial plan.
 * Two modes:
 *   - `expired`        : trial finished. Persistent red banner; can't be
 *                         dismissed. Upgrade is the only path forward.
 *   - `daysLeft <= 3`  : warning. Same visual, copy switches to "ends in N
 *                         days". Nudges the user without blocking work.
 *
 * Props are mutually exclusive at the call site — pass `expired` for the
 * post-expiry case, `daysLeft` for the pre-expiry warning.
 */
interface TrialExpiryBannerProps {
  daysLeft?: number
  expired?: boolean
}

export function TrialExpiryBanner({ daysLeft, expired }: TrialExpiryBannerProps) {
  if (expired) {
    return (
      <div
        className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-3 text-sm"
        style={{
          background: 'var(--mm-red-bg)',
          borderColor: 'rgba(192,57,43,.12)',
          color: 'var(--mm-red)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: 'var(--mm-red)' }}
          />
          <span className="font-semibold">
            Триал завершён — для продолжения работы необходим полный тариф
          </span>
        </div>
        <Link
          href="/app/upgrade"
          className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold transition-colors hover:opacity-80"
          style={{ background: 'var(--mm-red)', color: '#fff' }}
        >
          Подключить
        </Link>
      </div>
    )
  }

  if (daysLeft === undefined) return null
  const label = daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'

  return (
    <div
      className="mb-5 flex items-center justify-between rounded-xl border px-5 py-3 text-sm"
      style={{
        background: 'var(--mm-red-bg)',
        borderColor: 'rgba(192,57,43,.12)',
        color: 'var(--mm-red)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: 'var(--mm-red)' }}
        />
        <span className="font-semibold">
          Триал заканчивается через {daysLeft} {label}
        </span>
      </div>
      <Link
        href="/app/upgrade"
        className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold transition-colors hover:opacity-80"
        style={{ background: 'var(--mm-red)', color: '#fff' }}
      >
        Подробнее
      </Link>
    </div>
  )
}
