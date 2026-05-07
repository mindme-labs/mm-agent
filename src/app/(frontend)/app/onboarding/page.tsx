import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import ClassificationConfirm from '@/components/onboarding/ClassificationConfirm'
import ClassificationDegraded from '@/components/onboarding/ClassificationDegraded'
import ClassificationFork from '@/components/onboarding/ClassificationFork'
import AnalyzingProgress from '@/components/onboarding/AnalyzingProgress'
import { hydrateClassificationFromDraft } from '@/lib/classification/hydrate'

/**
 * Page-level wizardState switch. Server-renders the right view based on
 * `users.wizardState`. The layout (`/app/layout.tsx`) handles redirects for
 * `awaiting_additional_files` and `classification_refused`, so we don't see
 * those states here.
 */
export default async function OnboardingPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (user.hasCompletedOnboarding) redirect('/app/inbox')

  const wizardState = user.wizardState ?? 'idle'

  // States that need the classification draft + global settings to render.
  if (wizardState === 'awaiting_confirmation') {
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
      // Race: wizard says awaiting_confirmation but no draft yet. Fall back
      // to the wizard so the user can re-trigger or upload more files.
      return <OnboardingWizard />
    }

    const classification = hydrateClassificationFromDraft(draft, {
      maxAttempts:
        typeof settings.maxClassificationAttempts === 'number'
          ? settings.maxClassificationAttempts
          : 3,
    })

    if (classification.persistedStatus === 'degraded') {
      return <ClassificationDegraded classification={classification} />
    }
    if (classification.status === 'needs_data') {
      return <ClassificationFork classification={classification} />
    }
    return (
      <ClassificationConfirm
        classification={classification}
        autoConfirmEnabled={settings.classificationAutoConfirmEnabled === true}
        autoConfirmThreshold={
          typeof settings.classificationAutoConfirmThreshold === 'number'
            ? settings.classificationAutoConfirmThreshold
            : 0.85
        }
      />
    )
  }

  if (wizardState === 'analyzing' || wizardState === 'enhancing') {
    return <AnalyzingProgress />
  }

  // 'classifying' — the AI is mid-call. The OnboardingWizard's analysis
  // screen polls and will move on once the wizardState transitions out.
  // 'idle' / 'uploading' / 'recognizing' / 'extracting' — initial wizard.
  return <OnboardingWizard />
}
