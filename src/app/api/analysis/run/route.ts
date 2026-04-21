import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { parseOSVFile } from '@/lib/parser/osv-parser'
import { isLegacyCandidate, legacyCandidateToRecommendation, runRulesEngine } from '@/lib/rules/engine'
import { calculateMetrics } from '@/lib/rules/metrics'
import { fallbackForCandidate } from '@/lib/rules/fallback-templates'
import { loadAnalyzerSettings } from '@/lib/ai/rule-analyzer'
import { logEvent } from '@/lib/logger'
import type { ParsedAccountData } from '@/types'

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

    const candidates = runRulesEngine(parsedData)
    const metrics = calculateMetrics(parsedData)
    const settings = await loadAnalyzerSettings()

    const analysisDoc = await payload.create({
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
        analysisPhase: 'rules_done',
      },
    })

    let pendingAi = 0
    let prefilled = 0

    await Promise.all(
      candidates.map(async (candidate) => {
        const isAiEligible =
          settings.enabled &&
          !isLegacyCandidate(candidate) &&
          settings.enabledFor.includes(candidate.ruleCode)

        const initialText = isLegacyCandidate(candidate)
          ? legacyCandidateToRecommendation(candidate)
          : fallbackForCandidate(candidate)

        if (isAiEligible) pendingAi++
        else prefilled++

        await payload.create({
          collection: 'recommendations',
          data: {
            owner: user.id,
            ruleCode: candidate.ruleCode,
            ruleName: candidate.ruleName,
            priority: candidate.priorityHint,
            title: initialText.title,
            description: initialText.description,
            shortRecommendation: initialText.shortRecommendation,
            fullText: initialText.fullText,
            status: 'new',
            impactMetric: candidate.impactMetric,
            impactDirection: candidate.impactDirection,
            impactAmount: candidate.impactAmount,
            sourceAccount: candidate.sourceAccount,
            counterparty: candidate.counterparty,
            recipient: candidate.recipient,
            isDemo: false,
            isAiGenerated: false,
            // AI-eligible candidates are NOT yet enhanced (will be picked up by batch endpoint).
            // Legacy and non-AI candidates already carry their final text.
            aiEnhanced: !isAiEligible,
            signals: candidate.signals,
          },
        })
      }),
    )

    await logEvent(user.id, 'onboarding.analysis_complete', 'analysis-results', String(analysisDoc.id), {
      total: candidates.length,
      pendingAi,
      prefilled,
    })

    return NextResponse.json({
      ok: true,
      analysisId: analysisDoc.id,
      total: candidates.length,
      pendingAi,
      prefilled,
      filesProcessed: parsedData.length,
      parseErrors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Analysis] Error:', message)
    return NextResponse.json({ error: `Ошибка анализа: ${message}` }, { status: 500 })
  }
}
