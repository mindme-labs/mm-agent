import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { FinancialSummaryPanel } from '@/components/FinancialSummaryPanel'
import { InboxFeed } from '@/components/InboxFeed'

export default async function InboxPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (!user.hasCompletedOnboarding) redirect('/app/onboarding')

  const payload = await getPayload({ config })

  const [analysisResult, recommendations] = await Promise.all([
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
        />
      )}

      <h2 className="mb-4 text-lg font-semibold text-slate-900">Рекомендации</h2>

      <InboxFeed initialRecs={recs} />
    </div>
  )
}
