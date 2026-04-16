import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { parseOSVFile } from '@/lib/parser/osv-parser'
import { runRulesEngine } from '@/lib/rules/engine'
import { calculateMetrics } from '@/lib/rules/metrics'
import type { ParsedAccountData, GeneratedRecommendation } from '@/types'

export const maxDuration = 60

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await getPayload({ config })

    const filesResult = await payload.find({
      collection: 'uploaded-files',
      where: { owner: { equals: user.id } },
      sort: '-createdAt',
      limit: 20,
    })

    if (filesResult.docs.length === 0) {
      return NextResponse.json({ error: 'Нет загруженных файлов' }, { status: 400 })
    }

    const parsedData: ParsedAccountData[] = []
    const parseErrors: string[] = []

    for (const doc of filesResult.docs) {
      const rawData = doc.parsedData as { raw?: string } | string | null
      const content = typeof rawData === 'string' ? rawData : rawData?.raw ?? null
      if (!content) continue

      try {
        const parsed = parseOSVFile(content)
        parsedData.push(parsed)
      } catch (err) {
        parseErrors.push(`${doc.originalName}: ${err instanceof Error ? err.message : 'Ошибка парсинга'}`)
      }
    }

    if (parsedData.length === 0) {
      return NextResponse.json({
        error: 'Не удалось распознать ни одного файла. ' + (parseErrors.length > 0 ? parseErrors[0] : 'Проверьте формат файлов.'),
        details: parseErrors,
      }, { status: 400 })
    }

    const recommendations: GeneratedRecommendation[] = runRulesEngine(parsedData)
    const metrics = calculateMetrics(parsedData)

    let aiAuditSummary: string | undefined

    try {
      const { isAIAvailable } = await import('@/lib/ai/client')
      const aiAvailable = await withTimeout(isAIAvailable(), 3000)
      if (aiAvailable) {
        const { runAIAudit } = await import('@/lib/ai/audit')
        const auditResult = await withTimeout(runAIAudit(metrics, user.id), 15000)
        if (auditResult) {
          if (auditResult.recommendations.length > 0) {
            recommendations.push(...auditResult.recommendations)
          }
          if (auditResult.summary) {
            aiAuditSummary = auditResult.summary
          }
        }
      }
    } catch {
      // AI is best-effort, continue without it
    }

    await payload.create({
      collection: 'analysis-results',
      data: {
        owner: user.id,
        period: metrics.period,
        revenue: metrics.revenue,
        cogs: metrics.cogs,
        grossProfit: metrics.grossProfit,
        grossMargin: metrics.grossMargin,
        accountsReceivable: metrics.accountsReceivable,
        accountsPayable: metrics.accountsPayable,
        inventory: metrics.inventory,
        shippedGoods: metrics.shippedGoods,
        arTurnoverDays: metrics.arTurnoverDays,
        apTurnoverDays: metrics.apTurnoverDays,
        inventoryTurnoverDays: metrics.inventoryTurnoverDays,
        healthIndex: metrics.healthIndex,
        topDebtors: metrics.topDebtors,
        topCreditors: metrics.topCreditors,
        aiAuditSummary,
        isDemo: false,
      },
    })

    const BATCH_SIZE = 5
    for (let i = 0; i < recommendations.length; i += BATCH_SIZE) {
      const batch = recommendations.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map((rec) =>
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
            counterparty: rec.counterparty,
            recipient: rec.recipient,
            isDemo: false,
            isAiGenerated: rec.ruleCode === 'AI-AUDIT',
          },
        })
      ))
    }

    return NextResponse.json({
      ok: true,
      recommendationCount: recommendations.length,
      filesProcessed: parsedData.length,
      parseErrors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Analysis] Error:', message, err)
    return NextResponse.json({ error: `Ошибка анализа: ${message}` }, { status: 500 })
  }
}
