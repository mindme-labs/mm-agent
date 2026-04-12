'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TeaserLanding() {
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestEmail, setRequestEmail] = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const [validating, setValidating] = useState(false)
  const [submittingRequest, setSubmittingRequest] = useState(false)

  async function handleValidateCode() {
    const code = inviteCode.trim()
    if (!code) {
      setCodeError('Введите инвайт-код')
      return
    }
    setCodeError('')
    setValidating(true)
    try {
      const res = await fetch('/api/invite-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.valid) {
        router.push(`/auth/register?code=${encodeURIComponent(code)}`)
      } else {
        setCodeError(data.error || 'Код недействителен. Проверьте правильность ввода.')
      }
    } catch {
      setCodeError('Ошибка проверки кода. Попробуйте позже.')
    } finally {
      setValidating(false)
    }
  }

  async function handleSubmitRequest() {
    const email = requestEmail.trim()
    if (!email || !email.includes('@')) return
    setSubmittingRequest(true)
    try {
      await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setRequestSent(true)
      setShowRequestForm(false)
    } catch {
      // silently handle
    } finally {
      setSubmittingRequest(false)
    }
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--mm-bg)' }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(248,247,244,.96)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--mm-border)',
        }}
      >
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-6">
          <div className="text-[17px] font-bold" style={{ color: 'var(--mm-ink)' }}>
            mm<span style={{ color: 'var(--mm-green)' }}>labs</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/auth/login')}
              className="hidden rounded-[7px] px-4 py-2 text-[13px] font-semibold transition-colors sm:block"
              style={{
                color: 'var(--mm-muted)',
                border: '1px solid var(--mm-border)',
                background: 'transparent',
              }}
            >
              Войти
            </button>
            <button
              onClick={() => document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-[7px] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
              style={{ background: 'var(--mm-ink)' }}
            >
              Получить доступ
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="overflow-hidden border-b pb-0 text-center"
        style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}
      >
        <div className="mx-auto max-w-[1080px] px-6 pt-12 sm:pt-16">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-[13px] py-[5px] text-[12px] font-semibold"
            style={{
              background: 'var(--mm-green-bg)',
              color: 'var(--mm-green)',
              border: '1px solid rgba(15,123,92,.2)',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--mm-green)' }} />
            Money Management Labs
          </div>

          <h1
            className="mx-auto mb-[18px] max-w-[700px] text-[clamp(32px,5vw,56px)] font-extrabold leading-[1.06]"
            style={{ letterSpacing: '-.03em', color: 'var(--mm-ink)' }}
          >
            Деньги зависают{' '}
            <span style={{ color: 'var(--mm-green)' }}>незаметно</span>
            <br />
            Мы это видим первыми
          </h1>

          <p
            className="mx-auto mb-9 max-w-[520px] text-[clamp(16px,2vw,19px)] leading-[1.6]"
            style={{ color: 'var(--mm-ink2)' }}
          >
            Анализирует данные из вашей 1С и формирует рекомендации с готовыми текстами — для немедленных действий.
          </p>

          {/* Screen mockup */}
          <div
            className="mx-auto max-w-[780px] rounded-t-[14px] border border-b-0 p-2 sm:p-3"
            style={{ background: 'var(--mm-bg)', borderColor: 'var(--mm-border)' }}
          >
            <div className="overflow-hidden rounded-t-[10px]" style={{ background: 'var(--mm-ink)' }}>
              <div
                className="flex items-center justify-between border-b px-4 py-2.5"
                style={{ borderColor: 'rgba(255,255,255,.06)' }}
              >
                <div className="flex gap-[5px]">
                  <span className="block h-[9px] w-[9px] rounded-full" style={{ background: '#FF5F57' }} />
                  <span className="block h-[9px] w-[9px] rounded-full" style={{ background: '#FFBD2E' }} />
                  <span className="block h-[9px] w-[9px] rounded-full" style={{ background: '#28CA42' }} />
                </div>
                <span className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,.25)' }}>
                  mmlabs.ru/app/inbox
                </span>
                <div className="w-[50px]" />
              </div>
              <div className="p-4">
                <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: 'Дебиторка', value: '₽12.4M', danger: true },
                    { label: 'Выручка', value: '₽87.1M' },
                    { label: 'Запасы', value: '₽31.2M' },
                    { label: 'Кредиторка', value: '₽9.8M' },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-[7px] border px-3 py-2.5"
                      style={{
                        background: 'rgba(255,255,255,.04)',
                        borderColor: 'rgba(255,255,255,.06)',
                      }}
                    >
                      <div className="mb-[3px] text-[10px]" style={{ color: 'rgba(255,255,255,.3)' }}>
                        {m.label}
                      </div>
                      <div
                        className="text-[18px] font-bold leading-none"
                        style={{ color: m.danger ? '#F87171' : '#fff' }}
                      >
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div
                    className="rounded-lg border p-3"
                    style={{
                      background: 'rgba(255,255,255,.04)',
                      borderColor: 'rgba(255,255,255,.06)',
                    }}
                  >
                    <span
                      className="mb-1.5 inline-block rounded-full px-[7px] py-[2px] text-[10px] font-semibold"
                      style={{ background: 'rgba(239,68,68,.15)', color: '#F87171' }}
                    >
                      Критично
                    </span>
                    <h4 className="mb-1 text-[12px] font-semibold leading-[1.35]" style={{ color: 'rgba(255,255,255,.85)' }}>
                      ООО «Вектор» — 38% дебиторки
                    </h4>
                    <p className="text-[11px] leading-[1.45]" style={{ color: 'rgba(255,255,255,.35)' }}>
                      ₽4.5M под риском. Готов оффер на досрочное погашение со скидкой 1.5%.
                    </p>
                  </div>
                  <div
                    className="rounded-lg border p-3"
                    style={{
                      background: 'rgba(255,255,255,.04)',
                      borderColor: 'rgba(255,255,255,.06)',
                    }}
                  >
                    <span
                      className="mb-1.5 inline-block rounded-full px-[7px] py-[2px] text-[10px] font-semibold"
                      style={{ background: 'rgba(251,191,36,.12)', color: '#FBBF24' }}
                    >
                      Высокий
                    </span>
                    <h4 className="mb-1 text-[12px] font-semibold leading-[1.35]" style={{ color: 'rgba(255,255,255,.85)' }}>
                      Герметик — 90+ дней без продаж
                    </h4>
                    <p className="text-[11px] leading-[1.45]" style={{ color: 'rgba(255,255,255,.35)' }}>
                      ₽1.8M заморожено. Готов спец-оффер покупателям со скидкой.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta-section" className="py-14 text-center sm:py-[72px]">
        <div className="mx-auto max-w-[1080px] px-6">
          <h2
            className="mb-2.5 text-[clamp(22px,3.5vw,32px)] font-extrabold leading-[1.1]"
            style={{ letterSpacing: '-.02em', color: 'var(--mm-ink)' }}
          >
            Узнайте, где зависают ваши деньги
          </h2>
          <p className="mb-8 text-[15px]" style={{ color: 'var(--mm-muted)' }}>
            7 дней бесплатно. Загрузите ОСВ из 1С — получите анализ за минуту.
          </p>

          {!showRequestForm && !requestSent && (
            <div className="mx-auto max-w-[420px]">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                <input
                  className="flex-1 rounded-lg border-[1.5px] bg-white px-4 py-[13px] text-[15px] outline-none transition-colors focus:border-[var(--mm-green)]"
                  style={{ borderColor: 'var(--mm-border)', fontFamily: 'inherit' }}
                  type="text"
                  placeholder="Инвайт-код"
                  maxLength={12}
                  autoComplete="off"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value); setCodeError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidateCode()}
                />
                <button
                  onClick={handleValidateCode}
                  disabled={validating}
                  className="whitespace-nowrap rounded-lg px-[22px] py-[13px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--mm-green)' }}
                >
                  {validating ? 'Проверка...' : 'Получить доступ'}
                </button>
              </div>
              {codeError && (
                <div className="mb-2.5 text-left text-[13px]" style={{ color: 'var(--mm-red)' }}>
                  {codeError}
                </div>
              )}
              <p className="mb-3 text-[13px]" style={{ color: 'var(--mm-muted)' }}>Нет кода?</p>
              <button
                onClick={() => setShowRequestForm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border px-5 py-2.5 text-[14px] font-medium transition-colors hover:border-[var(--mm-ink)]"
                style={{
                  color: 'var(--mm-ink2)',
                  borderColor: 'var(--mm-border)',
                  background: 'transparent',
                  fontFamily: 'inherit',
                }}
              >
                Запросить доступ по email
              </button>
              <div className="mt-5 text-[13px]" style={{ color: 'var(--mm-muted)' }}>
                Уже есть аккаунт?{' '}
                <a
                  href="/auth/login"
                  className="font-medium no-underline hover:underline"
                  style={{ color: 'var(--mm-green)' }}
                >
                  Войти →
                </a>
              </div>
            </div>
          )}

          {showRequestForm && !requestSent && (
            <div className="mx-auto max-w-[420px]">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                <input
                  className="flex-1 rounded-lg border-[1.5px] bg-white px-4 py-[13px] text-[15px] outline-none transition-colors focus:border-[var(--mm-green)]"
                  style={{ borderColor: 'var(--mm-border)', fontFamily: 'inherit' }}
                  type="email"
                  placeholder="Рабочий email"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitRequest()}
                />
                <button
                  onClick={handleSubmitRequest}
                  disabled={submittingRequest}
                  className="whitespace-nowrap rounded-lg px-[22px] py-[13px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--mm-green)' }}
                >
                  {submittingRequest ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
              <button
                onClick={() => setShowRequestForm(false)}
                className="mt-1 inline-block text-[13px] hover:text-[var(--mm-ink)]"
                style={{ color: 'var(--mm-muted)' }}
              >
                ← Назад к вводу кода
              </button>
            </div>
          )}

          {requestSent && (
            <div
              className="mx-auto max-w-[420px] rounded-[10px] border px-5 py-4 text-[14px] font-medium"
              style={{
                background: 'var(--mm-green-bg)',
                borderColor: 'rgba(15,123,92,.2)',
                color: 'var(--mm-green)',
              }}
            >
              ✓ Спасибо! Мы свяжемся с вами в ближайшее время.
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section
        className="border-t py-12"
        style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}
      >
        <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-6 px-6 text-center sm:grid-cols-3 sm:gap-8">
          {[
            { num: '9', title: 'Типов рисков', desc: 'Дебиторка, склад, кредиторы, маржинальность, платёжные циклы — проверяются автоматически.' },
            { num: '60 сек', title: 'От файла до результата', desc: 'Загрузите ОСВ из 1С — и через минуту получите персональные рекомендации с суммами.' },
            { num: '1 клик', title: 'Готовые тексты', desc: 'Каждая рекомендация содержит черновик письма с данными контрагента. Копируйте и отправляйте.' },
          ].map((f) => (
            <div key={f.title}>
              <div className="mb-2 text-[28px] font-extrabold" style={{ color: 'var(--mm-green)' }}>{f.num}</div>
              <h3 className="mb-1.5 text-[15px] font-bold" style={{ color: 'var(--mm-ink)' }}>{f.title}</h3>
              <p className="text-[14px] leading-[1.6]" style={{ color: 'var(--mm-ink2)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-7 text-center text-[12px]" style={{ borderColor: 'var(--mm-border)', color: 'var(--mm-muted)' }}>
        <div className="mx-auto max-w-[1080px] px-6">
          © 2025 mmlabs. Money Management Labs ·{' '}
          <a href="mailto:hello@mmlabs.ru" className="no-underline" style={{ color: 'var(--mm-green)' }}>
            hello@mmlabs.ru
          </a>
        </div>
      </footer>
    </div>
  )
}
