import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { analyzeCandidates, loadAnalyzerSettings } from '@/lib/ai/rule-analyzer'
import type { AnalysisMetrics } from '@/lib/rules/metrics'
import type { RuleCandidate, RuleSignalValue } from '@/types'

const RETRY_COOLDOWN_MS = 5 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await getPayload({ config })
    const settings = await loadAnalyzerSettings()

    let batchSize = settings.batchSize
    try {
      const body = (await request.json()) as { batchSize?: number } | null
      if (body && typeof body.batchSize === 'number' && body.batchSize > 0) {
        batchSize = Math.min(body.batchSize, 10)
      }
    } catch {
      // No body — use settings default.
    }

    const cooldownThreshold = new Date(Date.now() - RETRY_COOLDOWN_MS)

    const pending = await payload.find({
      collection: 'recommendations',
      where: {
        owner: { equals: user.id },
        aiEnhanced: { not_equals: true },
        status: { equals: 'new' },
        or: [
          { aiEnhanceFailedAt: { exists: false } },
          { aiEnhanceFailedAt: { less_than: cooldownThreshold.toISOString() } },
        ],
      },
      sort: '-priority',
      limit: batchSize,
    })

    if (pending.docs.length === 0) {
      const remaining = await payload.count({
        collection: 'recommendations',
        where: {
          owner: { equals: user.id },
          aiEnhanced: { not_equals: true },
          status: { equals: 'new' },
        },
      })
      return NextResponse.json({
        done: remaining.totalDocs === 0,
        processed: 0,
        remaining: remaining.totalDocs,
        failed: 0,
      })
    }

    const analysisLatest = await payload.find({
      collection: 'analysis-results',
      where: { owner: { equals: user.id } },
      sort: '-createdAt',
      limit: 1,
    })
    const metrics = analysisLatest.docs[0]
      ? toMetrics(analysisLatest.docs[0] as unknown as Record<string, unknown>)
      : null

    const candidates: RuleCandidate[] = pending.docs.map((rec) => ({
      ruleCode: rec.ruleCode,
      ruleName: rec.ruleName,
      priorityHint: rec.priority,
      impactMetric: (rec.impactMetric ?? 'strategic') as RuleCandidate['impactMetric'],
      impactDirection: (rec.impactDirection ?? 'decrease') as RuleCandidate['impactDirection'],
      impactAmount: rec.impactAmount ?? 0,
      sourceAccount: rec.sourceAccount ?? '',
      counterparty: rec.counterparty ?? undefined,
      recipient: rec.recipient,
      signals: (rec.signals ?? {}) as Record<string, RuleSignalValue>,
    }))

    const analyzed = await analyzeCandidates(candidates, metrics, user.id, {
      concurrency: batchSize,
      timeoutMs: 15_000,
    })

    let processed = 0
    let failed = 0

    await Promise.all(
      analyzed.map(async (result, idx) => {
        const rec = pending.docs[idx]
        if (result.aiEnhanced) {
          processed++
          await payload.update({
            collection: 'recommendations',
            id: rec.id,
            data: {
              title: result.title,
              description: result.description,
              shortRecommendation: result.shortRecommendation,
              fullText: result.fullText,
              priority: result.priority,
              aiEnhanced: true,
              aiEnhanceFailedAt: null,
              aiEnhanceError: null,
            },
          })
        } else {
          failed++
          await payload.update({
            collection: 'recommendations',
            id: rec.id,
            data: {
              aiEnhanceFailedAt: new Date().toISOString(),
              aiEnhanceError: result.aiError ?? 'unknown',
            },
          })
        }
      }),
    )

    const remaining = await payload.count({
      collection: 'recommendations',
      where: {
        owner: { equals: user.id },
        aiEnhanced: { not_equals: true },
        status: { equals: 'new' },
      },
    })

    return NextResponse.json({
      done: remaining.totalDocs === 0,
      processed,
      failed,
      remaining: remaining.totalDocs,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[AI Enhance Batch] Error:', message, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function toMetrics(doc: Record<string, unknown>): AnalysisMetrics {
  return {
    period: String(doc.period ?? ''),
    revenue: Number(doc.revenue ?? 0),
    cogs: Number(doc.cogs ?? 0),
    grossProfit: Number(doc.grossProfit ?? 0),
    grossMargin: Number(doc.grossMargin ?? 0),
    accountsReceivable: Number(doc.accountsReceivable ?? 0),
    accountsPayable: Number(doc.accountsPayable ?? 0),
    inventory: Number(doc.inventory ?? 0),
    shippedGoods: Number(doc.shippedGoods ?? 0),
    arTurnoverDays: Number(doc.arTurnoverDays ?? 0),
    apTurnoverDays: Number(doc.apTurnoverDays ?? 0),
    inventoryTurnoverDays: Number(doc.inventoryTurnoverDays ?? 0),
    healthIndex: (doc.healthIndex ?? 'issues') as AnalysisMetrics['healthIndex'],
    topDebtors: (doc.topDebtors ?? []) as AnalysisMetrics['topDebtors'],
    topCreditors: (doc.topCreditors ?? []) as AnalysisMetrics['topCreditors'],
  }
}
