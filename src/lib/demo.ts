import { getPayload } from 'payload'
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { parseOSVFile } from './parser/osv-parser'
import { isLegacyCandidate, legacyCandidateToRecommendation, runRulesEngine } from './rules/engine'
import { fallbackForCandidate } from './rules/fallback-templates'
import { calculateMetrics } from './rules/metrics'
import { runAIAudit } from './ai/audit'
import { isAIAvailable } from './ai/client'
import { loadAnalyzerSettings } from './ai/rule-analyzer'
import { logEvent } from './logger'
import type { ParsedAccountData } from '@/types'

function loadDemoData(): ParsedAccountData[] {
  const demoDir = path.resolve(process.cwd(), 'src/demo-data')
  const files = fs.readdirSync(demoDir).filter(f => f.endsWith('.csv'))
  return files.map(f => parseOSVFile(fs.readFileSync(path.join(demoDir, f), 'utf-8')))
}

export async function seedDemoForUser(userId: string): Promise<number> {
  const payload = await getPayload({ config })

  const data = loadDemoData()
  const candidates = runRulesEngine(data)
  const metrics = calculateMetrics(data)
  const settings = await loadAnalyzerSettings()

  let aiAuditSummary: string | undefined
  const auditAvailable = await isAIAvailable()
  const auditRecs: Array<{ title: string; description: string; shortRecommendation: string; priority: 'critical' | 'high' | 'medium' | 'low'; impactAmount: number }> = []

  if (auditAvailable) {
    try {
      const auditResult = await runAIAudit(metrics, userId)
      if (auditResult.summary) aiAuditSummary = auditResult.summary
      for (const rec of auditResult.recommendations) {
        auditRecs.push({
          title: rec.title,
          description: rec.description,
          shortRecommendation: rec.shortRecommendation,
          priority: rec.priority,
          impactAmount: rec.impactAmount,
        })
      }
    } catch (err) {
      console.warn('[Demo] AI audit failed, continuing with rules engine only:', err)
      await logEvent(userId, 'ai.fallback', undefined, undefined, {
        reason: 'audit_error',
        error: err instanceof Error ? err.message : 'Unknown',
      })
    }
  } else {
    await logEvent(userId, 'ai.fallback', undefined, undefined, { reason: 'ai_unavailable' })
  }

  await payload.create({
    collection: 'analysis-results',
    data: {
      owner: userId,
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
      isDemo: true,
      analysisPhase: 'rules_done',
    },
  })

  for (const candidate of candidates) {
    const isAiEligible =
      settings.enabled &&
      !isLegacyCandidate(candidate) &&
      settings.enabledFor.includes(candidate.ruleCode)

    const initialText = isLegacyCandidate(candidate)
      ? legacyCandidateToRecommendation(candidate)
      : fallbackForCandidate(candidate)

    await payload.create({
      collection: 'recommendations',
      data: {
        owner: userId,
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
        isDemo: true,
        isAiGenerated: false,
        aiEnhanced: !isAiEligible,
        signals: candidate.signals,
      },
    })
  }

  for (const audit of auditRecs) {
    await payload.create({
      collection: 'recommendations',
      data: {
        owner: userId,
        ruleCode: 'AI-AUDIT',
        ruleName: 'AI-аудит оборотного капитала',
        priority: audit.priority,
        title: audit.title,
        description: audit.description,
        shortRecommendation: audit.shortRecommendation,
        fullText: '',
        status: 'new',
        impactMetric: 'strategic',
        impactDirection: 'decrease',
        impactAmount: audit.impactAmount,
        sourceAccount: '',
        recipient: 'CEO',
        isDemo: true,
        isAiGenerated: true,
        aiEnhanced: true,
      },
    })
  }

  return candidates.length + auditRecs.length
}

export async function clearDemoForUser(userId: string): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'recommendations',
    where: { owner: { equals: userId }, isDemo: { equals: true } },
  })

  await payload.delete({
    collection: 'analysis-results',
    where: { owner: { equals: userId }, isDemo: { equals: true } },
  })

  await payload.delete({
    collection: 'recommendation-feedback',
    where: { owner: { equals: userId } },
  })

  await payload.update({
    collection: 'users',
    id: userId,
    data: { hasCompletedOnboarding: false },
  })
}
