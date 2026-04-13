'use client'

import { useState } from 'react'
import { CopyDraftButton } from './CopyDraftButton'

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
  critical: {
    label: 'Критично',
    borderColor: 'var(--mm-red)',
    severityColor: 'var(--mm-red)',
    amountColor: 'var(--mm-red)',
  },
  high: {
    label: 'Высокий',
    borderColor: 'var(--mm-amber)',
    severityColor: 'var(--mm-amber)',
    amountColor: 'var(--mm-amber)',
  },
  medium: {
    label: 'Средний',
    borderColor: 'var(--mm-yellow)',
    severityColor: 'var(--mm-yellow)',
    amountColor: 'var(--mm-yellow)',
  },
  low: {
    label: 'Низкий',
    borderColor: 'var(--mm-border)',
    severityColor: 'var(--mm-muted)',
    amountColor: 'var(--mm-muted)',
  },
}

function formatAmount(n?: number): string {
  if (!n) return ''
  if (n >= 1_000_000) return `₽${(n / 1_000_000).toFixed(1)} млн`
  if (n >= 1_000) return `₽${Math.round(n / 1_000)} тыс.`
  return `₽${n}`
}

export function RecommendationCard({ recommendation: rec, showActions = true, onStatusChange }: RecommendationCardProps) {
  const [hidden, setHidden] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  const cfg = PRIORITY_CONFIG[rec.priority]

  if (hidden) return null

  const handleAction = async (newStatus: string) => {
    try {
      await fetch(`/api/recommendations/${rec.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (newStatus === 'dismissed') setHidden(true)
      onStatusChange?.(rec.id, newStatus)
    } catch (err) {
      console.error('Status change failed:', err)
    }
  }

  const handleFeedback = async (type: string) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: rec.id, type }),
      })
    } catch {}
    setFeedbackGiven(true)
  }

  return (
    <div
      className="overflow-hidden rounded-2xl transition-shadow hover:shadow-sm"
      style={{
        background: 'var(--mm-white)',
        border: '1px solid var(--mm-border)',
        borderTop: `3px solid ${cfg.borderColor}`,
      }}>
      <div className="p-8 lg:p-9">
        {/* Severity + title */}
        <div className="mb-2 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-extrabold leading-snug tracking-tight lg:text-2xl"
              style={{ color: 'var(--mm-ink)', letterSpacing: '-.02em', maxWidth: '90%' }}>
              {rec.title}
            </h3>
          </div>
          <span className="shrink-0 text-xs font-semibold lg:text-sm" style={{ color: cfg.severityColor }}>
            {cfg.label}
          </span>
        </div>

        {/* Impact amount */}
        {rec.impactAmount != null && rec.impactAmount > 0 && (
          <div className="mb-5 text-base font-bold lg:text-[17px]" style={{ color: cfg.amountColor }}>
            {formatAmount(rec.impactAmount)}{' '}
            {rec.impactDirection === 'decrease' ? 'под риском' : 'к высвобождению'}
          </div>
        )}

        {/* Body: context + recommendation — 2-col on desktop */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <p className="text-sm leading-relaxed lg:text-base" style={{ color: 'var(--mm-ink2)', lineHeight: 1.65 }}>
            {rec.description}
          </p>
          {rec.shortRecommendation && (
            <div className="rounded-xl p-5 lg:p-6" style={{ background: 'var(--mm-green-bg)' }}>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--mm-green)' }}>
                Что делать
              </div>
              <p className="text-sm leading-relaxed lg:text-base" style={{ color: 'var(--mm-ink2)', lineHeight: 1.6 }}>
                {rec.shortRecommendation}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap items-center gap-2.5 border-t pt-5"
            style={{ borderColor: 'var(--mm-border)' }}>
            <button
              onClick={() => handleAction('in_progress')}
              className="rounded-lg px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
              style={{ background: 'var(--mm-ink)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Взять в работу
            </button>
            <button
              onClick={() => handleAction('dismissed')}
              className="rounded-lg border px-7 py-3 text-sm font-semibold transition-colors hover:border-[var(--mm-ink)]"
              style={{ background: 'transparent', borderColor: 'var(--mm-border)', color: 'var(--mm-ink2)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Не сейчас
            </button>
            {rec.fullText && (
              <CopyDraftButton text={rec.fullText} variant="link" />
            )}
            <div className="ml-auto flex items-center gap-1">
              {feedbackGiven ? (
                <span className="text-xs font-semibold" style={{ color: 'var(--mm-green)' }}>Спасибо за отзыв</span>
              ) : (
                <>
                  <span className="text-xs" style={{ color: 'var(--mm-muted)' }}>Полезно?</span>
                  {['да', 'нет', 'написать отзыв'].map((type) => (
                    <button
                      key={type}
                      onClick={() => handleFeedback(type)}
                      className="rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors hover:bg-[var(--mm-green-bg)] hover:text-[var(--mm-green)]"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mm-ink2)', fontFamily: 'inherit' }}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
