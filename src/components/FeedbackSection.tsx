'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface FeedbackSectionProps {
  recommendationId: string
  isDemo?: boolean
}

export function FeedbackSection({ recommendationId, isDemo }: FeedbackSectionProps) {
  const [submitted, setSubmitted] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')

  const submitFeedback = async (rating: 'positive' | 'negative') => {
    if (!isDemo) {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId, rating }),
      })
    }
    setSubmitted(true)
  }

  const submitComment = async () => {
    if (!isDemo && comment.trim()) {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId, rating: 'positive', comment: comment.trim() }),
      })
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="border-t border-slate-100 pt-3 text-center text-sm text-slate-400">
        Спасибо за отзыв
      </div>
    )
  }

  return (
    <div className="border-t border-slate-100 pt-3">
      <div className="text-xs text-slate-400">Эта рекомендация полезна?</div>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          onClick={() => submitFeedback('positive')}
          className="flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 transition-colors hover:bg-green-50 hover:text-green-600"
        >
          <ThumbsUp className="h-4 w-4" /> Да
        </button>
        <button
          onClick={() => submitFeedback('negative')}
          className="flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <ThumbsDown className="h-4 w-4" /> Нет
        </button>
        <button
          onClick={() => setShowComment(!showComment)}
          className="flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          <MessageSquare className="h-4 w-4" /> Комментарий
        </button>
      </div>
      {showComment && (
        <div className="mt-2 space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Ваш комментарий..."
            className="text-sm"
            rows={2}
          />
          <Button onClick={submitComment} size="sm" variant="outline" disabled={!comment.trim()}>
            Отправить
          </Button>
        </div>
      )}
    </div>
  )
}
