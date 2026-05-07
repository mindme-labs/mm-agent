/**
 * Idempotent funnel-event helper.
 *
 * Every endpoint that touches the onboarding pipeline calls
 * `updateFunnelEvent(userId, patch)` instead of emitting raw events. The
 * helper merges into the user's current `in_progress` row (or creates a
 * new one), and applies different merge rules per field type:
 *
 *   - `reachedXxx` flags     : never reset to false once set to true.
 *   - timestamp fields       : keep the first observation; later updates
 *     overwrite only when the field is currently empty.
 *   - counter fields         : numeric add (server-side $inc-style).
 *   - append-only json fields: concat (forkChoices, requestedAccountsHistory,
 *     uploadedAccounts, missing*Accounts).
 *   - everything else        : replace.
 *
 * Critically: this helper NEVER throws. Funnel logging must not break the
 * primary flow — every error is swallowed with `console.error`.
 *
 * Spec source: docs/cursor-dev-spec.md iter-22.
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import type { OnboardingFunnelEvent } from '@/payload-types'

export type FunnelPatch = Partial<OnboardingFunnelEvent> & {
  /** Add to the existing counter (signed). */
  filesUploaded?: number
  classificationAttempts?: number
  pauseCount?: number
  /** Append a single new entry to the array. */
  forkChoices?: unknown
  requestedAccountsHistory?: unknown
  uploadedAccounts?: unknown
  missingRequiredAccounts?: unknown
  missingRecommendedAccounts?: unknown
}

const REACHED_FLAGS = [
  'reachedStart',
  'reachedUpload',
  'reachedMinimumSet',
  'reachedRecommendedSet',
  'reachedRecognition',
  'reachedExtraction',
  'reachedClassification',
  'reachedConfirmation',
  'reachedAnalysis',
] as const

const TIMESTAMP_FIELDS = [
  'startedAt',
  'uploadStartedAt',
  'minimumSetCompletedAt',
  'recommendedSetCompletedAt',
  'classificationStartedAt',
  'classificationCompletedAt',
  'confirmationCompletedAt',
  'analysisCompletedAt',
] as const

const COUNTER_FIELDS = [
  'filesUploaded',
  'classificationAttempts',
  'pauseCount',
  'totalPauseDurationMs',
  'recommendationsCreated',
] as const

const APPEND_ARRAY_FIELDS = [
  'forkChoices',
  'requestedAccountsHistory',
] as const

const UNION_ARRAY_FIELDS = [
  'uploadedAccounts',
  'missingRequiredAccounts',
  'missingRecommendedAccounts',
] as const

export async function updateFunnelEvent(
  userId: string,
  patch: FunnelPatch,
): Promise<void> {
  try {
    const payload = await getPayload({ config })

    const existing = await payload.find({
      collection: 'onboarding-funnel-events',
      where: {
        owner: { equals: userId },
        outcome: { equals: 'in_progress' },
      },
      sort: '-createdAt',
      limit: 1,
    })

    if (existing.docs.length === 0) {
      const allAttempts = await payload.count({
        collection: 'onboarding-funnel-events',
        where: { owner: { equals: userId } },
      })
      const attemptNumber = (allAttempts.totalDocs ?? 0) + 1

      const createData = {
        owner: userId,
        attemptNumber,
        outcome: 'in_progress' as const,
        startedAt: (patch.startedAt as string | undefined) ?? new Date().toISOString(),
        ...stripCounterAndAppendKeys(patch),
        ...counterPatchAsValues(patch),
        ...appendPatchAsArrays(patch),
        ...unionPatchAsArrays(patch),
      }
      await payload.create({
        collection: 'onboarding-funnel-events',
        // The merged object has all required fields (owner, attemptNumber,
        // outcome). Payload's strict create typing demands every required
        // field be statically present on the literal — we lose that
        // through the spread operators. The cast is safe: the helper is
        // try/catch-wrapped and any malformed payload would be caught at
        // runtime. eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: createData as any,
      })
      return
    }

    const current = existing.docs[0]
    const merged = mergePatch(current, patch)

    await payload.update({
      collection: 'onboarding-funnel-events',
      id: current.id,
      data: merged as Partial<OnboardingFunnelEvent>,
    })
  } catch (err) {
    console.error('[funnel] updateFunnelEvent failed:', err)
  }
}

// -----------------------------------------------------------------------------
// Merge rules

function mergePatch(
  current: OnboardingFunnelEvent,
  patch: FunnelPatch,
): Partial<OnboardingFunnelEvent> {
  const out: Record<string, unknown> = { ...stripCounterAndAppendKeys(patch) }

  // 1. reached flags — keep true once observed.
  for (const flag of REACHED_FLAGS) {
    if (current[flag] === true) out[flag] = true
  }

  // 2. timestamps — keep first observation (don't overwrite an earlier value).
  for (const ts of TIMESTAMP_FIELDS) {
    const cur = current[ts]
    if (cur) {
      out[ts] = cur as unknown
    }
  }

  // 3. counters — numeric add.
  for (const counter of COUNTER_FIELDS) {
    const inc = (patch as Record<string, unknown>)[counter]
    const base = (current[counter] as number | null | undefined) ?? 0
    if (typeof inc === 'number' && Number.isFinite(inc)) {
      out[counter] = base + inc
    }
  }

  // 4. append-only arrays — concat without dedup (timestamps make duplicates fine).
  for (const arr of APPEND_ARRAY_FIELDS) {
    const inc = (patch as Record<string, unknown>)[arr]
    if (Array.isArray(inc)) {
      const base = Array.isArray(current[arr]) ? (current[arr] as unknown[]) : []
      out[arr] = [...base, ...inc]
    }
  }

  // 5. union arrays — concat with dedup (codes are scalars).
  for (const arr of UNION_ARRAY_FIELDS) {
    const inc = (patch as Record<string, unknown>)[arr]
    if (Array.isArray(inc)) {
      const base = Array.isArray(current[arr]) ? (current[arr] as unknown[]) : []
      const seen = new Set<string>()
      const merged: string[] = []
      for (const v of [...base, ...inc]) {
        if (typeof v === 'string' && !seen.has(v)) {
          seen.add(v)
          merged.push(v)
        }
      }
      out[arr] = merged
    }
  }

  return out as Partial<OnboardingFunnelEvent>
}

function stripCounterAndAppendKeys(patch: FunnelPatch): Record<string, unknown> {
  const STRIP = new Set<string>([
    ...COUNTER_FIELDS,
    ...APPEND_ARRAY_FIELDS,
    ...UNION_ARRAY_FIELDS,
  ])
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (!STRIP.has(k)) out[k] = v
  }
  return out
}

function counterPatchAsValues(patch: FunnelPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const counter of COUNTER_FIELDS) {
    const inc = (patch as Record<string, unknown>)[counter]
    if (typeof inc === 'number' && Number.isFinite(inc)) out[counter] = inc
  }
  return out
}

function appendPatchAsArrays(patch: FunnelPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const arr of APPEND_ARRAY_FIELDS) {
    const inc = (patch as Record<string, unknown>)[arr]
    if (Array.isArray(inc)) out[arr] = inc
  }
  return out
}

function unionPatchAsArrays(patch: FunnelPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const arr of UNION_ARRAY_FIELDS) {
    const inc = (patch as Record<string, unknown>)[arr]
    if (Array.isArray(inc)) {
      const seen = new Set<string>()
      const dedup: string[] = []
      for (const v of inc) {
        if (typeof v === 'string' && !seen.has(v)) {
          seen.add(v)
          dedup.push(v)
        }
      }
      out[arr] = dedup
    }
  }
  return out
}
