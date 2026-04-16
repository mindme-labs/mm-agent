import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { callAI } from '@/lib/ai/client'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await getPayload({ config })

    const unenhanced = await payload.find({
      collection: 'recommendations',
      where: {
        owner: { equals: user.id },
        aiEnhanced: { not_equals: true },
        status: { equals: 'new' },
      },
      sort: 'priority',
      limit: 1,
    })

    if (unenhanced.docs.length === 0) {
      return NextResponse.json({ done: true, remaining: 0 })
    }

    const rec = unenhanced.docs[0]

    const analysis = await payload.find({
      collection: 'analysis-results',
      where: { owner: { equals: user.id } },
      sort: '-createdAt',
      limit: 1,
    })

    const a = analysis.docs[0]

    const variables: Record<string, string> = {
      ruleCode: rec.ruleCode,
      ruleName: rec.ruleName,
      priority: rec.priority,
      title: rec.title,
      originalDescription: rec.description,
      originalRecommendation: rec.shortRecommendation ?? '',
      counterparty: rec.counterparty ?? '—',
      amount: String(rec.impactAmount ?? 0),
      direction: rec.impactDirection === 'decrease' ? 'снижение/риск' : 'рост/возможность',
      sourceAccount: rec.sourceAccount ?? '—',
      revenue: String(a?.revenue ?? 0),
      grossMargin: String(a?.grossMargin ?? 0),
      accountsReceivable: String(a?.accountsReceivable ?? 0),
      accountsPayable: String(a?.accountsPayable ?? 0),
      arDays: String(a?.arTurnoverDays ?? 0),
      apDays: String(a?.apTurnoverDays ?? 0),
    }

    const result = await callAI({
      promptKey: 'enhance_recommendation',
      variables,
      userId: user.id,
      maxTokens: 1500,
    })

    if (!result) {
      await payload.update({
        collection: 'recommendations',
        id: rec.id,
        data: { aiEnhanced: true },
      })

      const remaining = await payload.count({
        collection: 'recommendations',
        where: {
          owner: { equals: user.id },
          aiEnhanced: { not_equals: true },
          status: { equals: 'new' },
        },
      })

      return NextResponse.json({ done: false, enhanced: false, remaining: remaining.totalDocs, recId: rec.id })
    }

    let enhanced = { description: '', recommendation: '', draft: '' }
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        enhanced = JSON.parse(jsonMatch[0])
      }
    } catch {
      enhanced.draft = result.text
    }

    const updateData: Record<string, unknown> = { aiEnhanced: true }
    if (enhanced.description) updateData.description = enhanced.description
    if (enhanced.recommendation) updateData.shortRecommendation = enhanced.recommendation
    if (enhanced.draft) updateData.fullText = enhanced.draft

    await payload.update({
      collection: 'recommendations',
      id: rec.id,
      data: updateData,
    })

    const remaining = await payload.count({
      collection: 'recommendations',
      where: {
        owner: { equals: user.id },
        aiEnhanced: { not_equals: true },
        status: { equals: 'new' },
      },
    })

    return NextResponse.json({
      done: false,
      enhanced: true,
      remaining: remaining.totalDocs,
      recId: rec.id,
      recTitle: rec.title,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[AI Enhance] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
