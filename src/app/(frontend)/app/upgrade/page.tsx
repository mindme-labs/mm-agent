import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function UpgradePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const isExpired = user.mode === 'expired' || (
    user.mode === 'trial' && user.trialExpiresAt &&
    new Date(user.trialExpiresAt as string) < new Date()
  )

  if (!isExpired && user.mode !== 'trial') {
    redirect('/app/inbox')
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'var(--mm-amber-bg)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="var(--mm-amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="mb-3 text-2xl font-extrabold tracking-tight lg:text-3xl"
          style={{ color: 'var(--mm-ink)', letterSpacing: '-.02em' }}>
          {isExpired ? 'Триал-период завершён' : 'Обновите тариф'}
        </h1>

        <p className="mb-6 text-base leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>
          {isExpired
            ? 'Ваш бесплатный период закончился. Для продолжения работы с рекомендациями свяжитесь с нами для подключения полного доступа.'
            : 'Для доступа ко всем возможностям платформы свяжитесь с нами.'}
        </p>

        <div className="mb-6 rounded-xl border p-5"
          style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
          <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--mm-ink)' }}>
            Полный доступ включает:
          </div>
          <ul className="space-y-2 text-left text-sm" style={{ color: 'var(--mm-ink2)' }}>
            {[
              'Неограниченный анализ данных',
              'AI-аудит оборотного капитала',
              'Генерация текстов писем и офферов',
              'Приоритетная поддержка',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
                  <path d="M7 13l3 3 7-7" stroke="var(--mm-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <a
          href="mailto:hello@mmlabs.ru?subject=Подключение полного доступа"
          className="mb-3 block w-full rounded-xl py-4 text-center text-base font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--mm-green)' }}>
          Написать нам
        </a>

        <a href="/api/auth/logout"
          className="text-sm font-medium" style={{ color: 'var(--mm-muted)' }}>
          Выйти из аккаунта
        </a>
      </div>
    </div>
  )
}
