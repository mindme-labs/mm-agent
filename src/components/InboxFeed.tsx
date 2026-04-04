'use client'

import { useState } from 'react'
import { RecommendationCard } from './RecommendationCard'
import { CheckCircle2 } from 'lucide-react'

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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle2 className="mb-3 h-12 w-12 text-green-400" />
        <p className="text-lg font-medium text-slate-700">Все рекомендации обработаны</p>
        <p className="mt-1 text-sm text-slate-400">Новые появятся после следующего анализа данных</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
