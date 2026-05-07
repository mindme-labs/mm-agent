import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import FunnelDashboard from '@/components/admin/FunnelDashboard'

/**
 * Admin-only onboarding funnel dashboard. Lives at /app/admin/funnel
 * inside the existing CEO-app shell so admins navigating from Payload
 * Admin land in a familiar layout.
 */
export default async function FunnelDashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (user.role !== 'admin') redirect('/app/inbox')

  return <FunnelDashboard />
}
