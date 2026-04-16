import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { parseOSVFile } from '@/lib/parser/osv-parser'
import { runRulesEngine } from '@/lib/rules/engine'
import { calculateMetrics } from '@/lib/rules/metrics'
import type { ParsedAccountData, GeneratedRecommendation } from '@/types'

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
        parsedData.push(parseOSVFile(content))
      } catch (err) {
        parseErrors.push(`${doc.originalName}: ${err instanceof Error ? err.message : 'Ошибка'}`)
      }
    }

    if (parsedData.length === 0) {
      return NextResponse.json({
        error: 'Не удалось распознать ни одного файла. ' + (parseErrors.length > 0 ? parseErrors[0] : 'Проверьте формат.'),
      }, { status: 400 })
    }

    const recommendations: GeneratedRecommendation[] = runRulesEngine(parsedData)
    const metrics = calculateMetrics(parsedData)

    const [analysisDoc] = await Promise.all([
      payload.create({
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
          isDemo: false,
        },
      }),
      ...recommendations.map((rec) =>
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
            isAiGenerated: false,
          },
        })
      ),
    ])

    return NextResponse.json({
      ok: true,
      recommendationCount: recommendations.length,
      filesProcessed: parsedData.length,
      parseErrors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Analysis] Error:', message)
    return NextResponse.json({ error: `Ошибка анализа: ${message}` }, { status: 500 })
  }
}
