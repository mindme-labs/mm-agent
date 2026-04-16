import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { callAI } from '@/lib/ai/client'
import type { GeneratedRecommendation } from '@/types'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await getPayload({ config })

    const analysisResult = await payload.find({
      collection: 'analysis-results',
      where: { owner: { equals: user.id } },
      sort: '-createdAt',
      limit: 1,
    })

    if (analysisResult.docs.length === 0) {
      return NextResponse.json({ error: 'Нет результатов анализа' }, { status: 400 })
    }

    const analysis = analysisResult.docs[0]

    if (analysis.analysisPhase === 'ai_complete') {
      return NextResponse.json({ phase: 'ai_complete', alreadyDone: true })
    }

    await payload.update({
      collection: 'analysis-results',
      id: analysis.id,
      data: { analysisPhase: 'ai_pending' },
    })

    type Debtor = { name: string; amount: number; share: number }
    type Creditor = { name: string; amount: number; hasAdvance: boolean }

    const variables: Record<string, string> = {
      revenue: String(analysis.revenue ?? 0),
      cogs: String(analysis.cogs ?? 0),
      grossProfit: String(analysis.grossProfit ?? 0),
      grossMargin: String(analysis.grossMargin ?? 0),
      accountsReceivable: String(analysis.accountsReceivable ?? 0),
      accountsPayable: String(analysis.accountsPayable ?? 0),
      inventory: String(analysis.inventory ?? 0),
      arDays: String(analysis.arTurnoverDays ?? 0),
      apDays: String(analysis.apTurnoverDays ?? 0),
      invDays: String(analysis.inventoryTurnoverDays ?? 0),
      healthIndex: (analysis.healthIndex as string) ?? 'unknown',
      topDebtors: JSON.stringify(
        Array.isArray(analysis.topDebtors) ? (analysis.topDebtors as Debtor[]).map(d => `${d.name}: ${d.amount}₽ (${d.share}%)`).join(', ') : '—'
      ),
      topCreditors: JSON.stringify(
        Array.isArray(analysis.topCreditors) ? (analysis.topCreditors as Creditor[]).map(c => `${c.name}: ${c.amount}₽`).join(', ') : '—'
      ),
    }

    const result = await callAI({
      promptKey: 'audit_working_capital',
      variables,
      userId: user.id,
      maxTokens: 2048,
    })

    if (!result) {
      await payload.update({
        collection: 'analysis-results',
        id: analysis.id,
        data: { analysisPhase: 'ai_error' },
      })
      return NextResponse.json({ phase: 'ai_error', error: 'AI не вернул результат' })
    }

    let aiRecs: GeneratedRecommendation[] = []
    try {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const items = JSON.parse(jsonMatch[0]) as Array<{
          title: string; description: string; recommendation: string; priority: string; impactAmount?: number
        }>
        aiRecs = items.map((item) => ({
          ruleCode: 'AI-AUDIT',
          ruleName: 'AI-аудит оборотного капитала',
          priority: (['critical', 'high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium') as GeneratedRecommendation['priority'],
          title: item.title,
          description: item.description,
          shortRecommendation: item.recommendation,
          fullText: '',
          impactMetric: 'strategic' as const,
          impactDirection: 'decrease' as const,
          impactAmount: item.impactAmount ?? 0,
          sourceAccount: '',
          recipient: 'CEO',
        }))
      }
    } catch {
      // JSON parse failed — still save the summary text
    }

    await Promise.all([
      payload.update({
        collection: 'analysis-results',
        id: analysis.id,
        data: {
          analysisPhase: 'ai_complete',
          aiAuditSummary: result.text,
        },
      }),
      ...aiRecs.map((rec) =>
        payload.create({
          collection: 'recommendations',
          data: {
            owner: user.id,
            ruleCode: rec.ruleCode,
            ruleName: rec.ruleName,
            priority: rec.priority,
            title: rec.title,
            description: rec.description,
            shortRecommendation: rec.shortRecommendation,
            fullText: rec.fullText,
            status: 'new',
            impactMetric: rec.impactMetric,
            impactDirection: rec.impactDirection,
            impactAmount: rec.impactAmount,
            sourceAccount: rec.sourceAccount,
            recipient: rec.recipient,
            isDemo: false,
            isAiGenerated: true,
          },
        })
      ),
    ])

    return NextResponse.json({
      phase: 'ai_complete',
      newRecommendations: aiRecs.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[AI Audit] Error:', message)
    return NextResponse.json({ phase: 'ai_error', error: message }, { status: 500 })
  }
}
