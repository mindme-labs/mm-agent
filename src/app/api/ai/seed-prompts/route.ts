import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { DEFAULT_PROMPTS } from '@/lib/ai/prompts'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const payload = await getPayload({ config })
    let created = 0
    let skipped = 0

    for (const prompt of DEFAULT_PROMPTS) {
      const existing = await payload.find({
        collection: 'ai-prompts',
        where: { promptKey: { equals: prompt.promptKey } },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        skipped++
        continue
      }

      await payload.create({
        collection: 'ai-prompts',
        data: prompt,
      })
      created++
    }

    return NextResponse.json({ ok: true, created, skipped })
  } catch (err) {
    console.error('[AI] Seed prompts error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
