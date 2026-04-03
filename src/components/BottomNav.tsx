'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, CheckSquare, FileSpreadsheet } from 'lucide-react'

interface BottomNavProps {
  newCount?: number
}

const tabs = [
  { href: '/app/inbox', label: 'Входящие', icon: Inbox },
  { href: '/app/tasks', label: 'Мои задачи', icon: CheckSquare },
  { href: '/app/data', label: 'Данные', icon: FileSpreadsheet },
]

export function BottomNav({ newCount = 0 }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/80 backdrop-blur-sm lg:hidden">
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-3 text-xs transition-colors ${
                isActive
                  ? 'font-medium text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {tab.href === '/app/inbox' && newCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {newCount > 99 ? '99+' : newCount}
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
