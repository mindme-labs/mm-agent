'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
}

function formatMillions(n: number): string {
  return `₽ ${(n / 1_000_000).toFixed(1)} млн`
}

const HEALTH_CONFIG = {
  fine: { label: 'В норме', color: 'bg-green-100 text-green-700', dot: '🟢' },
  issues: { label: 'Есть вопросы', color: 'bg-yellow-100 text-yellow-700', dot: '🟡' },
  risky: { label: 'Риск', color: 'bg-red-100 text-red-700', dot: '🔴' },
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
}: FinancialSummaryProps) {
  const [expanded, setExpanded] = useState(false)
  const health = healthIndex ? HEALTH_CONFIG[healthIndex] : null

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="min-w-0 p-3">
          <div className="truncate text-xs text-slate-500">Выручка</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{formatMillions(revenue)}</div>
        </Card>
        <Card className="min-w-0 p-3">
          <div className="truncate text-xs text-slate-500">ДЗ</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{formatMillions(accountsReceivable)}</div>
        </Card>
        <Card className="min-w-0 p-3">
          <div className="truncate text-xs text-slate-500">КЗ</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{formatMillions(accountsPayable)}</div>
        </Card>
        <Card className="min-w-0 p-3">
          <div className="truncate text-xs text-slate-500">Рекомендаций</div>
          <div className="mt-1 text-lg font-bold text-indigo-600">{newCount}</div>
        </Card>
      </div>

      {health && (
        <div className="mt-3 flex items-center gap-2">
          <Badge className={health.color}>{health.dot} {health.label}</Badge>
          {period && <span className="text-xs text-slate-400">Данные за {period}</span>}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 lg:hidden"
      >
        {expanded ? 'Скрыть' : 'Подробнее'}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      <div className={`mt-3 grid grid-cols-1 gap-3 md:grid-cols-3 ${expanded ? '' : 'hidden'} lg:grid`}>
        {grossMargin != null && (
          <Card className="p-3">
            <div className="text-xs text-slate-500">Валовая рентабельность</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{grossMargin.toFixed(1)}%</div>
          </Card>
        )}
        {arTurnoverDays != null && (
          <Card className="p-3">
            <div className="text-xs text-slate-500">Оборачиваемость ДЗ</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{arTurnoverDays} дн.</div>
          </Card>
        )}
        {apTurnoverDays != null && (
          <Card className="p-3">
            <div className="text-xs text-slate-500">Оборачиваемость КЗ</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{apTurnoverDays} дн.</div>
          </Card>
        )}
      </div>
    </div>
  )
}
