'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code') || ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Заполните все поля')
      return
    }
    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, inviteCode: code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Ошибка регистрации')
        return
      }
      router.push('/app')
    } catch {
      setError('Ошибка сети. Попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh" style={{ background: 'var(--mm-bg)' }}>
      {/* Left panel — desktop only */}
      <div
        className="hidden w-1/2 flex-col justify-center px-16 py-16 lg:flex"
        style={{ background: 'var(--mm-ink)', color: '#fff', position: 'relative' }}
      >
        <div className="absolute left-10 top-8 text-[20px] font-bold">
          mm<span style={{ color: '#34D399' }}>labs</span>
        </div>
        <h2 className="mb-4 text-[36px] font-extrabold leading-[1.1]" style={{ letterSpacing: '-.03em' }}>
          Найдём, где зависают <em className="not-italic" style={{ color: '#34D399' }}>ваши деньги</em>
        </h2>
        <p className="mb-10 max-w-[420px] text-[17px] leading-[1.65]" style={{ color: 'rgba(255,255,255,.55)' }}>
          Загрузите данные из 1С — через минуту получите конкретные рекомендации с суммами и готовыми текстами писем.
        </p>
        <div
          className="max-w-[400px] rounded-xl border p-[18px]"
          style={{ background: 'rgba(255,255,255,.06)', borderColor: 'rgba(255,255,255,.08)' }}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full px-2 py-[3px] text-[11px] font-bold" style={{ background: 'rgba(239,68,68,.2)', color: '#F87171' }}>
              Критично
            </span>
          </div>
          <div className="mb-1 text-[15px] font-bold">ООО «Вектор» — 38% дебиторки</div>
          <div className="mb-2.5 text-[13px] leading-[1.5]" style={{ color: 'rgba(255,255,255,.4)' }}>
            Долг ₽4.5M — задержка оплаты на месяц создаст кассовый разрыв.
          </div>
          <span className="inline-block rounded-md px-2.5 py-1.5 text-[12px] font-semibold" style={{ background: 'rgba(239,68,68,.1)', color: '#F87171' }}>
            ↓ −₽4 500 000
          </span>
        </div>
        <div className="absolute bottom-8 left-10 text-[12px]" style={{ color: 'rgba(255,255,255,.2)' }}>
          © 2025 mmlabs · Money Management Labs
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center px-5 py-10 lg:w-1/2 lg:px-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <div className="text-[17px] font-bold" style={{ color: 'var(--mm-ink)' }}>
              mm<span style={{ color: 'var(--mm-green)' }}>labs</span>
            </div>
            <Link href="/" className="text-[13px] no-underline" style={{ color: 'var(--mm-muted)' }}>← Назад</Link>
          </div>

          {/* Tabs */}
          <div
            className="mb-7 flex gap-[2px] rounded-[10px] border p-[3px]"
            style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}
          >
            <div
              className="flex-1 rounded-lg py-2.5 text-center text-[15px] font-semibold text-white"
              style={{ background: 'var(--mm-ink)' }}
            >
              Регистрация
            </div>
            <Link
              href="/auth/login"
              className="flex-1 rounded-lg py-2.5 text-center text-[15px] font-semibold no-underline"
              style={{ color: 'var(--mm-muted)' }}
            >
              Вход
            </Link>
          </div>

          {code && (
            <div
              className="mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-[12px] font-semibold"
              style={{ color: 'var(--mm-green)', background: 'var(--mm-green-bg)', borderColor: 'rgba(15,123,92,.18)' }}
            >
              Код: {code}
            </div>
          )}

          <h1 className="mb-1.5 text-[26px] font-extrabold lg:text-[28px]" style={{ letterSpacing: '-.02em', color: 'var(--mm-ink)' }}>
            Создайте аккаунт
          </h1>
          <p className="mb-6 text-[15px] leading-[1.55] lg:text-[16px]" style={{ color: 'var(--mm-ink2)' }}>
            7 дней бесплатного анализа данных из 1С.
          </p>

          {error && (
            <div className="mb-4 rounded-lg px-4 py-3 text-[14px] font-medium" style={{ background: 'var(--mm-red-bg)', color: 'var(--mm-red)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-[18px]">
              <label className="mb-1.5 block text-[14px] font-semibold" style={{ color: 'var(--mm-ink)' }}>Имя</label>
              <input
                type="text"
                placeholder="Как к вам обращаться"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border-[1.5px] px-4 py-[13px] text-[15px] outline-none transition-colors focus:border-[var(--mm-green)] lg:text-[15px]"
                style={{ borderColor: 'var(--mm-border)', background: 'var(--mm-white)', fontFamily: 'inherit' }}
              />
            </div>
            <div className="mb-[18px]">
              <label className="mb-1.5 block text-[14px] font-semibold" style={{ color: 'var(--mm-ink)' }}>Email</label>
              <input
                type="email"
                placeholder="your@company.ru"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border-[1.5px] px-4 py-[13px] text-[15px] outline-none transition-colors focus:border-[var(--mm-green)] lg:text-[15px]"
                style={{ borderColor: 'var(--mm-border)', background: 'var(--mm-white)', fontFamily: 'inherit' }}
              />
            </div>
            <div className="mb-[18px]">
              <label className="mb-1.5 block text-[14px] font-semibold" style={{ color: 'var(--mm-ink)' }}>Пароль</label>
              <input
                type="password"
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border-[1.5px] px-4 py-[13px] text-[15px] outline-none transition-colors focus:border-[var(--mm-green)] lg:text-[15px]"
                style={{ borderColor: 'var(--mm-border)', background: 'var(--mm-white)', fontFamily: 'inherit' }}
              />
              <div className="mt-[5px] text-[12px]" style={{ color: 'var(--mm-muted)' }}>
                Латинские буквы, цифры, спецсимволы
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg py-[14px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 lg:rounded-lg"
              style={{ background: 'var(--mm-green)', fontFamily: 'inherit' }}
            >
              {loading ? 'Создание...' : 'Создать аккаунт'}
            </button>
          </form>

          <div className="mt-[18px] text-center text-[14px]" style={{ color: 'var(--mm-muted)' }}>
            Нажимая кнопку, вы принимаете{' '}
            <a href="#" className="font-medium no-underline" style={{ color: 'var(--mm-green)' }}>условия использования</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center" style={{ background: 'var(--mm-bg)' }}><span style={{ color: 'var(--mm-muted)' }}>Загрузка...</span></div>}>
      <RegisterContent />
    </Suspense>
  )
}
