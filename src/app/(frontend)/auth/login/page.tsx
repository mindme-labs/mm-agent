'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Заполните все поля')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || data.errors) {
        setError('Неверный email или пароль')
        return
      }
      window.location.href = '/app'
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
            <Link
              href="/auth/register"
              className="flex-1 rounded-lg py-2.5 text-center text-[15px] font-semibold no-underline"
              style={{ color: 'var(--mm-muted)' }}
            >
              Регистрация
            </Link>
            <div
              className="flex-1 rounded-lg py-2.5 text-center text-[15px] font-semibold text-white"
              style={{ background: 'var(--mm-ink)' }}
            >
              Вход
            </div>
          </div>

          <h1 className="mb-1.5 text-[26px] font-extrabold lg:text-[28px]" style={{ letterSpacing: '-.02em', color: 'var(--mm-ink)' }}>
            Вход
          </h1>
          <p className="mb-7 text-[15px] leading-[1.55] lg:text-[16px]" style={{ color: 'var(--mm-ink2)' }}>
            Email и пароль, указанные при регистрации.
          </p>

          {error && (
            <div className="mb-4 rounded-lg px-4 py-3 text-[14px] font-medium" style={{ background: 'var(--mm-red-bg)', color: 'var(--mm-red)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-[18px]">
              <label className="mb-1.5 block text-[14px] font-semibold" style={{ color: 'var(--mm-ink)' }}>Email</label>
              <input
                type="email"
                placeholder="your@company.ru"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border-[1.5px] px-4 py-[13px] text-[15px] outline-none transition-colors focus:border-[var(--mm-green)]"
                style={{ borderColor: 'var(--mm-border)', background: 'var(--mm-white)', fontFamily: 'inherit' }}
              />
            </div>
            <div className="mb-[18px]">
              <label className="mb-1.5 block text-[14px] font-semibold" style={{ color: 'var(--mm-ink)' }}>Пароль</label>
              <input
                type="password"
                placeholder="Ваш пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border-[1.5px] px-4 py-[13px] text-[15px] outline-none transition-colors focus:border-[var(--mm-green)]"
                style={{ borderColor: 'var(--mm-border)', background: 'var(--mm-white)', fontFamily: 'inherit' }}
              />
              <div className="mt-[5px] text-[12px]">
                <a href="#" className="font-medium no-underline" style={{ color: 'var(--mm-green)' }}>Забыли пароль?</a>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg py-[14px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--mm-green)', fontFamily: 'inherit' }}
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className="mt-[18px] text-center text-[14px]" style={{ color: 'var(--mm-muted)' }}>
            Нет аккаунта?{' '}
            <Link href="/auth/register" className="font-medium no-underline" style={{ color: 'var(--mm-green)' }}>Зарегистрироваться</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
