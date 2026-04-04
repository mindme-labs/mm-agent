'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowDown, ArrowUp, Lightbulb, Bot } from 'lucide-react'
import { CopyDraftButton } from './CopyDraftButton'
import { FeedbackSection } from './FeedbackSection'
import { formatAmountShort } from '@/lib/rules/templates'

interface Recommendation {
  id: string
  ruleCode: string
  ruleName: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  shortRecommendation?: string
  fullText?: string
  status: string
  impactMetric?: string
  impactDirection?: string
  impactAmount?: number
  isAiGenerated?: boolean
  isDemo?: boolean
}

interface RecommendationCardProps {
  recommendation: Recommendation
  showActions?: boolean
  onStatusChange?: (id: string, status: string) => void
}

const PRIORITY_CONFIG = {
  critical: { label: 'Критично', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'Высокий', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Средний', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Низкий', className: 'bg-slate-100 text-slate-600 border-slate-200' },
}

const IMPACT_LABELS: Record<string, string> = {
  accounts_receivable: 'Дебиторская задолженность',
  accounts_payable: 'Кредиторская задолженность',
  inventory: 'Запасы',
  revenue: 'Выручка',
  strategic: 'Стратегическое',
}

export function RecommendationCard({ recommendation: rec, showActions = true, onStatusChange }: RecommendationCardProps) {
  const [dismissed, setDismissed] = useState(false)
  const priority = PRIORITY_CONFIG[rec.priority]

  if (dismissed) return null

  const handleAction = async (newStatus: string) => {
    try {
      await fetch(`/api/recommendations/${rec.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (newStatus === 'dismissed') setDismissed(true)
      onStatusChange?.(rec.id, newStatus)
    } catch (err) {
      console.error('Status change failed:', err)
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge className={priority.className}>{priority.label}</Badge>
          <span className="text-xs font-medium text-slate-400">{rec.ruleCode}</span>
          {rec.isAiGenerated && (
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
              <Bot className="mr-1 h-3 w-3" /> AI-аудит
            </Badge>
          )}
        </div>

        <div className="mb-1 text-xs font-medium text-slate-400">{rec.ruleName}</div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{rec.title}</h3>

        {rec.impactAmount != null && rec.impactAmount > 0 && rec.impactMetric && (
          <div className="mb-2 flex items-center gap-1 text-xs text-slate-500">
            {rec.impactDirection === 'decrease' ? (
              <ArrowDown className="h-3 w-3 text-red-500" />
            ) : (
              <ArrowUp className="h-3 w-3 text-green-500" />
            )}
            {IMPACT_LABELS[rec.impactMetric] ?? rec.impactMetric} −{formatAmountShort(rec.impactAmount)}
          </div>
        )}

        <p className="mb-3 text-sm text-slate-600">{rec.description}</p>

        {rec.shortRecommendation && (
          <div className="mb-3 flex gap-2 rounded-lg bg-indigo-50 p-2.5 text-sm text-indigo-800">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
            <span>{rec.shortRecommendation}</span>
          </div>
        )}

        {showActions && (
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              onClick={() => handleAction('in_progress')}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Взять в работу
            </Button>
            <Button
              onClick={() => handleAction('dismissed')}
              size="sm"
              variant="outline"
            >
              Отклонить
            </Button>
          </div>
        )}

        {rec.fullText && <CopyDraftButton text={rec.fullText} />}

        <FeedbackSection recommendationId={rec.id} isDemo={rec.isDemo} />
      </div>
    </Card>
  )
}
