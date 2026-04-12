'use client'

import { LogOut } from 'lucide-react'

interface AppHeaderProps {
  userName?: string
}

export function AppHeader({ userName }: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 lg:hidden"
      style={{
        background: 'rgba(248,247,244,.96)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--mm-border)',
      }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <span className="text-[17px] font-bold" style={{ color: 'var(--mm-ink)' }}>
          mm<span style={{ color: 'var(--mm-green)' }}>labs</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="max-w-[140px] truncate text-[13px]" style={{ color: 'var(--mm-muted)' }}>
            {userName || 'Пользователь'}
          </span>
          <a
            href="/api/auth/logout"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--mm-muted)' }}
            title="Выйти"
          >
            <LogOut className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  )
}
