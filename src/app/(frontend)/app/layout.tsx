import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Sidebar } from '@/components/Sidebar'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth')
  }

  let newCount = 0
  if (user.hasCompletedOnboarding) {
    try {
      const payload = await getPayload({ config })
      const result = await payload.count({
        collection: 'recommendations',
        where: {
          owner: { equals: user.id },
          status: { equals: 'new' },
        },
      })
      newCount = result.totalDocs
    } catch {
      // non-critical
    }
  }

  const isOnboarding = !user.hasCompletedOnboarding

  if (isOnboarding) {
    return (
      <div className="min-h-dvh bg-slate-50">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <Sidebar userName={user.name || user.email} newCount={newCount} />
      <AppHeader userName={user.name || user.email} />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-5xl px-4 pb-20 pt-4 lg:px-8 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomNav newCount={newCount} />
    </div>
  )
}
