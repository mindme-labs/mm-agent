/**
 * Low-level AI classifier wrapper.
 *
 * Responsibilities:
 *   1. Build a compact JSON of the user's parsed accounts (aggregates only —
 *      no per-entity rows; the prompt only needs balance/turnover data).
 *   2. Call `callAI('business_model_classification')` with a 4-second timeout.
 *   3. Parse the JSON response, strip optional ```json``` markdown fences.
 *   4. Validate the shape and value ranges; reject anything malformed.
 *   5. Apply a confidence floor: with fewer than 4 known indicators, cap
 *      confidence at 0.6 (per spec).
 *   6. Return a `safeFallback()` (model=trading, status='success') for any
 *      transient AI failure — the caller relies on this never throwing.
 */

import { callAI } from '@/lib/ai/client'
import type { ParsedAccountData } from '@/types'
import { ALL_BUSINESS_MODELS, type BusinessModel } from './matrix'
import type {
  Account26Destination,
  ClassificationIndicators,
  ClassificationResult,
  ClassificationStatus,
} from './types'

const TIMEOUT_MS = 4_000
const VALID_STATUSES: ReadonlySet<ClassificationStatus> = new Set([
  'success',
  'needs_data',
  'cannot_classify',
])
const VALID_BUSINESS_MODELS: ReadonlySet<string> = new Set(ALL_BUSINESS_MODELS)
const VALID_26_DEST: ReadonlySet<Account26Destination> = new Set(['90', '20', '44', 'missing'])
const NUMERIC_INDICATOR_KEYS = [
  'inventory_balance_41',
  'wip_balance_20',
  'finished_goods_43',
  'revenue_regularity_score',
  'fot_share_in_cogs',
  'agency_transit_share',
] as const

interface CompactAccount {
  accountCode: string
  period: string
  openingDebit: number
  openingCredit: number
  turnoverDebit: number
  turnoverCredit: number
  closingDebit: number
  closingCredit: number
  entityCount: number
  monthlyTurnoverCredit?: number[]
}

/**
 * Run AI classification on the user's parsed account data.
 *
 * Always resolves — never throws. On any failure (no API key, timeout,
 * malformed JSON, validation error) returns the conservative
 * `safeFallback()` result so the wizard can proceed.
 */
