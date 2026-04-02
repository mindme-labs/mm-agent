import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth')
  }

  const headersList = await headers()
  const pathname = headersList.get('x-next-pathname') || ''

  if (!user.hasCompletedOnboarding && !pathname.includes('/onboarding')) {
    redirect('/app/onboarding')
  }

  if (user.hasCompletedOnboarding && pathname.includes('/onboarding')) {
    redirect('/app/inbox')
  }

  return <>{children}</>
}
