import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { DataView } from '@/components/DataView'
import Link from 'next/link'

export default async function DataPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (user && !user.hasCompletedOnboarding) redirect('/app/onboarding')

  const payload = await getPayload({ config })

  const [filesResult, analysisResult] = await Promise.all([
    payload.find({
      collection: 'uploaded-files',
      where: { owner: { equals: user.id } },
      sort: '-createdAt',
      limit: 50,
    }),
    payload.find({
      collection: 'analysis-results',
      where: { owner: { equals: user.id } },
      limit: 1,
      sort: '-createdAt',
    }),
  ])

  const files = filesResult.docs.map((doc) => ({
    id: doc.id,
    originalName: doc.originalName ?? 'Без имени',
    detectedType: doc.detectedType ?? undefined,
    accountCode: doc.accountCode ?? undefined,
    period: doc.period ?? undefined,
    parseStatus: (doc.parseStatus ?? 'pending') as 'pending' | 'recognizing' | 'parsing' | 'success' | 'warning' | 'error',
    createdAt: doc.createdAt,
  }))

  const analysis = analysisResult.docs[0]

  type Debtor = { name: string; amount: number; share: number }
  type Creditor = { name: string; amount: number; hasAdvance: boolean }

  let topDebtors: Debtor[] = []
  let topCreditors: Creditor[] = []

  if (analysis) {
    if (Array.isArray(analysis.topDebtors)) {
      topDebtors = analysis.topDebtors as Debtor[]
    }
    if (Array.isArray(analysis.topCreditors)) {
      topCreditors = analysis.topCreditors as Creditor[]
    }
  }

  const metrics = analysis ? {
    revenue: analysis.revenue ?? 0,
    cogs: analysis.cogs ?? 0,
    grossProfit: analysis.grossProfit ?? 0,
    grossMargin: analysis.grossMargin ?? 0,
    accountsReceivable: analysis.accountsReceivable ?? 0,
    accountsPayable: analysis.accountsPayable ?? 0,
    inventory: analysis.inventory ?? 0,
    arTurnoverDays: analysis.arTurnoverDays ?? 0,
    apTurnoverDays: analysis.apTurnoverDays ?? 0,
    inventoryTurnoverDays: analysis.inventoryTurnoverDays ?? 0,
    healthIndex: (analysis.healthIndex as 'fine' | 'issues' | 'risky') ?? undefined,
    period: analysis.period ?? undefined,
  } : null

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl"
          style={{ color: 'var(--mm-ink)', letterSpacing: '-.02em' }}>
          Данные
        </h1>
        <Link
          href="/app"
          className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-85"
          style={{ background: 'var(--mm-ink)', color: '#fff' }}>
          Загрузить файлы
        </Link>
      </div>

      <DataView
        files={files}
        metrics={metrics}
        topDebtors={topDebtors}
        topCreditors={topCreditors}
      />
    </div>
  )
}
