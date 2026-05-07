/**
 * Idempotent migration to v3.3.1 schema.
 *
 * What it does:
 *   1. Resets onboarding for every non-admin user:
 *        hasCompletedOnboarding = false
 *        wizardState              = 'idle'
 *        currentClassificationAttempts = 0
 *        analysisStatus           = 'none'
 *   2. Removes all existing analysis-results (rebuilt during next onboarding).
 *   3. Removes all existing recommendations (rebuilt during next onboarding).
 *
 * What it does NOT touch:
 *   - invite-codes, access-requests, ai-prompts, event-log, ai-usage-logs,
 *     uploaded-files (kept so users see their previously uploaded raw files).
 *
 * Re-running is safe — the script only writes deterministic resets and
 * idempotent deletes.
 *
 * Usage:
 *   - CLI:  `npx tsx src/scripts/migrate-to-v3.3.ts`
 *   - HTTP: `POST /api/dev/migrate-v3.3` (admin-only, dev-only)
 */
import { getPayload } from 'payload'
import config from '@payload-config'

export interface MigrationResult {
  ok: boolean
  usersReset: number
  analysisDeleted: number
  recommendationsDeleted: number
  errors: string[]
}

export async function migrateToV33(): Promise<MigrationResult> {
  const payload = await getPayload({ config })
  const errors: string[] = []

  let usersReset = 0
  try {
    const updated = await payload.update({
      collection: 'users',
      where: { role: { not_equals: 'admin' } },
      data: {
        hasCompletedOnboarding: false,
        wizardState: 'idle',
        currentClassificationAttempts: 0,
        analysisStatus: 'none',
      },
    })
    usersReset = updated.docs.length
  } catch (err) {
    errors.push(`users reset failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  let analysisDeleted = 0
  try {
    const deleted = await payload.delete({
      collection: 'analysis-results',
      where: { id: { exists: true } },
    })
    analysisDeleted = deleted.docs.length
  } catch (err) {
    errors.push(`analysis-results delete failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  let recommendationsDeleted = 0
  try {
    const deleted = await payload.delete({
      collection: 'recommendations',
      where: { id: { exists: true } },
    })
    recommendationsDeleted = deleted.docs.length
  } catch (err) {
    errors.push(`recommendations delete failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  return {
    ok: errors.length === 0,
    usersReset,
    analysisDeleted,
    recommendationsDeleted,
    errors,
  }
}

// Allow running as a CLI script: `npx tsx src/scripts/migrate-to-v3.3.ts`
const isMain =
  typeof process !== 'undefined' &&
  typeof process.argv?.[1] === 'string' &&
  process.argv[1].endsWith('migrate-to-v3.3.ts')

if (isMain) {
  migrateToV33()
    .then((result) => {
      console.log('[migrate-to-v3.3]', JSON.stringify(result, null, 2))
      process.exit(result.ok ? 0 : 1)
    })
    .catch((err) => {
      console.error('[migrate-to-v3.3] fatal', err)
      process.exit(1)
    })
}
