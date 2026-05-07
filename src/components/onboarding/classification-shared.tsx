'use client'

/**
 * Layout primitives + small visual helpers shared by the 5 classification
 * screens. Kept colocated rather than in `src/components/ui/` because they
 * encode classification-specific copy and design choices.
 */

import { ALL_BUSINESS_MODELS, MODELS, type BusinessModel } from '@/lib/classification/matrix'

/** Centered card layout matching the auth screens (max-w-lg on desktop). */
export function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-dvh px-5 py-8 md:px-8 md:py-12"
      style={{ background: 'var(--mm-bg)' }}
    >
      <div
        className="mx-auto w-full max-w-lg rounded-2xl border p-6 md:p-8"
        style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}
      >
        {children}
      </div>
    </div>
  )
}

export function ScreenTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="mb-2 text-2xl font-extrabold tracking-tight md:text-3xl"
      style={{ color: 'var(--mm-ink)', letterSpacing: '-.02em' }}
    >
      {children}
    </h1>
  )
}

export function ScreenSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 text-sm leading-relaxed md:text-base" style={{ color: 'var(--mm-ink2)' }}>
      {children}
    </p>
  )
}

/** Filled green primary button — same look as the existing wizard. */
export function PrimaryButton({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full rounded-xl py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: 'var(--mm-green)' }}
    >
      {loading ? 'Сохраняем…' : children}
    </button>
  )
}

export function SecondaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl border py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background: 'var(--mm-white)',
        borderColor: 'var(--mm-border)',
        color: 'var(--mm-ink)',
      }}
    >
      {children}
    </button>
  )
}

/** Confidence bar — subtle, no emoji. */
export function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.max(0, Math.min(1, confidence)) * 100
  const label = confidence >= 0.85 ? 'Высокая' : confidence >= 0.6 ? 'Средняя' : 'Низкая'
  return (
    <div className="mb-1">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--mm-muted)' }}>
          Уверенность {label}
        </span>
        <span className="text-xs font-semibold" style={{ color: 'var(--mm-ink2)' }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--mm-bg)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: 'var(--mm-green)' }}
        />
      </div>
    </div>
  )
}

/** Yellow warning banner. */
export function WarningBanner({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="mb-5 rounded-xl border px-4 py-3 text-sm"
      style={{
        background: 'var(--mm-yellow-bg)',
        borderColor: 'rgba(202,138,4,.25)',
        color: 'var(--mm-amber)',
      }}
    >
      {title && <div className="mb-0.5 font-bold">{title}</div>}
      <div className="leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>
        {children}
      </div>
    </div>
  )
}

/** Plain native <select> — Payload Admin's built-in select primitive doesn't
 * play well with our CSS-variable palette. Inline-styled to match the cards. */
export function ModelPicker({
  value,
  onChange,
}: {
  value: BusinessModel
  onChange: (model: BusinessModel) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as BusinessModel)}
      className="w-full rounded-xl border px-3 py-2.5 text-sm font-medium"
      style={{
        background: 'var(--mm-white)',
        borderColor: 'var(--mm-border)',
        color: 'var(--mm-ink)',
      }}
    >
      <optgroup label="Базовые">
        {ALL_BUSINESS_MODELS.filter((m) => MODELS[m].category === 'base').map((m) => (
          <option key={m} value={m}>
            {MODELS[m].name}
          </option>
        ))}
      </optgroup>
      <optgroup label="Гибриды">
        {ALL_BUSINESS_MODELS.filter((m) => MODELS[m].category === 'hybrid').map((m) => (
          <option key={m} value={m}>
            {MODELS[m].name}
          </option>
        ))}
      </optgroup>
      <optgroup label="Отраслевые">
        {ALL_BUSINESS_MODELS.filter((m) => MODELS[m].category === 'industry').map((m) => (
          <option key={m} value={m}>
            {MODELS[m].name}
          </option>
        ))}
      </optgroup>
    </select>
  )
}

export function ErrorMessage({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return (
    <div
      className="mt-3 rounded-lg px-3 py-2 text-sm font-medium"
      style={{ background: 'var(--mm-red-bg)', color: 'var(--mm-red)' }}
    >
      {children}
    </div>
  )
}
