/**
 * Cron-driven sweep that flips long-idle in_progress funnel records to
 * outcome='abandoned'. Default cutoff: 24 hours since last update.
 *
 * Uses the OnboardingFunnelEvents collection's `update: () => false` access
 * rule loophole: server-side `payload.update()` calls bypass collection
 * access checks, so this helper can write where API consumers can't.
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { logEvent } from '@/lib/logger'

const DEFAULT_CUTOFF_HOURS = 24

export interface SweepResult {
  swept: number
  cutoffHours: number
}

export async function sweepAbandoned(cutoffHours = DEFAULT_CUTOFF_HOURS): Promise<SweepResult> {
  const payload = await getPayload({ config })
  const cutoff = new Date(Date.now() - cutoffHours * 60 * 60 * 1000).toISOString()

  const stale = await payload.find({
    collection: 'onboarding-funnel-events',
    where: {
      outcome: { equals: 'in_progress' },
      updatedAt: { less_than: cutoff },
    },
    limit: 200,
  })

  let swept = 0
  for (const record of stale.docs) {
    try {
      await payload.update({
        collection: 'onboarding-funnel-events',
        id: record.id,
        data: {
          outcome: 'abandoned',
          abandonedAt: new Date().toISOString(),
        },
      })
      swept++

      const ownerId =
        typeof record.owner === 'string'
          ? record.owner
          : (record.owner?.id as string | undefined)

      if (ownerId) {
        await logEvent(ownerId, 'wizard.abandoned', 'onboarding-funnel-events', String(record.id), {
          attemptNumber: record.attemptNumber,
          hoursIdle:
            record.updatedAt
              ? Math.round((Date.now() - new Date(record.updatedAt).getTime()) / 3600000)
              : null,
        })
      }
    } catch (err) {
      console.error('[funnel] sweep update failed for', record.id, err)
    }
  }

  console.log(`[funnel] swept ${swept} of ${stale.docs.length} abandoned onboardings`)
  return { swept, cutoffHours }
}
