/**
 * Idempotent migration to v3.3.1 schema.
 *
 * What it does:
 *   1. Resets onboarding for every non-admin user:
 *        hasCompletedOnboarding        = false
 *        wizardState                   = 'idle'
 *        currentClassificationAttempts = 0
 *        analysisStatus                = 'none'
 *   2. Removes all existing analysis-results (rebuilt during next onboarding).
 *   3. Removes all existing recommendations (rebuilt during next onboarding).
 *   4. Upserts every prompt from `DEFAULT_PROMPTS` + `RULE_PROMPTS` so the new
 *      `business_model_classification` row exists and the older rows are
 *      re-versioned to their current in-code text.
 *
 * What it does NOT touch:
 *   - invite-codes, access-requests, event-log, ai-usage-logs,
 *     uploaded-files (kept so users see their previously uploaded raw files).
 *
 * Re-running is safe — every step is deterministic / idempotent.
 *
 * Usage:
 *   - CLI:  `npx tsx src/scripts/migrate-to-v3.3.ts`
 *   - HTTP: `POST /api/dev/migrate-v3.3` (admin-only, dev-only by default)
 */
import { getPayload } from 'payload'
import config from '@payload-config'
import { DEFAULT_PROMPTS } from '@/lib/ai/prompts'
import { RULE_PROMPTS } from '@/lib/ai/rule-prompts'

export interface MigrationResult {
  ok: boolean
  usersReset: number
  analysisDeleted: number
  recommendationsDeleted: number
  promptsCreated: number
  promptsUpdated: number
  promptsSkipped: number
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

  // Prompt upsert — same shape as POST /api/ai/seed-prompts?upsert=true.
  let promptsCreated = 0
  let promptsUpdated = 0
  let promptsSkipped = 0
  try {
    const allPrompts = [...DEFAULT_PROMPTS, ...RULE_PROMPTS]
    for (const prompt of allPrompts) {
      const existing = await payload.find({
        collection: 'ai-prompts',
        where: { promptKey: { equals: prompt.promptKey } },
        limit: 1,
      })

      if (existing.docs.length === 0) {
        await payload.create({ collection: 'ai-prompts', data: prompt })
        promptsCreated++
        continue
      }

      const existingDoc = existing.docs[0]
      const existingVersion = typeof existingDoc.version === 'number' ? existingDoc.version : 1
      const nextVersion = Math.max(prompt.version ?? 1, existingVersion + 1)

      // Skip if existing record is byte-identical — saves churn and keeps
      // version numbers from inflating on every re-run.
      const isUnchanged =
        existingDoc.systemPrompt === prompt.systemPrompt &&
        existingDoc.userPromptTemplate === prompt.userPromptTemplate &&
        existingDoc.name === prompt.name
      if (isUnchanged) {
        promptsSkipped++
        continue
      }

      await payload.update({
        collection: 'ai-prompts',
        id: existingDoc.id,
        data: {
          name: prompt.name,
          systemPrompt: prompt.systemPrompt,
          userPromptTemplate: prompt.userPromptTemplate,
          version: nextVersion,
          isActive: true,
        },
      })
      promptsUpdated++
    }
  } catch (err) {
    errors.push(`prompts upsert failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  return {
    ok: errors.length === 0,
    usersReset,
    analysisDeleted,
    recommendationsDeleted,
    promptsCreated,
    promptsUpdated,
    promptsSkipped,
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
