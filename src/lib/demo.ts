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

export interface ResetOnboardingResult {
  recommendationsDeleted: number
  analysisDeleted: number
  feedbackDeleted: number
  filesDeleted: number
  funnelAbandoned: number
}

/**
 * Hard-reset everything tied to a user's onboarding so they can re-run it
 * from a clean slate. Used by `/api/dev/reset-onboarding`.
 *
 * Cleared:
 *   - all `recommendations` (demo + real)
 *   - all `analysis-results`
 *   - all `recommendation-feedback`
 *   - all `uploaded-files` (no isDemo discriminator on this collection —
 *     these are real user uploads, but a "reset onboarding" must drop
 *     them so the new attempt starts with an empty file list)
 *   - any `onboarding-funnel-events` row in `in_progress` is flipped to
 *     `outcome='abandoned'` (preserved as historical analytics)
 *
 * Reset on the user record:
 *   - `hasCompletedOnboarding=false`
 *   - `wizardState='idle'`
 *   - `currentClassificationAttempts=0`
 *
 * Untouched: invite-codes, ai-prompts, event-log, ai-usage-logs.
 */
export async function resetOnboardingForUser(userId: string): Promise<ResetOnboardingResult> {
  const payload = await getPayload({ config })

  const [recsDel, analysisDel, feedbackDel, filesDel] = await Promise.all([
    payload.delete({
      collection: 'recommendations',
      where: { owner: { equals: userId } },
    }),
    payload.delete({
      collection: 'analysis-results',
      where: { owner: { equals: userId } },
    }),
    payload.delete({
      collection: 'recommendation-feedback',
      where: { owner: { equals: userId } },
    }),
    payload.delete({
      collection: 'uploaded-files',
      where: { owner: { equals: userId } },
    }),
  ])

  // Reset the wizard machine. Without these, the user re-enters
  // /app/onboarding with a stale wizardState='completed' / non-zero
  // attempts counter, and the next /api/analysis/classify call 409s
  // with "cannot classify from wizardState='completed'".
  await payload.update({
    collection: 'users',
    id: userId,
    data: {
      hasCompletedOnboarding: false,
      wizardState: 'idle',
      currentClassificationAttempts: 0,
    },
  })

  // Mark any in-progress funnel record for this user as 'abandoned'. The
  // new onboarding will start a fresh attemptNumber-incremented row via
  // updateFunnelEvent. We don't want the old in_progress row to be merged
  // into — that would silently mix metrics from two distinct attempts.
  let funnelAbandoned = 0
  try {
    const stale = await payload.find({
      collection: 'onboarding-funnel-events',
      where: {
        owner: { equals: userId },
        outcome: { equals: 'in_progress' },
      },
      limit: 10,
    })
    for (const record of stale.docs) {
      await payload.update({
        collection: 'onboarding-funnel-events',
        id: record.id,
        data: {
          outcome: 'abandoned',
          abandonedAt: new Date().toISOString(),
        },
      })
      funnelAbandoned++
    }
  } catch (err) {
    console.error('[demo] could not abandon stale funnel records:', err)
  }

  return {
    recommendationsDeleted: recsDel.docs.length,
    analysisDeleted: analysisDel.docs.length,
    feedbackDeleted: feedbackDel.docs.length,
    filesDeleted: filesDel.docs.length,
    funnelAbandoned,
  }
}

/**
 * @deprecated Renamed to `resetOnboardingForUser` to better reflect its
 * actual scope (it clears non-demo data too). Kept as a thin alias so any
 * external automation still works.
 */
export const clearDemoForUser = async (userId: string): Promise<void> => {
  await resetOnboardingForUser(userId)
}
