import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { resetOnboardingForUser } from '@/lib/demo'

/**
 * GET /api/dev/reset-onboarding
 *
 * Hard-reset the current user's onboarding state for re-testing the wizard.
 * Deletes all recommendations, analysis-results, feedback, and uploaded-files
 * for the user, and resets the wizard state machine to 'idle'. Any
 * in_progress funnel record is marked 'abandoned' (kept as analytics).
 *
 * Auth-required (any logged-in user can reset their own state).
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const result = await resetOnboardingForUser(user.id)

  return NextResponse.json({
    ok: true,
    message: 'Onboarding reset. Files, analysis, and recommendations cleared.',
    deleted: result,
  })
}
