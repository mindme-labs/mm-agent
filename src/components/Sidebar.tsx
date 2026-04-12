'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, CheckSquare, FileSpreadsheet, LogOut } from 'lucide-react'

interface SidebarProps {
  userName?: string
  newCount?: number
  overdueCount?: number
}

const tabs = [
  { href: '/app/inbox', label: 'Входящие', icon: Inbox, badgeKey: 'new' as const },
  { href: '/app/tasks', label: 'Мои задачи', icon: CheckSquare, badgeKey: 'overdue' as const },
  { href: '/app/data', label: 'Данные', icon: FileSpreadsheet, badgeKey: null },
]

export function Sidebar({ userName, newCount = 0, overdueCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  const badges = { new: newCount, overdue: overdueCount }

  return (
    <aside
      className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-[260px] lg:flex-col"
      style={{ background: 'var(--mm-white)', borderRight: '1px solid var(--mm-border)' }}
    >
      <div className="flex h-16 items-center px-6" style={{ borderBottom: '1px solid var(--mm-border)' }}>
        <span className="text-[18px] font-bold" style={{ color: 'var(--mm-ink)' }}>
          mm<span style={{ color: 'var(--mm-green)' }}>labs</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          const Icon = tab.icon
          const badgeCount = tab.badgeKey ? badges[tab.badgeKey] : 0
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors"
              style={{
                background: isActive ? 'var(--mm-green-bg)' : 'transparent',
                color: isActive ? 'var(--mm-green)' : 'var(--mm-ink2)',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{tab.label}</span>
              {badgeCount > 0 && (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                  style={{ background: tab.badgeKey === 'overdue' ? 'var(--mm-red)' : 'var(--mm-green)' }}
                >
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid var(--mm-border)' }}>
        <div className="mb-2 truncate text-[13px]" style={{ color: 'var(--mm-muted)' }}>
          {userName || 'Пользователь'}
        </div>
        <a
          href="/api/auth/logout"
          className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors"
          style={{ color: 'var(--mm-muted)' }}
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </a>
      </div>
    </aside>
  )
}
