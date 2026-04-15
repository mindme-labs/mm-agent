import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { parseOSVFile } from '@/lib/parser/osv-parser'
import { runRulesEngine } from '@/lib/rules/engine'
import { calculateMetrics } from '@/lib/rules/metrics'
import { runAIAudit } from '@/lib/ai/audit'
import { isAIAvailable } from '@/lib/ai/client'
import { logEvent } from '@/lib/logger'
import type { ParsedAccountData, GeneratedRecommendation } from '@/types'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await getPayload({ config })

    await logEvent(user.id, 'onboarding.analysis_start', undefined, undefined, {
      mode: user.mode,
      source: 'user_files',
    })

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
      const content = doc.parsedData as string | null
      if (!content || typeof content !== 'string') continue

      try {
        const parsed = parseOSVFile(content)
        parsedData.push(parsed)

        await payload.update({
          collection: 'uploaded-files',
          id: doc.id,
          data: { parseStatus: 'success' },
        })
      } catch (err) {
        parseErrors.push(`${doc.originalName}: ${err instanceof Error ? err.message : 'Ошибка парсинга'}`)
        await payload.update({
          collection: 'uploaded-files',
          id: doc.id,
          data: { parseStatus: 'error', parseErrors: [err instanceof Error ? err.message : 'Parse error'] },
        })
      }
    }

    if (parsedData.length === 0) {
      return NextResponse.json({
        error: 'Не удалось распознать ни одного файла',
        details: parseErrors,
      }, { status: 400 })
    }

    const recommendations: GeneratedRecommendation[] = runRulesEngine(parsedData)
    const metrics = calculateMetrics(parsedData)

    let aiAuditSummary: string | undefined
    const aiAvailable = await isAIAvailable()

    if (aiAvailable) {
      try {
        const auditResult = await runAIAudit(metrics, user.id)
        if (auditResult.recommendations.length > 0) {
          recommendations.push(...auditResult.recommendations)
        }
        if (auditResult.summary) {
          aiAuditSummary = auditResult.summary
        }
      } catch (err) {
        console.warn('[Analysis] AI audit failed:', err)
        await logEvent(user.id, 'ai.fallback', undefined, undefined, {
          reason: 'audit_error',
          error: err instanceof Error ? err.message : 'Unknown',
        })
      }
    } else {
      await logEvent(user.id, 'ai.fallback', undefined, undefined, {
        reason: 'ai_unavailable',
      })
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

    for (const rec of recommendations) {
      await payload.create({
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
    }

    await logEvent(user.id, 'onboarding.analysis_complete', undefined, undefined, {
      recommendationCount: recommendations.length,
      filesProcessed: parsedData.length,
      parseErrors: parseErrors.length,
      mode: user.mode,
      source: 'user_files',
    })

    return NextResponse.json({
      ok: true,
      recommendationCount: recommendations.length,
      filesProcessed: parsedData.length,
      parseErrors,
    })
  } catch (err) {
    console.error('[Analysis] Error:', err)
    return NextResponse.json({ error: 'Ошибка анализа' }, { status: 500 })
  }
}
