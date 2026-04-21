/**
 * AI-powered file recognition and extraction.
 *
 * Two functions:
 *   - aiIdentifyFile() — cheap, fast (~2-3 s). Identifies accountCode, period,
 *     and column format from the first 50 lines. Used as a fallback when the
 *     deterministic regex fails.
 *
 *   - aiExtractData() — expensive, slow (~5-9 s). Full structured extraction
 *     of ParsedAccountData. Used as last-ditch when even AI-recognition + the
 *     lenient parser cannot extract entities. (Phase 2 wires this in.)
 *
 * Both are gated by GlobalSettings.aiFileExtractionEnabled and the presence
 * of ANTHROPIC_API_KEY (via callAI's existing checks).
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { callAI } from './client'
import { validateParsedAccountDataDetailed } from '@/lib/parser/validate'
import type { AIFileHints, ParsedAccountData } from '@/types'

export interface FileExtractionSettings {
  enabled: boolean
  maxBytes: number
  batchSize: number
}

export async function loadFileExtractionSettings(): Promise<FileExtractionSettings> {
  try {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'global-settings' })
    return {
      enabled: Boolean((settings as { aiFileExtractionEnabled?: boolean }).aiFileExtractionEnabled ?? false),
      maxBytes: Number((settings as { aiFileExtractionMaxKB?: number }).aiFileExtractionMaxKB ?? 100) * 1024,
      batchSize: Number((settings as { aiFileBatchSize?: number }).aiFileBatchSize ?? 2),
    }
  } catch {
    return { enabled: false, maxBytes: 100 * 1024, batchSize: 2 }
  }
}

const RECOGNITION_TIMEOUT_MS = 5_000
const EXTRACTION_TIMEOUT_MS = 9_000
const RECOGNITION_PREVIEW_LINES = 50

export interface AIIdentifyResult {
  hints: AIFileHints | null
  error?: string
  durationMs: number
  rawResponse?: string
}

export async function aiIdentifyFile(
  content: string,
  filename: string,
  userId: string,
): Promise<AIIdentifyResult> {
  const start = Date.now()
  const preview = content.split('\n').slice(0, RECOGNITION_PREVIEW_LINES).join('\n')

  const aiCall = callAI({
    promptKey: 'file_recognition',
    variables: { filename, preview },
    userId,
    maxTokens: 256,
  })

  const result = await Promise.race([
    aiCall,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), RECOGNITION_TIMEOUT_MS)),
  ])

  const durationMs = Date.now() - start

  if (!result) {
    return { hints: null, error: 'ai_timeout_or_unavailable', durationMs }
  }

  const json = result.text.match(/\{[\s\S]*?\}/)?.[0]
  if (!json) {
    return { hints: null, error: 'no_json_in_response', durationMs, rawResponse: result.text.slice(0, 500) }
  }

  try {
    const parsed = JSON.parse(json) as Record<string, unknown>
    const accountCode = typeof parsed.accountCode === 'string' ? parsed.accountCode.trim() : null
    const period = typeof parsed.period === 'string' ? parsed.period.trim() : null

    if (!accountCode || !period) {
      return { hints: null, error: 'missing_account_or_period', durationMs, rawResponse: json }
    }

    const columnFormat = parseColumnFormat(parsed.columnFormat)

    return {
      hints: {
        accountCode,
        period,
        documentType: typeof parsed.documentType === 'string' ? parsed.documentType : `ОСВ по счёту ${accountCode}`,
        columnFormat,
      },
      durationMs,
      rawResponse: json,
    }
  } catch (err) {
    return {
      hints: null,
      error: err instanceof Error ? err.message : 'json_parse_failed',
      durationMs,
      rawResponse: json,
    }
  }
}

function parseColumnFormat(value: unknown): AIFileHints['columnFormat'] {
  if (value === '7-col' || value === '8-col' || value === 'unknown') return value
  return 'unknown'
}

export interface AIExtractResult {
  parsed: ParsedAccountData | null
  error?: string
  durationMs: number
  truncated: boolean
  truncatedAtBytes?: number
  rawResponse?: string
}

export async function aiExtractData(
  content: string,
  hints: AIFileHints,
  userId: string,
  options: { maxBytes?: number } = {},
): Promise<AIExtractResult> {
  const start = Date.now()
  const maxBytes = options.maxBytes ?? 100 * 1024
  const originalBytes = Buffer.byteLength(content, 'utf-8')
  const truncated = originalBytes > maxBytes
  const payload = truncated ? content.slice(0, maxBytes) : content

  const aiCall = callAI({
    promptKey: 'data_extraction',
    variables: {
      accountCode: hints.accountCode,
      period: hints.period,
      columnFormat: hints.columnFormat ?? 'unknown',
      data: payload,
    },
    userId,
    maxTokens: 8192,
  })

  const result = await Promise.race([
    aiCall,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), EXTRACTION_TIMEOUT_MS)),
  ])

  const durationMs = Date.now() - start

  if (!result) {
    return {
      parsed: null,
      error: 'ai_timeout_or_unavailable',
      durationMs,
      truncated,
      truncatedAtBytes: truncated ? maxBytes : undefined,
    }
  }

  const json = result.text.match(/\{[\s\S]*\}/)?.[0]
  if (!json) {
    return {
      parsed: null,
      error: 'no_json_in_response',
      durationMs,
      truncated,
      truncatedAtBytes: truncated ? maxBytes : undefined,
      rawResponse: result.text.slice(0, 500),
    }
  }

  try {
    const obj = JSON.parse(json) as Record<string, unknown>
    if (typeof obj.error === 'string') {
      return {
        parsed: null,
        error: `ai_says:${obj.error}`,
        durationMs,
        truncated,
        truncatedAtBytes: truncated ? maxBytes : undefined,
      }
    }

    const validation = validateParsedAccountDataDetailed(obj)
    if (!validation.ok) {
      return {
        parsed: null,
        error: `validation_failed:${validation.reason}`,
        durationMs,
        truncated,
        truncatedAtBytes: truncated ? maxBytes : undefined,
        rawResponse: json.slice(0, 500),
      }
    }

    return {
      parsed: obj as unknown as ParsedAccountData,
      durationMs,
      truncated,
      truncatedAtBytes: truncated ? maxBytes : undefined,
    }
  } catch (err) {
    return {
      parsed: null,
      error: err instanceof Error ? err.message : 'json_parse_failed',
      durationMs,
      truncated,
      truncatedAtBytes: truncated ? maxBytes : undefined,
      rawResponse: json.slice(0, 500),
    }
  }
}
