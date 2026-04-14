import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Sidebar } from '@/components/Sidebar'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { TrialExpiryBanner } from '@/components/TrialExpiryBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  const isExpired = user.mode === 'expired' || (
    user.mode === 'trial' && user.trialExpiresAt &&
    new Date(user.trialExpiresAt as string) < new Date()
  )

  let trialDaysLeft: number | undefined
  if (user.mode === 'trial' && user.trialExpiresAt) {
    const diff = Math.ceil((new Date(user.trialExpiresAt as string).getTime() - Date.now()) / 86400000)
    trialDaysLeft = Math.max(0, diff)
  }

  let newCount = 0
  let overdueCount = 0
  if (user.hasCompletedOnboarding && !isExpired) {
    try {
      const payload = await getPayload({ config })
      const newResult = await payload.count({
        collection: 'recommendations',
        where: {
          owner: { equals: user.id },
          status: { equals: 'new' },
        },
      })
      newCount = newResult.totalDocs

      const inProgressAndStuck = await payload.find({
        collection: 'recommendations',
        where: {
          owner: { equals: user.id },
          status: { in: ['in_progress', 'stuck'] },
          dueDate: { less_than: new Date().toISOString() },
        },
        limit: 0,
      })
      overdueCount = inProgressAndStuck.totalDocs
    } catch {
      // non-critical
    }
  }

  const isOnboarding = !user.hasCompletedOnboarding

  if (isOnboarding) {
    return (
      <div className="min-h-dvh" style={{ background: 'var(--mm-bg)' }}>
        {children}
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="min-h-dvh" style={{ background: 'var(--mm-bg)' }}>
        <div className="mx-auto max-w-[920px] px-4 py-8 lg:px-7">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--mm-bg)' }}>
      <Sidebar userName={user.name || user.email} newCount={newCount} overdueCount={overdueCount} />
      <AppHeader userName={user.name || user.email} />
      <div className="lg:pl-[260px]">
        <main className="mx-auto max-w-[920px] px-4 pb-20 pt-4 lg:px-7 lg:pb-6">
          {trialDaysLeft != null && trialDaysLeft <= 3 && trialDaysLeft > 0 && (
            <TrialExpiryBanner daysLeft={trialDaysLeft} />
          )}
          {children}
        </main>
      </div>
      <BottomNav newCount={newCount} overdueCount={overdueCount} />
    </div>
  )
}
