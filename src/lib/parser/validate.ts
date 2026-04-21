/**
 * Validators for parsed and AI-extracted account data.
 *
 * Used to gate AI extraction output before persisting it as authoritative.
 * AI may return malformed JSON, the wrong shape, or hallucinated numbers — we
 * reject anything that doesn't pass these checks rather than poison downstream
 * analysis with bad data.
 */

import type { AccountTotals, ParsedAccountData, ParsedEntity } from '@/types'

const SUPPORTED_ACCOUNTS = ['10', '41', '45', '60', '62', '90.01', '90.02']

/**
 * Tolerance for "totals match sum of entity balances" check.
 * AI may slightly miscount due to rounding or skipping a sub-line.
 */
const TOTALS_TOLERANCE_RATIO = 0.05

export interface ValidationResult {
  ok: boolean
  reason?: string
}

export function validateParsedAccountData(data: unknown): data is ParsedAccountData {
  return validateParsedAccountDataDetailed(data).ok
}

export function validateParsedAccountDataDetailed(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'not_an_object' }
  }
  const d = data as Record<string, unknown>

  if (typeof d.accountCode !== 'string' || !SUPPORTED_ACCOUNTS.includes(d.accountCode)) {
    return { ok: false, reason: `unsupported_account_code:${d.accountCode}` }
  }

  if (typeof d.period !== 'string' || d.period.trim().length === 0) {
    return { ok: false, reason: 'missing_period' }
  }

  if (!isAccountTotals(d.totals)) {
    return { ok: false, reason: 'invalid_totals_shape' }
  }

  if (!Array.isArray(d.entities)) {
    return { ok: false, reason: 'entities_not_array' }
  }

  for (let i = 0; i < d.entities.length; i++) {
    const entity = d.entities[i]
    if (!isParsedEntity(entity)) {
      return { ok: false, reason: `invalid_entity_at_index_${i}` }
    }
  }

  // Sanity: sum of entity closing balances should be in the ballpark of totals.
  const totals = d.totals as AccountTotals
  const entities = d.entities as ParsedEntity[]
  const sumDebit = entities.reduce((s, e) => s + e.totals.closingDebit, 0)
  const sumCredit = entities.reduce((s, e) => s + e.totals.closingCredit, 0)

  if (totals.closingDebit > 0) {
    const diff = Math.abs(sumDebit - totals.closingDebit) / totals.closingDebit
    if (diff > TOTALS_TOLERANCE_RATIO) {
      return { ok: false, reason: `closing_debit_mismatch:${diff.toFixed(3)}` }
    }
  }
  if (totals.closingCredit > 0) {
    const diff = Math.abs(sumCredit - totals.closingCredit) / totals.closingCredit
    if (diff > TOTALS_TOLERANCE_RATIO) {
      return { ok: false, reason: `closing_credit_mismatch:${diff.toFixed(3)}` }
    }
  }

  return { ok: true }
}

function isAccountTotals(value: unknown): value is AccountTotals {
  if (!value || typeof value !== 'object') return false
  const t = value as Record<string, unknown>
  return (
    typeof t.openingDebit === 'number' &&
    typeof t.openingCredit === 'number' &&
    typeof t.turnoverDebit === 'number' &&
    typeof t.turnoverCredit === 'number' &&
    typeof t.closingDebit === 'number' &&
    typeof t.closingCredit === 'number'
  )
}

function isParsedEntity(value: unknown): value is ParsedEntity {
  if (!value || typeof value !== 'object') return false
  const e = value as Record<string, unknown>
  if (typeof e.name !== 'string' || e.name.trim().length === 0) return false
  if (!isAccountTotals(e.totals)) return false
  if (!Array.isArray(e.monthly)) return false
  return true
}
