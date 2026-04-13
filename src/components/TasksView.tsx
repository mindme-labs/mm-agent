'use client'

import { useState } from 'react'

interface Task {
  id: string
  ruleCode: string
  ruleName: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  status: 'in_progress' | 'resolved' | 'stuck' | 'dismissed'
  impactAmount?: number
  impactDirection?: string
  takenAt?: string
  dueDate?: string
  dueDateDisplay?: string
  isOverdue: boolean
  overdueDays: number
}

type TabFilter = 'all' | 'in_progress' | 'resolved' | 'stuck' | 'dismissed'
type ViewMode = 'table' | 'cards'

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Критично',
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
}

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'В работе',
  resolved: 'Решена',
  stuck: 'Зависла',
  dismissed: 'Отклонена',
}

const STATUS_SELECT_OPTIONS = [
  { value: 'in_progress', label: 'В работе' },
  { value: 'resolved', label: 'Решена' },
  { value: 'stuck', label: 'Зависла' },
  { value: 'dismissed', label: 'Отклонена' },
]

function formatAmount(n?: number): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `₽${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₽${Math.round(n / 1_000)}K`
  return `₽${n}`
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'in_progress': return { background: 'var(--mm-amber-bg)', color: 'var(--mm-amber)' }
    case 'resolved': return { background: 'var(--mm-green-bg)', color: 'var(--mm-green)' }
    case 'stuck': return { background: 'var(--mm-red-bg)', color: 'var(--mm-red)' }
    default: return { background: '#F1F0EC', color: 'var(--mm-muted)' }
  }
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'var(--mm-red)'
    case 'high': return 'var(--mm-amber)'
    case 'medium': return 'var(--mm-yellow)'
    default: return 'var(--mm-muted)'
  }
}

