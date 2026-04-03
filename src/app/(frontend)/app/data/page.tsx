import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function DataPage() {
  const user = await getCurrentUser()
  if (user && !user.hasCompletedOnboarding) redirect('/app/onboarding')

  return (
    <div className="py-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Данные</h1>
      <p className="text-slate-500">Загрузка данных...</p>
    </div>
  )
}
