import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function OnboardingPage() {
  const user = await getCurrentUser()
  if (user?.hasCompletedOnboarding) redirect('/app/inbox')

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="text-center text-slate-500">Онбординг — загрузка...</div>
    </div>
  )
}
