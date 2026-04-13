'use client'

interface FinancialSummaryProps {
  revenue: number
  accountsReceivable: number
  accountsPayable: number
  newCount: number
  grossMargin?: number
  arTurnoverDays?: number
  apTurnoverDays?: number
  healthIndex?: 'fine' | 'issues' | 'risky'
  period?: string
  trialDaysLeft?: number
  trialEndsAt?: string
}

function fmtMln(n: number): string {
  if (n >= 1_000_000) return `₽${(n / 1_000_000).toFixed(1)} млн`
  if (n >= 1_000) return `₽${Math.round(n / 1_000)} тыс.`
  return `₽${n}`
}

const HEALTH_CONFIG = {
  fine: { label: 'В норме', color: 'var(--mm-green)', bg: 'var(--mm-green-bg)' },
  issues: { label: 'Есть вопросы', color: 'var(--mm-amber)', bg: 'var(--mm-amber-bg)' },
  risky: { label: 'Высокий риск', color: 'var(--mm-red)', bg: 'var(--mm-red-bg)' },
}

export function FinancialSummaryPanel({
  revenue,
  accountsReceivable,
  accountsPayable,
  grossMargin,
  arTurnoverDays,
  apTurnoverDays,
  healthIndex,
  period,
  trialDaysLeft,
  trialEndsAt,
}: FinancialSummaryProps) {
  const health = healthIndex ? HEALTH_CONFIG[healthIndex] : null

  return (
    <div className="mb-7">
      {trialDaysLeft != null && (
        <div className="mb-6 flex items-center justify-between rounded-xl px-5 py-3 text-sm"
          style={{ background: 'var(--mm-green-bg)', color: 'var(--mm-green)' }}>
          <span>Триал-доступ · осталось <b className="font-bold">{trialDaysLeft} {trialDaysLeft === 1 ? 'день' : trialDaysLeft < 5 ? 'дня' : 'дней'}</b></span>
          {trialEndsAt && (
            <span className="rounded-md border px-3 py-1 text-xs font-semibold"
              style={{ background: 'var(--mm-white)', borderColor: 'rgba(15,123,92,.12)' }}>
              до {trialEndsAt}
            </span>
          )}
        </div>
      )}

      {/* Primary metrics — 3 large cards */}
      <div className="mb-3 grid grid-cols-3 gap-3">
        <div className="rounded-xl border px-5 py-5"
          style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
          <div className="mb-1.5 text-xs font-medium" style={{ color: 'var(--mm-muted)' }}>
            {period ? `Выручка за ${period}` : 'Выручка'}
          </div>
          <div className="text-2xl font-extrabold leading-none tracking-tight lg:text-[28px]"
            style={{ color: 'var(--mm-ink)', letterSpacing: '-.03em' }}>
            {fmtMln(revenue)}
          </div>
        </div>
        <div className="rounded-xl border px-5 py-5"
          style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
          <div className="mb-1.5 text-xs font-medium" style={{ color: 'var(--mm-muted)' }}>Вам должны</div>
          <div className="text-2xl font-extrabold leading-none tracking-tight lg:text-[28px]"
            style={{ color: 'var(--mm-red)', letterSpacing: '-.03em' }}>
            {fmtMln(accountsReceivable)}
          </div>
        </div>
        <div className="rounded-xl border px-5 py-5"
          style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
          <div className="mb-1.5 text-xs font-medium" style={{ color: 'var(--mm-muted)' }}>Вы должны</div>
          <div className="text-2xl font-extrabold leading-none tracking-tight lg:text-[28px]"
            style={{ color: 'var(--mm-ink)', letterSpacing: '-.03em' }}>
            {fmtMln(accountsPayable)}
          </div>
        </div>
      </div>

      {/* Secondary metrics — smaller cards */}
      {(arTurnoverDays != null || grossMargin != null) && (
        <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {arTurnoverDays != null && apTurnoverDays != null && (
            <div className="rounded-xl border px-5 py-4"
              style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
              <div className="mb-1 text-xs font-medium" style={{ color: 'var(--mm-muted)' }}>Оборач. ДЗ / КЗ</div>
              <div className="text-lg font-bold leading-none" style={{ color: 'var(--mm-ink)' }}>
                {arTurnoverDays} / {apTurnoverDays} дн.
              </div>
            </div>
          )}
          {grossMargin != null && (
            <div className="rounded-xl border px-5 py-4"
              style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
              <div className="mb-1 text-xs font-medium" style={{ color: 'var(--mm-muted)' }}>Рентабельность</div>
              <div className="text-lg font-bold leading-none" style={{ color: 'var(--mm-ink)' }}>
                {grossMargin.toFixed(1)}%
              </div>
              {health && (
                <div className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: health.bg, color: health.color }}>
                  {health.label}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
