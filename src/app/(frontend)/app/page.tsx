import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function AppRootPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  if (user.hasCompletedOnboarding) {
    redirect('/app/inbox')
  }

  redirect('/app/onboarding')
}