export async function classify(
  parsedData: ParsedAccountData[],
  period: string,
  userId: string,
): Promise<ClassificationResult> {
  if (parsedData.length === 0) {
    console.warn('[Classify] no parsed data for user, returning fallback')
    return safeFallback('Нет распознанных файлов для классификации')
  }

  const compact = parsedData.map(toCompact)

  let aiResult: Awaited<ReturnType<typeof callAI>> = null
  try {
    aiResult = await Promise.race([
      callAI({
        promptKey: 'business_model_classification',
        userId,
        maxTokens: 1500,
        variables: {
          period,
          parsedDataJson: JSON.stringify(compact, null, 2),
        },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ])
  } catch (err) {
    console.error('[Classify] callAI threw:', err)
    return safeFallback('AI-сервис недоступен')
  }

  if (!aiResult?.text) {
    console.warn('[Classify] AI returned no text — using safe fallback')
    return safeFallback('AI не вернул ответ')
  }

  const parsed = parseJsonResponse(aiResult.text)
  if (!parsed) {
    console.error('[Classify] could not parse JSON from response:', aiResult.text.slice(0, 400))
    return safeFallback('AI вернул некорректный JSON')
  }

  const validated = validateClassificationResult(parsed)
  if (!validated) {
    console.error('[Classify] response failed schema validation:', parsed)
    return safeFallback('AI вернул некорректную структуру')
  }

  return applyConfidenceFloor(validated)
}

/**
 * Conservative fallback: trading model with `disabled`-style metadata so the
 * caller can distinguish a "real success" from a graceful degradation.
 *
 * Note: status='success' so the wizard moves forward; classificationStatus
 * (set later in the service layer) tracks the degraded outcome.
 */
export function safeFallback(reason?: string): ClassificationResult {
  return {
    status: 'success',
    model: 'trading',
    confidence: null,
    rationale: reason
      ? [`AI-классификация недоступна: ${reason}`, 'Применена базовая модель «Торговая»']
      : ['AI-классификация недоступна', 'Применена базовая модель «Торговая»'],
    indicators: { _missing: [] },
    requestedAccounts: null,
    dataQualityWarning: null,
  }
}

// -----------------------------------------------------------------------------
// Internals

function toCompact(d: ParsedAccountData): CompactAccount {
  // Per-entity data is large and not useful for classification; aggregates only.
  const monthlyTurnoverCredit =
    d.entities.length > 0
      ? aggregateMonthlyCredit(d)
      : undefined

  return {
    accountCode: d.accountCode,
    period: d.period,
    openingDebit: d.totals.openingDebit,
    openingCredit: d.totals.openingCredit,
    turnoverDebit: d.totals.turnoverDebit,
    turnoverCredit: d.totals.turnoverCredit,
    closingDebit: d.totals.closingDebit,
    closingCredit: d.totals.closingCredit,
    entityCount: d.entities.length,
    monthlyTurnoverCredit,
  }
}

function aggregateMonthlyCredit(d: ParsedAccountData): number[] | undefined {
  // Sum monthly credit turnover across all entities — used to estimate
  // revenue regularity. Returns undefined if no monthly data is available.
  const byMonth = new Map<string, number>()
  for (const e of d.entities) {
    for (const m of e.monthly) {
      byMonth.set(m.month, (byMonth.get(m.month) ?? 0) + m.turnoverCredit)
    }
  }
  if (byMonth.size === 0) return undefined
  return Array.from(byMonth.values())
}

function parseJsonResponse(text: string): unknown {
  // Strip markdown code fence if present.
  const cleaned = text
    .replace(/^\s*```json\s*/i, '')
    .replace(/^\s*```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  // Locate the outermost JSON object.
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace <= firstBrace) return null

  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
  } catch {
    return null
  }
}

function validateClassificationResult(raw: unknown): ClassificationResult | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const status = obj.status
  if (typeof status !== 'string' || !VALID_STATUSES.has(status as ClassificationStatus)) return null

  // model: required for success/needs_data, must be null for cannot_classify.
  let model: BusinessModel | null = null
  if (typeof obj.model === 'string') {
    if (!VALID_BUSINESS_MODELS.has(obj.model)) return null
    model = obj.model as BusinessModel
  } else if (obj.model !== null && obj.model !== undefined) {
    return null
  }
  if ((status === 'success' || status === 'needs_data') && !model) return null

  // confidence: number in [0,1] or null.
  let confidence: number | null = null
  if (typeof obj.confidence === 'number') {
    if (!Number.isFinite(obj.confidence) || obj.confidence < 0 || obj.confidence > 1) return null
    confidence = obj.confidence
  } else if (obj.confidence !== null && obj.confidence !== undefined) {
    return null
  }

  const rationale = Array.isArray(obj.rationale)
    ? obj.rationale.filter((s): s is string => typeof s === 'string').slice(0, 8)
    : []

  const indicators = validateIndicators(obj.indicators)

  // requestedAccounts: array of strings (cap to 3) or null.
  let requestedAccounts: string[] | null = null
  if (Array.isArray(obj.requestedAccounts)) {
    requestedAccounts = obj.requestedAccounts
      .filter((s): s is string => typeof s === 'string')
      .slice(0, 3)
    if (requestedAccounts.length === 0) requestedAccounts = null
  } else if (obj.requestedAccounts !== null && obj.requestedAccounts !== undefined) {
    return null
  }

  const dataQualityWarning =
    typeof obj.dataQualityWarning === 'string' && obj.dataQualityWarning.trim().length > 0
      ? obj.dataQualityWarning.trim()
      : null

  return {
    status: status as ClassificationStatus,
    model,
    confidence,
    rationale,
    indicators,
    requestedAccounts,
    dataQualityWarning,
  }
}

function validateIndicators(raw: unknown): ClassificationIndicators {
  const out: ClassificationIndicators = { _missing: [] }
  if (!raw || typeof raw !== 'object') return out
  const obj = raw as Record<string, unknown>

  for (const key of NUMERIC_INDICATOR_KEYS) {
    const v = obj[key]
    if (v === 'missing') {
      out._missing.push(key)
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      out[key] = v
    }
  }

  const dest = obj.account_26_destination
  if (typeof dest === 'string' && VALID_26_DEST.has(dest as Account26Destination)) {
    out.account_26_destination = dest as Account26Destination
    if (dest === 'missing') out._missing.push('account_26_destination')
  } else {
    out._missing.push('account_26_destination')
  }

  return out
}

function applyConfidenceFloor(result: ClassificationResult): ClassificationResult {
  if (result.confidence === null) return result

  // Count known (non-missing) indicators across the 7-key set.
  const total = NUMERIC_INDICATOR_KEYS.length + 1
  const missing = result.indicators._missing.length
  const known = total - missing

  if (known < 4 && result.confidence > 0.6) {
    return { ...result, confidence: 0.6 }
  }
  return result
}
