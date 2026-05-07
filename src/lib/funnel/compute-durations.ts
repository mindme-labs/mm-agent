/**
 * Computes the 8 `durationXxx` fields on a funnel-event record. Called at
 * onboarding finalization (analysis/run) so the admin dashboard has
 * pre-computed gap-times to chart without re-running aggregations.
 *
 * Each duration is `<later> - <earlier>` in milliseconds, or null if either
 * side is missing.
 */

import type { OnboardingFunnelEvent } from '@/payload-types'

type DateLike = string | null | undefined

function ms(later: DateLike, earlier: DateLike): number | null {
  if (!later || !earlier) return null
  const a = new Date(later).getTime()
  const b = new Date(earlier).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  if (a < b) return null
  return a - b
}

export interface ComputedDurations {
  durationToUpload: number | null
  durationUpload: number | null
  durationRecognition: number | null
  durationExtraction: number | null
  durationClassification: number | null
  durationConfirmation: number | null
  durationAnalysis: number | null
  durationTotal: number | null
}

export function computeDurations(record: OnboardingFunnelEvent): ComputedDurations {
  const startedAt = record.startedAt as DateLike
  const uploadStartedAt = record.uploadStartedAt as DateLike
  const minimumSetCompletedAt = record.minimumSetCompletedAt as DateLike
  const recommendedSetCompletedAt = record.recommendedSetCompletedAt as DateLike
  const classificationStartedAt = record.classificationStartedAt as DateLike
  const classificationCompletedAt = record.classificationCompletedAt as DateLike
  const confirmationCompletedAt = record.confirmationCompletedAt as DateLike
  const analysisCompletedAt = record.analysisCompletedAt as DateLike

  // Recognition + extraction don't have their own start markers in the
  // schema — they nest under the upload->minimum-set window. We approximate
  // by attributing the post-minimum-set tail to (recognition + extraction).
  // Until iter-22's spec adds discrete markers, these stay null when we
  // can't compute them.
  return {
    durationToUpload: ms(uploadStartedAt, startedAt),
    durationUpload: ms(minimumSetCompletedAt, uploadStartedAt),
    durationRecognition: ms(recommendedSetCompletedAt, minimumSetCompletedAt),
    durationExtraction: ms(classificationStartedAt, recommendedSetCompletedAt ?? minimumSetCompletedAt),
    durationClassification: ms(classificationCompletedAt, classificationStartedAt),
    durationConfirmation: ms(confirmationCompletedAt, classificationCompletedAt),
    durationAnalysis: ms(analysisCompletedAt, confirmationCompletedAt),
    durationTotal: ms(analysisCompletedAt, startedAt),
  }
}
