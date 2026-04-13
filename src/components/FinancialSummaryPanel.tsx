'use client'

import { useState } from 'react'

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
  return `₽${(n / 1_000_000).toFixed(1)} млн`
}

const HEALTH_CONFIG = {
  fine: { label: 'В норме', style: { color: 'var(--mm-green)', background: 'var(--mm-green-bg)' } },
  issues: { label: 'Есть вопросы', style: { color: 'var(--mm-amber)', background: 'var(--mm-amber-bg)' } },
  risky: { label: 'Высокий риск', style: { color: 'var(--mm-red)', background: 'var(--mm-red-bg)' } },
}

export function FinancialSummaryPanel({
  revenue,
  accountsReceivable,
  accountsPayable,
  newCount,
  grossMargin,
  arTurnoverDays,
  apTurnoverDays,
  healthIndex,
  period,
  trialDaysLeft,
  trialEndsAt,
}: FinancialSummaryProps) {
  const [expanded, setExpanded] = useState(false)
  const health = healthIndex ? HEALTH_CONFIG[healthIndex] : null

  return (
    <div className="mb-7">
      {/* Trial strip */}
      {trialDaysLeft != null && (
        <div className="mb-8 flex items-center justify-between rounded-xl px-5 py-3 text-sm"
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

      {/* Summary row — large numbers */}
      <div className="mb-7 flex flex-wrap items-baseline gap-y-4 border-b pb-7"
        style={{ borderColor: 'var(--mm-border)' }}>
        <div className="mr-12">
          <div className="mb-1 text-sm font-medium" style={{ color: 'var(--mm-muted)' }}>
            {period ? `Выручка за ${period}` : 'Выручка'}
          </div>
          <div className="text-[34px] font-extrabold leading-none tracking-tight" style={{ color: 'var(--mm-ink)', letterSpacing: '-.03em' }}>
            {fmtMln(revenue)}
          </div>
        </div>
        <div className="mr-12">
          <div className="mb-1 text-sm font-medium" style={{ color: 'var(--mm-muted)' }}>Вам должны</div>
          <div className="text-[34px] font-extrabold leading-none tracking-tight"
            style={{ color: 'var(--mm-red)', letterSpacing: '-.03em' }}>
            {fmtMln(accountsReceivable)}
          </div>
        </div>
        <div className="mr-12">
          <div className="mb-1 text-sm font-medium" style={{ color: 'var(--mm-muted)' }}>Вы должны</div>
          <div className="text-[34px] font-extrabold leading-none tracking-tight" style={{ color: 'var(--mm-ink)', letterSpacing: '-.03em' }}>
            {fmtMln(accountsPayable)}
          </div>
        </div>

        <div className="ml-auto flex gap-8">
          {(arTurnoverDays != null && apTurnoverDays != null) && (
            <div className="text-right">
              <div className="mb-1 text-sm font-medium" style={{ color: 'var(--mm-muted)' }}>Оборач. ДЗ / КЗ</div>
              <div className="text-xl font-bold" style={{ color: 'var(--mm-ink)' }}>
                {arTurnoverDays} / {apTurnoverDays} дн.
              </div>
            </div>
          )}
          {grossMargin != null && (
            <div className="text-right">
              <div className="mb-1 text-sm font-medium" style={{ color: 'var(--mm-muted)' }}>Рентабельность</div>
              <div className="text-xl font-bold" style={{ color: 'var(--mm-ink)' }}>
                {grossMargin.toFixed(1)}%
              </div>
              {health && (
                <div className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={health.style}>
                  {health.label}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile expandable details */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mb-4 flex items-center gap-1 text-xs font-semibold lg:hidden"
          style={{ color: 'var(--mm-green)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          Подробнее ↓
        </button>
      )}
    </div>
  )
}
