'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, CheckSquare, FileSpreadsheet } from 'lucide-react'

interface BottomNavProps {
  newCount?: number
  overdueCount?: number
}

const tabs = [
  { href: '/app/inbox', label: 'Входящие', icon: Inbox, badgeKey: 'new' as const },
  { href: '/app/tasks', label: 'Задачи', icon: CheckSquare, badgeKey: 'overdue' as const },
  { href: '/app/data', label: 'Данные', icon: FileSpreadsheet, badgeKey: null },
]

export function BottomNav({ newCount = 0, overdueCount = 0 }: BottomNavProps) {
  const pathname = usePathname()
  const badges = { new: newCount, overdue: overdueCount }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
      style={{
        background: 'rgba(255,255,255,.92)',
        backdropFilter: 'blur(14px)',
        borderTop: '1px solid var(--mm-border)',
      }}
    >
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          const Icon = tab.icon
          const badgeCount = tab.badgeKey ? badges[tab.badgeKey] : 0
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-3 text-[11px] transition-colors"
              style={{
                color: isActive ? 'var(--mm-green)' : 'var(--mm-muted)',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badgeCount > 0 && (
                  <span
                    className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ background: tab.badgeKey === 'overdue' ? 'var(--mm-red)' : 'var(--mm-green)' }}
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
