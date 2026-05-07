import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import ClassificationResume from '@/components/onboarding/ClassificationResume'
import { hydrateClassificationFromDraft } from '@/lib/classification/hydrate'

/**
 * Return-after-pause page. Reached by layout-side redirect whenever
 * `wizardState === 'awaiting_additional_files'` — the user previously chose
 * "Загружу позже" in the Fork screen and is coming back.
 */
export default async function ResumePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (user.hasCompletedOnboarding) redirect('/app/inbox')
  if (user.wizardState !== 'awaiting_additional_files') {
    redirect('/app/onboarding')
  }

  const payload = await getPayload({ config })
  const [draftResult, settings] = await Promise.all([
    payload.find({
      collection: 'analysis-results',
      where: { owner: { equals: user.id } },
      sort: '-createdAt',
      limit: 1,
    }),
    payload.findGlobal({ slug: 'global-settings' }),
  ])

  const draft = draftResult.docs[0]
  if (!draft) {
    // No draft means we lost classification context somehow — best to send
    // the user back to the start of onboarding.
    redirect('/app/onboarding')
  }

  const classification = hydrateClassificationFromDraft(draft, {
    maxAttempts:
      typeof settings.maxClassificationAttempts === 'number'
        ? settings.maxClassificationAttempts
        : 3,
  })

  return <ClassificationResume classification={classification} />
}
