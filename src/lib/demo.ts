import { getPayload } from 'payload'
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { parseOSVFile } from './parser/osv-parser'
import { runRulesEngine } from './rules/engine'
import { calculateMetrics } from './rules/metrics'
import { runAIAudit } from './ai/audit'
import { isAIAvailable } from './ai/client'
import { logEvent } from './logger'
import type { ParsedAccountData, GeneratedRecommendation } from '@/types'

function loadDemoData(): ParsedAccountData[] {
  const demoDir = path.resolve(process.cwd(), 'src/demo-data')
  const files = fs.readdirSync(demoDir).filter(f => f.endsWith('.csv'))
  return files.map(f => parseOSVFile(fs.readFileSync(path.join(demoDir, f), 'utf-8')))
}

export async function seedDemoForUser(userId: string): Promise<number> {
  const payload = await getPayload({ config })

  const data = loadDemoData()
  const recommendations: GeneratedRecommendation[] = runRulesEngine(data)
  const metrics = calculateMetrics(data)

  let aiAuditSummary: string | undefined
  const aiAvailable = await isAIAvailable()

  if (aiAvailable) {
    try {
      const auditResult = await runAIAudit(metrics, userId)
      if (auditResult.recommendations.length > 0) {
        recommendations.push(...auditResult.recommendations)
      }
      if (auditResult.summary) {
        aiAuditSummary = auditResult.summary
      }
    } catch (err) {
      console.warn('[Demo] AI audit failed, continuing with rules engine only:', err)
      await logEvent(userId, 'ai.fallback', undefined, undefined, {
        reason: 'audit_error',
        error: err instanceof Error ? err.message : 'Unknown',
      })
    }
  } else {
    await logEvent(userId, 'ai.fallback', undefined, undefined, {
      reason: 'ai_unavailable',
    })
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
    },
  })

  for (const rec of recommendations) {
    await payload.create({
      collection: 'recommendations',
      data: {
        owner: userId,
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
        isDemo: true,
        isAiGenerated: rec.ruleCode === 'AI-AUDIT',
      },
    })
  }

  return recommendations.length
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
