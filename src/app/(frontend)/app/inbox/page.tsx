import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { FinancialSummaryPanel } from '@/components/FinancialSummaryPanel'
import { InboxFeed } from '@/components/InboxFeed'
import { TasksSummaryBanner } from '@/components/TasksSummaryBanner'

export default async function InboxPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (!user.hasCompletedOnboarding) redirect('/app/onboarding')

  const payload = await getPayload({ config })
  const now = new Date()

  const [analysisResult, recommendations, activeTasks] = await Promise.all([
    payload.find({
      collection: 'analysis-results',
      where: { owner: { equals: user.id } },
      limit: 1,
      sort: '-createdAt',
    }),
    payload.find({
      collection: 'recommendations',
      where: {
        owner: { equals: user.id },
        status: { equals: 'new' },
      },
      sort: 'priority',
      limit: 50,
    }),
    payload.find({
      collection: 'recommendations',
      where: {
        owner: { equals: user.id },
        status: { in: ['in_progress', 'stuck'] },
      },
      limit: 200,
    }),
  ])

  const analysis = analysisResult.docs[0]
  const recs = recommendations.docs.map((doc) => ({
    id: doc.id,
    ruleCode: doc.ruleCode,
    ruleName: doc.ruleName,
    priority: doc.priority as 'critical' | 'high' | 'medium' | 'low',
    title: doc.title,
    description: doc.description,
    shortRecommendation: doc.shortRecommendation ?? undefined,
    fullText: doc.fullText ?? undefined,
    status: doc.status,
    impactMetric: doc.impactMetric ?? undefined,
    impactDirection: doc.impactDirection ?? undefined,
    impactAmount: doc.impactAmount ?? undefined,
    isAiGenerated: doc.isAiGenerated ?? false,
    isDemo: doc.isDemo ?? false,
  }))

  const inProgressTasks = activeTasks.docs
  const inProgressCount = inProgressTasks.length
  const inProgressAmount = inProgressTasks.reduce((s, t) => s + ((t.impactAmount as number) ?? 0), 0)

  const overdueTasks = inProgressTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate as string) < now
  )
  const overdueCount = overdueTasks.length
  const overdueAmount = overdueTasks.reduce((s, t) => s + ((t.impactAmount as number) ?? 0), 0)

  // Trial info
  let trialDaysLeft: number | undefined
  let trialEndsAt: string | undefined
  if (user.trialExpiresAt) {
    const exp = new Date(user.trialExpiresAt as string)
    const diff = Math.ceil((exp.getTime() - Date.now()) / 86400000)
    trialDaysLeft = Math.max(0, diff)
    trialEndsAt = exp.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  }

  return (
    <div className="py-6">
      {analysis && (
        <FinancialSummaryPanel
          revenue={analysis.revenue ?? 0}
          accountsReceivable={analysis.accountsReceivable ?? 0}
          accountsPayable={analysis.accountsPayable ?? 0}
          newCount={recs.length}
          grossMargin={analysis.grossMargin ?? undefined}
          arTurnoverDays={analysis.arTurnoverDays ?? undefined}
          apTurnoverDays={analysis.apTurnoverDays ?? undefined}
          healthIndex={(analysis.healthIndex as 'fine' | 'issues' | 'risky') ?? undefined}
          period={analysis.period ?? undefined}
          trialDaysLeft={trialDaysLeft}
          trialEndsAt={trialEndsAt}
        />
      )}

      {inProgressCount > 0 && (
        <TasksSummaryBanner
          inProgressCount={inProgressCount}
          inProgressAmount={inProgressAmount}
          overdueCount={overdueCount}
          overdueAmount={overdueAmount}
        />
      )}

      <div className="mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--mm-muted)' }}>
          Требуют внимания — {recs.length} {recs.length === 1 ? 'ситуация' : recs.length < 5 ? 'ситуации' : 'ситуаций'}
        </h2>
      </div>

      <InboxFeed initialRecs={recs} />
    </div>
  )
}
