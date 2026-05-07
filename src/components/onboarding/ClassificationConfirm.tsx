'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MODELS, type BusinessModel } from '@/lib/classification/matrix'
import {
  patchClassification,
  type ClassificationStateResponse,
} from '@/lib/classification/client'
import {
  CenteredCard,
  ConfidenceBar,
  ErrorMessage,
  ModelPicker,
  PrimaryButton,
  ScreenSubtitle,
  ScreenTitle,
  WarningBanner,
} from './classification-shared'

const AUTO_CONFIRM_SECONDS = 3

type Classification = NonNullable<ClassificationStateResponse['classification']>

interface Props {
  classification: Classification
  /** When true, high-confidence classifications auto-confirm after 3s. */
  autoConfirmEnabled?: boolean
  autoConfirmThreshold?: number
}

/**
 * Screen 5.4 — confirm AI's pick (or override it).
 *
 * Shows the model card, confidence bar, rationale (collapsed), an optional
 * data-quality warning, and a "change model" expander. When auto-confirm is
 * enabled and confidence ≥ threshold, runs a 3-second countdown; the user
 * can interrupt by clicking "Подтвердить" or expanding the model picker.
 */
export default function ClassificationConfirm({
  classification,
  autoConfirmEnabled = false,
  autoConfirmThreshold = 0.85,
}: Props) {
  const router = useRouter()
  const initialModel = (classification.model ?? 'trading') as BusinessModel
  const [selected, setSelected] = useState<BusinessModel>(initialModel)
  const [showRationale, setShowRationale] = useState(false)
  const [showOverride, setShowOverride] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const def = MODELS[selected]
  const isOverride = selected !== initialModel

  // Auto-confirm countdown — only kicks in when AI confidence is high AND
  // the user hasn't touched the override picker.
  const autoEligible =
    autoConfirmEnabled &&
    classification.confidence !== null &&
    classification.confidence >= autoConfirmThreshold &&
    !classification.userOverridden &&
    !isOverride &&
    !showOverride
  const [autoSecondsLeft, setAutoSecondsLeft] = useState<number | null>(
    autoEligible ? AUTO_CONFIRM_SECONDS : null,
  )
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (autoSecondsLeft === null || cancelledRef.current) return
    if (autoSecondsLeft <= 0) {
      void handleConfirm(false)
      return
    }
    const t = setTimeout(() => setAutoSecondsLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSecondsLeft])

  const cancelAuto = () => {
    cancelledRef.current = true
    setAutoSecondsLeft(null)
  }

  const handleConfirm = async (manualClick: boolean) => {
    if (manualClick) cancelAuto()
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const result = await patchClassification({
        model: selected,
        isOverride,
      })
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

  const handleExpandOverride = () => {
    cancelAuto()
    setShowOverride(true)
  }

  const cardSubtitle = useMemo(() => {
    if (def.category === 'hybrid') return 'Гибридная модель — два бизнеса в одной компании'
    if (def.category === 'industry') return 'Отраслевой паттерн'
    return 'Базовая модель'
  }, [def])

  return (
    <CenteredCard>
      <div
        className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
        style={{ background: 'var(--mm-green-bg)', color: 'var(--mm-green)' }}
      >
        Шаг 3 из 4
      </div>
      <ScreenTitle>Тип вашего бизнеса</ScreenTitle>
      <ScreenSubtitle>
        Мы определили тип вашего бизнеса по бухгалтерским данным. Подтвердите или измените — от этого
        зависит, какие проверки запустит сервис.
      </ScreenSubtitle>

      {classification.dataQualityWarning && (
        <WarningBanner title="Возможно, нужна проверка учётной политики">
          {classification.dataQualityWarning}
        </WarningBanner>
      )}

      <div
        className="mb-5 rounded-xl border p-4"
        style={{ background: 'var(--mm-bg)', borderColor: 'var(--mm-border)' }}
      >
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--mm-muted)' }}>
          {cardSubtitle}
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

      {classification.rationale.length > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowRationale((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-semibold"
            style={{ color: 'var(--mm-ink2)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span>Почему мы так решили</span>
            <span style={{ color: 'var(--mm-muted)' }}>{showRationale ? '−' : '+'}</span>
          </button>
          {showRationale && (
            <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>
              {classification.rationale.map((r, i) => (
                <li key={i} className="mb-1">
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mb-5">
        <button
          type="button"
          onClick={handleExpandOverride}
          className="flex w-full items-center justify-between text-sm font-semibold"
          style={{ color: 'var(--mm-ink2)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span>Изменить тип бизнеса</span>
          <span style={{ color: 'var(--mm-muted)' }}>{showOverride ? '−' : '+'}</span>
        </button>
        {showOverride && (
          <div className="mt-2">
            <ModelPicker value={selected} onChange={setSelected} />
            {isOverride && (
              <p className="mt-1 text-xs" style={{ color: 'var(--mm-muted)' }}>
                Выбор сохранён вручную — AI определял «{MODELS[initialModel].name}».
              </p>
            )}
          </div>
        )}
      </div>

      <PrimaryButton onClick={() => handleConfirm(true)} loading={submitting}>
        {autoSecondsLeft !== null && autoSecondsLeft > 0
          ? `Подтвердить (${autoSecondsLeft})`
          : 'Подтвердить и продолжить'}
      </PrimaryButton>

      <ErrorMessage>{error}</ErrorMessage>
    </CenteredCard>
  )
}
