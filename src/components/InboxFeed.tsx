'use client'

import { useState } from 'react'
import { RecommendationCard } from './RecommendationCard'

interface Rec {
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

export function InboxFeed({ initialRecs }: { initialRecs: Rec[] }) {
  const [recs, setRecs] = useState(initialRecs)

  const handleStatusChange = (id: string, _status: string) => {
    setRecs((prev) => prev.filter((r) => r.id !== id))
  }

  if (recs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'var(--mm-green-bg)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M7 13l3 3 7-7" stroke="var(--mm-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-base font-semibold" style={{ color: 'var(--mm-ink)' }}>
          Все рекомендации обработаны
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--mm-muted)' }}>
          Новые появятся после следующего анализа данных
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {recs.map((rec) => (
        <RecommendationCard
          key={rec.id}
          recommendation={rec}
          showActions={true}
          onStatusChange={handleStatusChange}
        />
      ))}
    </div>
  )
}
