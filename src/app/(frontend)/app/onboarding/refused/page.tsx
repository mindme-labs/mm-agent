import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import ClassificationRefused from '@/components/onboarding/ClassificationRefused'

/**
 * AI cannot_classify page. Reached by layout-side redirect whenever
 * `wizardState === 'classification_refused'`. The user picks a model
 * manually here, or escalates to support.
 */
export default async function RefusedPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (user.hasCompletedOnboarding) redirect('/app/inbox')
  if (user.wizardState !== 'classification_refused') {
    redirect('/app/onboarding')
  }

  return <ClassificationRefused />
}
