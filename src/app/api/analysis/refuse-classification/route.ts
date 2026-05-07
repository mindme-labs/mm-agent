import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { logEvent } from '@/lib/logger'
import { updateFunnelEvent } from '@/lib/funnel/update-event'

/**
 * POST /api/analysis/refuse-classification
 *
 * Called from `ClassificationRefused.tsx` when the user picks "Связаться с
 * консультантом" instead of choosing a model manually. Doesn't change
 * `wizardState` — the user stays in `classification_refused` and can still
 * return later to pick a model. Logs the intent so support / sales can pick
 * up the lead.
 *
 * Returns: { ok, supportContact }
 */
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    if (user.wizardState !== 'classification_refused') {
      return NextResponse.json(
        { error: `cannot refuse from wizardState='${user.wizardState ?? 'idle'}'` },
        { status: 409 },
      )
    }

    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'global-settings' })
    const supportContact = (settings.supportContact as string | undefined) ?? ''

    await logEvent(user.id, 'classification.refused_contact_requested', undefined, undefined, {
      email: user.email,
      supportContact: supportContact || null,
    })

    // v3.3.1 — funnel: terminal outcome. Helper preserves first-seen
    // timestamps but `outcome` is replace-mode; this transitions the
    // current in_progress row to refused.
    await updateFunnelEvent(user.id, { outcome: 'refused' })

    return NextResponse.json({ ok: true, supportContact })
  } catch (err) {
    console.error('[RefuseClassification] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
