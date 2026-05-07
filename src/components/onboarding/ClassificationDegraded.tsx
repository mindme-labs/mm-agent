'use client'

import { useState } from 'react'
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
  SecondaryButton,
  WarningBanner,
} from './classification-shared'

type Classification = NonNullable<ClassificationStateResponse['classification']>

interface Props {
  classification: Classification
}

/**
 * Screen 5.6 — confirmation of analysis on incomplete data.
 *
 * Reached only when the user previously chose `continue_degraded` in the
 * Fork screen but later returns here (e.g., from the Resume screen) and we
 * want them to acknowledge the lower-precision outcome explicitly.
 *
 * Pivots: a "Загрузить запрошенные счета сейчас" secondary button takes the
 * user back to the Fork branch (PATCH with `choice='upload_now'`).
 */
export default function ClassificationDegraded({ classification }: Props) {
  const router = useRouter()
  const initialModel = (classification.model ?? 'trading') as BusinessModel
  const [selected, setSelected] = useState<BusinessModel>(initialModel)
  const [showOverride, setShowOverride] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const def = MODELS[selected]
  const isOverride = selected !== initialModel

  const handleConfirm = async () => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const result = await patchClassification({
        model: selected,
        isOverride,
        acceptDegraded: true,
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

  return (
    <CenteredCard>
      <WarningBanner title="Анализ на неполных данных">
        Мы не получили все рекомендуемые счета. Анализ запустится, но точность будет ниже. Можно
        дозагрузить данные сейчас и пересчитать всё точнее.
      </WarningBanner>

      <ScreenTitle>Подтвердите тип бизнеса</ScreenTitle>
      <ScreenSubtitle>
        AI определил тип на основе того, что есть. Подтвердите, чтобы запустить анализ — или
        вернитесь и дозагрузите файлы.
      </ScreenSubtitle>

      <div
        className="mb-4 rounded-xl border p-4"
        style={{ background: 'var(--mm-bg)', borderColor: 'var(--mm-border)' }}
      >
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--mm-muted)' }}>
          {def.category === 'hybrid' ? 'Гибридная модель' : def.category === 'industry' ? 'Отраслевой паттерн' : 'Базовая модель'}
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

      <div className="mb-5">
        <button
          type="button"
          onClick={() => setShowOverride((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold"
          style={{ color: 'var(--mm-ink2)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span>Изменить тип бизнеса</span>
          <span style={{ color: 'var(--mm-muted)' }}>{showOverride ? '−' : '+'}</span>
        </button>
        {showOverride && (
          <div className="mt-2">
            <ModelPicker value={selected} onChange={setSelected} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <PrimaryButton onClick={handleConfirm} loading={submitting}>
          Запустить анализ как есть
        </PrimaryButton>
        <SecondaryButton onClick={handleUploadNow} disabled={submitting}>
          Загрузить запрошенные счета сейчас
        </SecondaryButton>
      </div>

      <ErrorMessage>{error}</ErrorMessage>
    </CenteredCard>
  )
}
