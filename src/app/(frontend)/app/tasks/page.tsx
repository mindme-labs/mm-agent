import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { TasksView } from '@/components/TasksView'

export default async function TasksPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (!user.hasCompletedOnboarding) redirect('/app/onboarding')

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'recommendations',
    where: {
      owner: { equals: user.id },
      status: { in: ['in_progress', 'resolved', 'stuck', 'dismissed'] },
    },
    sort: '-createdAt',
    limit: 100,
  })

  const now = new Date()

  const tasks = result.docs.map((doc) => ({
    id: doc.id,
    ruleCode: doc.ruleCode,
    ruleName: doc.ruleName,
    priority: doc.priority as 'critical' | 'high' | 'medium' | 'low',
    title: doc.title,
    description: doc.description,
    status: doc.status as 'in_progress' | 'resolved' | 'stuck' | 'dismissed',
    impactAmount: doc.impactAmount ?? undefined,
    impactDirection: doc.impactDirection ?? undefined,
    takenAt: doc.takenAt ? new Date(doc.takenAt as string).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : undefined,
    dueDate: doc.dueDate ? (doc.dueDate as string) : undefined,
    dueDateDisplay: doc.dueDate
      ? new Date(doc.dueDate as string).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      : undefined,
    isOverdue: doc.dueDate
      ? ['in_progress', 'stuck'].includes(doc.status) && new Date(doc.dueDate as string) < now
      : false,
    overdueDays: doc.dueDate && ['in_progress', 'stuck'].includes(doc.status) && new Date(doc.dueDate as string) < now
      ? Math.ceil((now.getTime() - new Date(doc.dueDate as string).getTime()) / 86400000)
      : 0,
  }))

  return <TasksView initialTasks={tasks} />
}
