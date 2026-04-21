/**
 * Rule analyzer — converts `RuleCandidate[]` into final
 * `GeneratedRecommendation[]` by invoking Claude per candidate with bounded
 * concurrency, per-call timeout, and a deterministic static-template fallback
 * on any failure.
 *
 * Invoked from `/api/analysis/ai-enhance-batch` (one batch at a time, to fit
 * Vercel function-timeout budgets) and conceptually re-usable from anywhere
 * the rules engine produces candidates.
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { callAI } from './client'
import { promptKeyForRule } from './rule-prompts'
import { fallbackForCandidate } from '@/lib/rules/fallback-templates'
import type { GeneratedRecommendation, RuleCandidate } from '@/types'
import type { AnalysisMetrics } from '@/lib/rules/metrics'

export interface AnalyzedRecommendation extends GeneratedRecommendation {
  aiEnhanced: boolean
  aiError?: string
}

export interface AnalyzeOptions {
  concurrency?: number
  timeoutMs?: number
}

export interface RuleAnalyzerSettings {
  enabled: boolean
  enabledFor: string[]
  batchSize: number
}

const PRIORITY_LADDER = ['low', 'medium', 'high', 'critical'] as const
type PriorityValue = (typeof PRIORITY_LADDER)[number]

export async function loadAnalyzerSettings(): Promise<RuleAnalyzerSettings> {
  try {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'global-settings' })
    const enabledForRaw = (settings as { aiRulesEnabledFor?: unknown }).aiRulesEnabledFor
    const enabledFor = Array.isArray(enabledForRaw)
      ? enabledForRaw.filter((v): v is string => typeof v === 'string')
      : []
    return {
      enabled: Boolean((settings as { aiRulesEnabled?: boolean }).aiRulesEnabled ?? false),
      enabledFor,
      batchSize: Number((settings as { aiRulesBatchSize?: number }).aiRulesBatchSize ?? 3),
    }
  } catch {
    return { enabled: false, enabledFor: [], batchSize: 3 }
  }
}

export async function analyzeCandidates(
  candidates: RuleCandidate[],
  metrics: AnalysisMetrics | null,
  userId: string,
  options: AnalyzeOptions = {},
): Promise<AnalyzedRecommendation[]> {
  if (candidates.length === 0) return []
  const concurrency = Math.max(1, options.concurrency ?? 3)
  const timeoutMs = options.timeoutMs ?? 15_000

  const settings = await loadAnalyzerSettings()
  const results = new Array<AnalyzedRecommendation | null>(candidates.length).fill(null)
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < candidates.length) {
      const idx = cursor++
      const candidate = candidates[idx]
      results[idx] = await analyzeOne(candidate, metrics, userId, settings, timeoutMs)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, worker))

  return results.filter((r): r is AnalyzedRecommendation => r !== null)
}

export async function analyzeOne(
  candidate: RuleCandidate,
  metrics: AnalysisMetrics | null,
  userId: string,
  settings: RuleAnalyzerSettings,
  timeoutMs: number,
): Promise<AnalyzedRecommendation> {
  if (!settings.enabled || !settings.enabledFor.includes(candidate.ruleCode)) {
    return { ...fallbackForCandidate(candidate), aiEnhanced: false }
  }

  const promptKey = promptKeyForRule(candidate.ruleCode)
  const variables = buildPromptVariables(candidate, metrics)

  try {
    const aiCall = callAI({
      promptKey,
      variables,
      userId,
      maxTokens: 1500,
    })
    const result = await Promise.race([
      aiCall,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ])

    if (!result) {
      return {
        ...fallbackForCandidate(candidate),
        aiEnhanced: false,
        aiError: 'ai_timeout_or_unavailable',
      }
    }

    const parsed = parseAIResponse(result.text)
    if (!parsed) {
      return {
        ...fallbackForCandidate(candidate),
        aiEnhanced: false,
        aiError: 'ai_invalid_json',
      }
    }

    return mergeAIResponse(candidate, parsed)
  } catch (err) {
    console.error(`[RuleAnalyzer] ${candidate.ruleCode} failed:`, err)
    return {
      ...fallbackForCandidate(candidate),
      aiEnhanced: false,
      aiError: err instanceof Error ? err.message : 'unknown',
    }
  }
}

interface ParsedAIResponse {
  priority?: string
  title?: string
  description?: string
  shortRecommendation?: string
  fullText?: string
}

function parseAIResponse(text: string): ParsedAIResponse | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const obj = JSON.parse(match[0]) as Record<string, unknown>
    const out: ParsedAIResponse = {}
    if (typeof obj.priority === 'string') out.priority = obj.priority
    if (typeof obj.title === 'string') out.title = obj.title
    if (typeof obj.description === 'string') out.description = obj.description
    if (typeof obj.shortRecommendation === 'string') out.shortRecommendation = obj.shortRecommendation
    if (typeof obj.fullText === 'string') out.fullText = obj.fullText
    if (!out.title || !out.description) return null
    return out
  } catch {
    return null
  }
}

function mergeAIResponse(
  candidate: RuleCandidate,
  ai: ParsedAIResponse,
): AnalyzedRecommendation {
  const fallback = fallbackForCandidate(candidate)
  const cappedPriority = capPriority(candidate.priorityHint, ai.priority)

  return {
    ...fallback,
    priority: cappedPriority,
    title: ai.title ?? fallback.title,
    description: ai.description ?? fallback.description,
    shortRecommendation: ai.shortRecommendation ?? fallback.shortRecommendation,
    fullText: ai.fullText ?? fallback.fullText,
    aiEnhanced: true,
  }
}

function capPriority(
  hint: PriorityValue,
  aiPriority: string | undefined,
): PriorityValue {
  if (!aiPriority || !PRIORITY_LADDER.includes(aiPriority as PriorityValue)) return hint
  const aiIdx = PRIORITY_LADDER.indexOf(aiPriority as PriorityValue)
  const hintIdx = PRIORITY_LADDER.indexOf(hint)
  // Allow at most one level above the rule's hint to prevent inbox flooding.
  const maxIdx = Math.min(hintIdx + 1, PRIORITY_LADDER.length - 1)
  return PRIORITY_LADDER[Math.min(aiIdx, maxIdx)]
}

function buildPromptVariables(
  candidate: RuleCandidate,
  metrics: AnalysisMetrics | null,
): Record<string, string> {
  const vars: Record<string, string> = {
    ruleCode: candidate.ruleCode,
    ruleName: candidate.ruleName,
    priorityHint: candidate.priorityHint,
    counterparty: candidate.counterparty ?? '—',
    recipient: candidate.recipient,
    impactAmount: String(candidate.impactAmount),
    sourceAccount: candidate.sourceAccount,
    revenue: metrics ? String(metrics.revenue) : '0',
    grossMargin: metrics ? metrics.grossMargin.toFixed(1) : '0',
    accountsReceivable: metrics ? String(metrics.accountsReceivable) : '0',
    accountsPayable: metrics ? String(metrics.accountsPayable) : '0',
    arDays: metrics ? String(metrics.arTurnoverDays) : '0',
    apDays: metrics ? String(metrics.apTurnoverDays) : '0',
  }
  for (const [key, value] of Object.entries(candidate.signals)) {
    vars[key] = String(value)
  }
  return vars
}
