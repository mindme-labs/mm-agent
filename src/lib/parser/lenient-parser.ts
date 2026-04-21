/**
 * Lenient OSV parser that accepts AI-recognized hints instead of relying on
 * the strict first-line regex.
 *
 * Strategy:
 *   1. Use AI hints to determine accountCode + period + columnFormat
 *   2. Skip up to N "header" lines (CSV preambles, custom report metadata)
 *      until we find the first data line
 *   3. Run the appropriate column parser from osv-parser.ts on the rest
 *
 * Returns null if even with hints we can't extract anything useful.
 */

import type { AIFileHints, ParsedAccountData } from '@/types'
import {
  parse7ColFile,
  parse8ColFile,
  parseTotals7Col,
  parseTotals8Col,
} from './osv-parser'

const MAX_HEADER_LINES_TO_SKIP = 10

export function parseOSVFileWithHints(
  fileContent: string,
  hints: AIFileHints,
): ParsedAccountData | null {
  if (!hints.accountCode || !hints.period) return null

  const cleaned = fileContent.charCodeAt(0) === 0xfeff ? fileContent.slice(1) : fileContent
  const allLines = cleaned.split('\n').map((l) => l.replace(/\r$/, ''))

  const columnFormat = inferColumnFormat(hints)
  const dataLines = trimPreamble(allLines)

  try {
    if (columnFormat === '8-col') {
      const totals = parseTotals8Col(dataLines, hints.accountCode)
      const entities = parse8ColFile(dataLines, hints.accountCode)
      if (entities.length === 0) return null
      return {
        accountCode: hints.accountCode,
        period: hints.period,
        totals,
        entities,
      }
    }

    const totals = parseTotals7Col(dataLines, hints.accountCode)
    const entities = parse7ColFile(dataLines, hints.accountCode)
    if (entities.length === 0) return null
    return {
      accountCode: hints.accountCode,
      period: hints.period,
      totals,
      entities,
    }
  } catch (err) {
    console.warn('[LenientParser] failed even with hints:', err)
    return null
  }
}

function inferColumnFormat(hints: AIFileHints): '7-col' | '8-col' {
  if (hints.columnFormat === '7-col' || hints.columnFormat === '8-col') {
    return hints.columnFormat
  }
  return ['10', '41', '45'].includes(hints.accountCode) ? '8-col' : '7-col'
}

/**
 * Skip up to N leading lines that look like report preamble — anything that
 * doesn't have at least 3 semicolon-separated cells is considered preamble.
 * The deterministic parser slices `lines.slice(1)` on the assumption the
 * first line is always the report header; we relax that here.
 */
function trimPreamble(lines: string[]): string[] {
  for (let i = 0; i < Math.min(MAX_HEADER_LINES_TO_SKIP, lines.length); i++) {
    const cols = lines[i].split(';')
    if (cols.length >= 3 && cols.some((c) => c.trim().length > 0)) {
      // Skip lines that look like a report title (single populated cell, no semicolons)
      // but keep the line if it already has tabular structure.
      if (cols.filter((c) => c.trim().length > 0).length >= 2) {
        return lines.slice(i)
      }
    }
  }
  return lines.slice(1)
}
