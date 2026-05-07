'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MODELS, type BusinessModel } from '@/lib/classification/matrix'
import { getAccountHints } from '@/lib/classification/account-hints'
import {
  patchClassification,
  type ClassificationStateResponse,
  type ForkChoice,
} from '@/lib/classification/client'
import {
  CenteredCard,
  ErrorMessage,
  PrimaryButton,
  ScreenSubtitle,
  ScreenTitle,
} from './classification-shared'

type Classification = NonNullable<ClassificationStateResponse['classification']>

interface Props {
  classification: Classification
}

interface ChoiceOption {
  id: ForkChoice
  title: string
  description: string
}

const ALL_OPTIONS: ChoiceOption[] = [
  {
    id: 'upload_now',
    title: 'Загрузить сейчас',
    description: 'Я подготовлю и загружу запрошенные файлы прямо сейчас. Это займёт 5–10 минут.',
  },
  {
    id: 'upload_later',
    title: 'Загрузить позже',
    description:
      'Я вернусь, когда соберу запрошенные файлы. Сервис подождёт меня — анализ продолжится с того же места.',
  },
  {
    id: 'continue_degraded',
    title: 'Продолжить без этих файлов',
    description:
      'Возьмём текущее предположение AI как окончательное. Точность будет ниже, но анализ запустится сразу.',
  },
]

/**
 * Screen 5.5 — three-way fork when AI returns `status='needs_data'`.
 *
 * When the user has hit the attempts cap, the first two options become
 * disabled and only `continue_degraded` is allowed.
 */
export default function ClassificationFork({ classification }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<ForkChoice>('upload_now')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const requested = classification.requestedAccounts ?? []
  const hints = getAccountHints(requested)
  const atCap = classification.attempts >= classification.maxAttempts
  const bestGuess = classification.model ? MODELS[classification.model] : null

  const optionDisabled = (id: ForkChoice): boolean => {
    if (!atCap) return false
    return id === 'upload_now' || id === 'upload_later'
  }

  // If the cap forces continue_degraded, snap to it.
  useEffect(() => {
    if (atCap && selected !== 'continue_degraded') {
      setSelected('continue_degraded')
    }
  }, [atCap, selected])

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const body =
        selected === 'continue_degraded' && classification.model
          ? {
              choice: selected,
              model: classification.model,
              acceptDegraded: true,
            }
          : { choice: selected }
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
        style={{ background: 'var(--mm-yellow-bg)', color: 'var(--mm-amber)' }}
      >
        Нужно уточнение
      </div>
      <ScreenTitle>Чтобы точнее определить тип вашего бизнеса</ScreenTitle>
      <ScreenSubtitle>
        {bestGuess
          ? `Наиболее вероятная модель — «${bestGuess.name}». Чтобы убедиться, нам пригодились бы дополнительные данные.`
          : 'Мы видим неоднозначные сигналы. Дополнительные данные позволят AI определить тип бизнеса точнее.'}
      </ScreenSubtitle>

      {hints.length > 0 && (
        <div className="mb-5">
          <div
            className="mb-2 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--mm-muted)' }}
          >
            Что бы помогло
          </div>
          <div className="flex flex-col gap-2">
            {hints.map((h) => (
              <div
                key={h.code}
                className="rounded-xl border p-3"
                style={{ background: 'var(--mm-bg)', borderColor: 'var(--mm-border)' }}
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

      <div className="mb-5 flex flex-col gap-2">
        {ALL_OPTIONS.map((opt) => {
          const disabled = optionDisabled(opt.id)
          const isSelected = selected === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => !disabled && setSelected(opt.id)}
              disabled={disabled}
              className="rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed"
              style={{
                background: isSelected ? 'var(--mm-green-bg)' : 'var(--mm-white)',
                borderColor: isSelected ? 'var(--mm-green)' : 'var(--mm-border)',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: isSelected ? 'var(--mm-green)' : 'var(--mm-border)',
                    background: 'var(--mm-white)',
                  }}
                >
                  {isSelected && (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: 'var(--mm-green)' }}
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold" style={{ color: 'var(--mm-ink)' }}>
                    {opt.title}
                  </div>
                  <div className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>
                    {opt.description}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {atCap && (
        <p className="mb-4 text-xs" style={{ color: 'var(--mm-muted)' }}>
          Достигнут лимит попыток уточнения ({classification.maxAttempts}). Можно продолжить с
          текущим предположением.
        </p>
      )}

      <PrimaryButton onClick={handleSubmit} loading={submitting}>
        Продолжить
      </PrimaryButton>

      <ErrorMessage>{error}</ErrorMessage>
    </CenteredCard>
  )
}