export function TasksView({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [tab, setTab] = useState<TabFilter>('all')
  const [view, setView] = useState<ViewMode>('table')

  const overdueTasks = tasks.filter(t => t.isOverdue)
  const overdueCount = overdueTasks.length
  const overdueAmount = overdueTasks.reduce((s, t) => s + (t.impactAmount ?? 0), 0)

  const inProgressAmount = tasks.filter(t => t.status === 'in_progress').reduce((s, t) => s + (t.impactAmount ?? 0), 0)
  const resolvedAmount = tasks.filter(t => t.status === 'resolved').reduce((s, t) => s + (t.impactAmount ?? 0), 0)
  const inProgressCount = tasks.filter(t => ['in_progress', 'stuck'].includes(t.status)).length

  const filtered = tab === 'all' ? tasks : tasks.filter(t => t.status === tab)

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/recommendations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as Task['status'] } : t))
    } catch (err) {
      console.error('Status update failed:', err)
    }
  }

  return (
    <div className="py-6">
      {/* Summary strip */}
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight lg:text-3xl" style={{ color: 'var(--mm-ink)', letterSpacing: '-.02em' }}>
        Мои задачи
      </h1>

      <div className="mb-5 flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {[
          { label: 'В работе', value: formatAmount(inProgressAmount), color: undefined },
          { label: 'Просрочено', value: formatAmount(overdueAmount), color: 'var(--mm-red)' },
          { label: 'Решено', value: formatAmount(resolvedAmount), color: 'var(--mm-green)' },
          { label: 'Всего задач', value: String(tasks.length), color: undefined },
        ].map(({ label, value, color }) => (
          <div key={label} className="min-w-[130px] shrink-0 rounded-xl border px-5 py-4"
            style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
            <div className="mb-1 text-xs font-medium" style={{ color: 'var(--mm-muted)' }}>{label}</div>
            <div className="text-2xl font-extrabold leading-none tracking-tight"
              style={{ color: color ?? 'var(--mm-ink)', letterSpacing: '-.02em' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border px-5 py-3 text-sm font-medium"
          style={{ background: 'var(--mm-red-bg)', borderColor: 'rgba(192,57,43,.1)', color: 'var(--mm-red)' }}>
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--mm-red)' }} />
          {overdueCount} {overdueCount === 1 ? 'задача просрочена' : 'задачи просрочены'} на общую сумму {formatAmount(overdueAmount)}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'var(--mm-green-bg)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M7 13l3 3 7-7" stroke="var(--mm-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--mm-ink)' }}>Нет активных задач</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--mm-muted)' }}>
            Возьмите рекомендации из Входящих в работу
          </p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-0.5 rounded-lg border p-0.5"
              style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
              {([
                { key: 'all', label: 'Все' },
                { key: 'in_progress', label: 'В работе', badge: inProgressCount },
                { key: 'resolved', label: 'Решены' },
                { key: 'stuck', label: 'Зависли' },
                { key: 'dismissed', label: 'Отклонены' },
              ] as const).map((item) => (
                <button
                  key={key}
                  onClick={() => setTab(item.key as TabFilter)}
                  className="relative rounded-md px-3 py-2 text-xs font-semibold transition-colors"
                  style={{
                    background: tab === item.key ? 'var(--mm-ink)' : 'none',
                    color: tab === item.key ? '#fff' : 'var(--mm-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                  {item.label}
                  {'badge' in item && item.badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                      style={{ background: 'var(--mm-red)' }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-0.5 rounded-lg border p-0.5"
              style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
              <button
                onClick={() => setView('table')}
                title="Таблица"
                className="rounded-md px-3 py-2 transition-colors"
                style={{
                  background: view === 'table' ? 'var(--mm-ink)' : 'none',
                  color: view === 'table' ? '#fff' : 'var(--mm-muted)',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">Таблица</span>
              </button>
              <button
                onClick={() => setView('cards')}
                title="Карточки"
                className="rounded-md px-3 py-2 transition-colors"
                style={{
                  background: view === 'cards' ? 'var(--mm-ink)' : 'none',
                  color: view === 'cards' ? '#fff' : 'var(--mm-muted)',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                <span className="hidden sm:inline">Карточки</span>
              </button>
            </div>
          </div>

          {/* Table view */}
          {view === 'table' && (
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' as const }}>
              <table style={{
                width: '100%', borderCollapse: 'separate', borderSpacing: 0,
                background: 'var(--mm-white)', border: '1px solid var(--mm-border)',
                borderRadius: 12, overflow: 'hidden', minWidth: 500,
              }}>
                <thead>
                  <tr>
                    {['Задача', 'Сумма', 'Срок', 'Статус'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', fontSize: 12, fontWeight: 600,
                        color: 'var(--mm-muted)', padding: '14px 18px',
                        borderBottom: '1px solid var(--mm-border)', letterSpacing: '.03em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => (
                    <tr key={task.id}
                      style={{ background: task.isOverdue ? 'var(--mm-red-bg)' : undefined }}>
                      <td style={{ padding: '16px 18px', borderBottom: '1px solid var(--mm-border)', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--mm-ink)', lineHeight: 1.3, marginBottom: 2 }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--mm-muted)' }}>{task.ruleName}</div>
                      </td>
                      <td style={{ padding: '16px 18px', borderBottom: '1px solid var(--mm-border)', verticalAlign: 'top', fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', color: task.isOverdue ? 'var(--mm-red)' : 'var(--mm-ink)' }}>
                        {formatAmount(task.impactAmount)}
                      </td>
                      <td style={{ padding: '16px 18px', borderBottom: '1px solid var(--mm-border)', verticalAlign: 'top', fontSize: 14, whiteSpace: 'nowrap', color: task.isOverdue ? 'var(--mm-red)' : 'var(--mm-ink)', fontWeight: task.isOverdue ? 600 : undefined }}>
                        {task.isOverdue && task.dueDateDisplay
                          ? `${task.dueDateDisplay} (просрочена ${task.overdueDays} дн.)`
                          : task.dueDateDisplay ?? '—'}
                      </td>
                      <td style={{ padding: '16px 18px', borderBottom: '1px solid var(--mm-border)', verticalAlign: 'top' }}>
                        <select
                          value={task.status}
                          onChange={e => updateStatus(task.id, e.target.value)}
                          style={{
                            ...statusStyle(task.status),
                            fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
                            border: 'none', cursor: 'pointer', fontFamily: 'inherit', appearance: 'none',
                          }}>
                          {STATUS_SELECT_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cards view */}
          {view === 'cards' && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {filtered.map((task) => (
                <div key={task.id} className="rounded-xl border p-6 transition-colors"
                  style={{
                    background: 'var(--mm-white)',
                    borderColor: task.isOverdue ? 'rgba(192,57,43,.25)' : 'var(--mm-border)',
                    borderTop: task.isOverdue ? '3px solid var(--mm-red)' : undefined,
                  }}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: priorityColor(task.priority) }}>
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                    <span className="text-lg font-extrabold tracking-tight"
                      style={{ color: task.isOverdue ? 'var(--mm-red)' : task.status === 'resolved' ? 'var(--mm-green)' : 'var(--mm-ink)', letterSpacing: '-.02em' }}>
                      {formatAmount(task.impactAmount)}
                    </span>
                  </div>
                  <div className="mb-2 text-base font-bold leading-snug" style={{ color: 'var(--mm-ink)' }}>
                    {task.title}
                  </div>
                  <div className="mb-3 flex flex-wrap gap-3 text-xs" style={{ color: 'var(--mm-muted)' }}>
                    {task.takenAt && <span>Взята {task.takenAt}</span>}
                    {task.isOverdue
                      ? <span style={{ color: 'var(--mm-red)', fontWeight: 600 }}>Просрочена {task.overdueDays} дней</span>
                      : task.dueDateDisplay && <span>Срок: {task.dueDateDisplay}</span>
                    }
                  </div>
                  <select
                    value={task.status}
                    onChange={e => updateStatus(task.id, e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--mm-border)', background: 'var(--mm-white)', color: 'var(--mm-ink)', fontFamily: 'inherit', cursor: 'pointer' }}>
                    {STATUS_SELECT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
