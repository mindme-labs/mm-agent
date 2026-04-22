import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { DEFAULT_PROMPTS } from '@/lib/ai/prompts'
import { RULE_PROMPTS } from '@/lib/ai/rule-prompts'

/**
 * Seed AI prompts into the database.
 *
 * Behavior:
 *   - By default, INSERTS prompts that don't yet exist (lookup by promptKey).
 *     Existing prompts are skipped — useful for first-time setup.
 *
 *   - With `?upsert=true`, OVERWRITES existing prompts with the in-code defaults.
 *     Use this to roll out a new prompt version after editing
 *     `src/lib/ai/prompts.ts` or `src/lib/ai/rule-prompts.ts`.
 *     The existing record's `version` field is bumped (or replaced with the
 *     in-code value, whichever is higher).
 *
 * Always seeds both `DEFAULT_PROMPTS` and `RULE_PROMPTS`.
 *
 * Auth: uses the same `getCurrentUser()` helper as every other custom route in
 * the app (which understands the `payload-token` cookie issued by
 * `/api/auth/login`). Do NOT use `payload.auth({ headers })` here — that
 * verifier only recognizes cookies issued by Payload's built-in admin login,
 * not the custom JWTs we mint for the user-facing app.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const payload = await getPayload({ config })

    const url = new URL(request.url)
    const upsert = url.searchParams.get('upsert') === 'true'

    let created = 0
    let updated = 0
    let skipped = 0

    const allPrompts = [...DEFAULT_PROMPTS, ...RULE_PROMPTS]

    for (const prompt of allPrompts) {
      const existing = await payload.find({
        collection: 'ai-prompts',
        where: { promptKey: { equals: prompt.promptKey } },
        limit: 1,
      })

      if (existing.docs.length === 0) {
        await payload.create({
          collection: 'ai-prompts',
          data: prompt,
        })
        created++
        continue
      }

      if (!upsert) {
        skipped++
        continue
      }

      const existingDoc = existing.docs[0]
      const existingVersion = typeof existingDoc.version === 'number' ? existingDoc.version : 1
      const nextVersion = Math.max(prompt.version ?? 1, existingVersion + 1)

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
      updated++
    }

    return NextResponse.json({
      ok: true,
      created,
      updated,
      skipped,
      total: allPrompts.length,
      mode: upsert ? 'upsert' : 'insert_only',
    })
  } catch (err) {
    console.error('[AI] Seed prompts error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
