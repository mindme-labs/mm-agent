'use client'

import { LogOut } from 'lucide-react'

interface AppHeaderProps {
  userName?: string
}

export function AppHeader({ userName }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-sm lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <span className="text-lg font-bold text-indigo-600">MMLabs</span>
        <div className="flex items-center gap-3">
          <span className="max-w-[140px] truncate text-sm text-slate-600">
            {userName || 'Пользователь'}
          </span>
          <a
            href="/api/auth/logout"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Выйти"
          >
            <LogOut className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  )
}
