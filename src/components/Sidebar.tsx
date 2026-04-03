'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, CheckSquare, FileSpreadsheet, LogOut } from 'lucide-react'

interface SidebarProps {
  userName?: string
  newCount?: number
}

const tabs = [
  { href: '/app/inbox', label: 'Входящие', icon: Inbox },
  { href: '/app/tasks', label: 'Мои задачи', icon: CheckSquare },
  { href: '/app/data', label: 'Данные', icon: FileSpreadsheet },
]

export function Sidebar({ userName, newCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <span className="text-lg font-bold text-indigo-600">AI-Advisor</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-50 font-medium text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{tab.label}</span>
              {tab.href === '/app/inbox' && newCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                  {newCount > 99 ? '99+' : newCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="mb-2 truncate text-sm text-slate-600">
          {userName || 'Пользователь'}
        </div>
        <a
          href="/api/auth/logout"
          className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </a>
      </div>
    </aside>
  )
}
