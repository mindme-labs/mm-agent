import { callAI } from './client'
import type { AnalysisMetrics } from '@/lib/rules/metrics'
import type { GeneratedRecommendation } from '@/types'

export async function runAIAudit(
  metrics: AnalysisMetrics,
  userId: string,
): Promise<{ recommendations: GeneratedRecommendation[]; summary: string }> {
  const variables: Record<string, string> = {
    revenue: String(metrics.revenue),
    cogs: String(metrics.cogs),
    grossProfit: String(metrics.grossProfit),
    grossMargin: metrics.grossMargin.toFixed(1),
    accountsReceivable: String(metrics.accountsReceivable),
    accountsPayable: String(metrics.accountsPayable),
    inventory: String(metrics.inventory),
    arDays: String(metrics.arTurnoverDays),
    apDays: String(metrics.apTurnoverDays),
    invDays: String(metrics.inventoryTurnoverDays),
    healthIndex: metrics.healthIndex,
    topDebtors: JSON.stringify(metrics.topDebtors),
    topCreditors: JSON.stringify(metrics.topCreditors),
  }

  const result = await callAI({
    promptKey: 'audit_working_capital',
    variables,
    userId,
    maxTokens: 2048,
  })

  if (!result) {
    return { recommendations: [], summary: '' }
  }

  try {
    const jsonMatch = result.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return { recommendations: [], summary: result.text }
    }

    const items = JSON.parse(jsonMatch[0]) as Array<{
      title: string
      description: string
      recommendation: string
      priority: string
      impactAmount?: number
    }>

    const recs: GeneratedRecommendation[] = items.map((item) => ({
      ruleCode: 'AI-AUDIT',
      ruleName: 'AI-аудит оборотного капитала',
      priority: (['critical', 'high', 'medium', 'low'].includes(item.priority)
        ? item.priority
        : 'medium') as GeneratedRecommendation['priority'],
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

    return { recommendations: recs, summary: result.text }
  } catch (err) {
    console.error('[AI Audit] Failed to parse response:', err)
    return { recommendations: [], summary: result.text }
  }
}
