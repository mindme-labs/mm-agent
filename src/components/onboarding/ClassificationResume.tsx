'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MODELS } from '@/lib/classification/matrix'
import { getAccountHints } from '@/lib/classification/account-hints'
import {
  patchClassification,
  type ClassificationStateResponse,
} from '@/lib/classification/client'
import {
  CenteredCard,
  ConfidenceBar,
  ErrorMessage,
  PrimaryButton,
  ScreenSubtitle,
  ScreenTitle,
  SecondaryButton,
} from './classification-shared'

type Classification = NonNullable<ClassificationStateResponse['classification']>

interface Props {
  classification: Classification
}

/**
 * Screen 5.8 — return-after-pause.
 *
 * Reached when the user paused the onboarding via `upload_later` and came
 * back. Shows the previous best-guess + the still-requested accounts,
 * offers two paths: re-upload now (redirects to file picker) or accept
 * the existing model and run the analysis as-is (continue_degraded).
 *
 * Logs `wizard.resumed` once on first render so the funnel can measure
 * pause-to-resume latency.
 */
export default function ClassificationResume({ classification }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const loggedRef = useRef(false)

  useEffect(() => {
    if (loggedRef.current) return
    loggedRef.current = true
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ eventType: 'wizard.resumed' }),
    }).catch(() => {})
  }, [])

  const requested = classification.requestedAccounts ?? []
  const hints = getAccountHints(requested)
  const def = classification.model ? MODELS[classification.model] : null

  const handleUploadNow = async () => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const result = await patchClassification({ choice: 'upload_now' })
      if (!result.ok) {
        setError(result.error || 'Не удалось перейти к дозагрузке')
        setSubmitting(false)
        return
      }
      router.push(result.nextStage || '/app/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Сетевая ошибка')
      setSubmitting(false)
    }
  }

  const handleContinueDegraded = async () => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const body = classification.model
        ? { choice: 'continue_degraded' as const, model: classification.model, acceptDegraded: true }
        : { choice: 'continue_degraded' as const }
      const result = await patchClassification(body)
      if (!result.ok) {
        setError(result.error || 'Не удалось сохранить выбор')
        setSubmitting(false)
        return
      }
      router.push(result.nextStage || '/app/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Сетевая ошибка')
      setSubmitting(false)
    }
  }

  return (
    <CenteredCard>
      <div
        className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
        style={{ background: 'var(--mm-green-bg)', color: 'var(--mm-green)' }}
      >
        Продолжаем онбординг
      </div>
      <ScreenTitle>С возвращением</ScreenTitle>
      <ScreenSubtitle>
        В прошлый раз мы остановились на уточнении типа вашего бизнеса. Можно загрузить
        запрошенные файлы сейчас или принять текущее предположение и запустить анализ.
      </ScreenSubtitle>

      {def && (
        <div
          className="mb-5 rounded-xl border p-4"
          style={{ background: 'var(--mm-bg)', borderColor: 'var(--mm-border)' }}
        >
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--mm-muted)' }}>
            Текущее предположение
          </div>
          <div className="mb-1 text-xl font-bold" style={{ color: 'var(--mm-ink)' }}>
            {def.name}
          </div>
          <div className="text-sm leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>
            {def.description}
          </div>
          {classification.confidence !== null && (
            <div className="mt-4">
              <ConfidenceBar confidence={classification.confidence} />
            </div>
          )}
        </div>
      )}

      {hints.length > 0 && (
        <div className="mb-5">
          <div
            className="mb-2 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--mm-muted)' }}
          >
            Что бы помогло уточнить
          </div>
          <div className="flex flex-col gap-2">
            {hints.map((h) => (
              <div
                key={h.code}
                className="rounded-xl border p-3"
                style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}
              >
                <div className="text-sm font-bold" style={{ color: 'var(--mm-ink)' }}>
                  ОСВ по счёту {h.code} — {h.title}
                </div>
                <div className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>
                  {h.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <PrimaryButton onClick={handleUploadNow} loading={submitting}>
          Загрузить запрошенные файлы
        </PrimaryButton>
        <SecondaryButton onClick={handleContinueDegraded} disabled={submitting}>
          Принять текущее предположение и продолжить
        </SecondaryButton>
      </div>

      <ErrorMessage>{error}</ErrorMessage>
    </CenteredCard>
  )
}
