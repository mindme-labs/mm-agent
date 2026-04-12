'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function RequestAccessPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) return
    setLoading(true)
    try {
      await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      setSent(true)
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5" style={{ background: 'var(--mm-bg)' }}>
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <div className="mb-4 text-[20px] font-bold" style={{ color: 'var(--mm-ink)' }}>
            mm<span style={{ color: 'var(--mm-green)' }}>labs</span>
          </div>
          <h1 className="mb-2 text-[24px] font-extrabold" style={{ letterSpacing: '-.02em', color: 'var(--mm-ink)' }}>
            Запросить доступ
          </h1>
          <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--mm-ink2)' }}>
            Оставьте email — мы свяжемся с вами, когда появится свободный слот.
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input
                type="email"
                placeholder="Рабочий email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border-[1.5px] px-4 py-[13px] text-[15px] outline-none transition-colors focus:border-[var(--mm-green)]"
                style={{ borderColor: 'var(--mm-border)', background: 'var(--mm-white)', fontFamily: 'inherit' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-[14px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--mm-green)', fontFamily: 'inherit' }}
            >
              {loading ? 'Отправка...' : 'Отправить запрос'}
            </button>
          </form>
        ) : (
          <div
            className="rounded-[10px] border px-5 py-4 text-center text-[14px] font-medium"
            style={{
              background: 'var(--mm-green-bg)',
              borderColor: 'rgba(15,123,92,.2)',
              color: 'var(--mm-green)',
            }}
          >
            ✓ Спасибо! Мы свяжемся с вами в ближайшее время.
          </div>
        )}

        <div className="mt-5 text-center text-[13px]" style={{ color: 'var(--mm-muted)' }}>
          <Link href="/" className="no-underline hover:underline" style={{ color: 'var(--mm-green)' }}>← Вернуться на главную</Link>
        </div>
      </div>
    </div>
  )
}
