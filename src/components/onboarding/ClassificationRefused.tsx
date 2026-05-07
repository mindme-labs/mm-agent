'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type BusinessModel } from '@/lib/classification/matrix'
import {
  patchClassification,
  refuseClassification,
} from '@/lib/classification/client'
import {
  CenteredCard,
  ErrorMessage,
  ModelPicker,
  PrimaryButton,
  ScreenSubtitle,
  ScreenTitle,
  SecondaryButton,
} from './classification-shared'

/**
 * Screen 5.7 — reached when AI returned `cannot_classify`.
 *
 * Two paths out:
 *   1. Pick a model manually -> PATCH with isOverride=true; persists as
 *      classificationStatus='refused_manual'.
 *   2. Contact support -> POST /refuse-classification, which logs the lead.
 *      User stays in `classification_refused` and can come back later.
 */
export default function ClassificationRefused() {
  const router = useRouter()
  const [selected, setSelected] = useState<BusinessModel>('trading')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [supportContact, setSupportContact] = useState<string | null>(null)
  const [contactPending, setContactPending] = useState(false)

  const handleManual = async () => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const result = await patchClassification({
        model: selected,
        isOverride: true,
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

  const handleContact = async () => {
    if (contactPending) return
    setContactPending(true)
    setError('')
    try {
      const result = await refuseClassification()
      if (!result.ok) {
        setError(result.error || 'Не удалось отправить запрос')
        setContactPending(false)
        return
      }
      setSupportContact(result.supportContact || '')
      setContactPending(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Сетевая ошибка')
      setContactPending(false)
    }
  }

  return (
    <CenteredCard>
      <ScreenTitle>Не удалось определить тип вашего бизнеса</ScreenTitle>
      <ScreenSubtitle>
        Сигналы в загруженных данных противоречивы или не соответствуют нашим типовым моделям. Это
        не редкость — выберите тип вручную или свяжитесь с консультантом.
      </ScreenSubtitle>

      {supportContact !== null && (
        <div
          className="mb-5 rounded-xl border p-4"
          style={{ background: 'var(--mm-green-bg)', borderColor: 'rgba(15,123,92,.25)' }}
        >
          <div className="mb-1 text-sm font-bold" style={{ color: 'var(--mm-green)' }}>
            Запрос принят
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>
            {supportContact
              ? `Свяжитесь с нами: ${supportContact}. Мы поможем разобрать вашу учётную модель.`
              : 'Мы свяжемся с вами по email. Можно продолжить выбор модели вручную или подождать.'}
          </p>
        </div>
      )}

      <div
        className="mb-5 rounded-xl border p-4"
        style={{ background: 'var(--mm-bg)', borderColor: 'var(--mm-border)' }}
      >
        <div className="mb-2 text-sm font-bold" style={{ color: 'var(--mm-ink)' }}>
          Выбрать тип бизнеса вручную
        </div>
        <div className="mb-3">
          <ModelPicker value={selected} onChange={setSelected} />
        </div>
        <PrimaryButton onClick={handleManual} loading={submitting}>
          Продолжить с выбранной моделью
        </PrimaryButton>
      </div>

      <SecondaryButton onClick={handleContact} disabled={contactPending || supportContact !== null}>
        {contactPending ? 'Отправляем…' : 'Связаться с консультантом'}
      </SecondaryButton>

      <ErrorMessage>{error}</ErrorMessage>
    </CenteredCard>
  )
}
