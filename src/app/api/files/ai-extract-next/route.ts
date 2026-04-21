/**
 * Phase 2: AI full-extraction for ONE file at a time.
 *
 * Picks the oldest file with parseStatus='needs_ai_extraction' for the
 * current user, runs `aiExtractData()` (uses `data_extraction` prompt),
 * validates the response, and persists `parsedData.aiParsed`.
 *
 * Designed to fit Vercel Hobby's 10s timeout: per-call timeout in the
 * extractor is 9s, with 1s safety buffer for DB write + response.
 *
 * Why a "next" endpoint instead of per-ID:
 *   - The UI polls in a loop until done; doesn't need to know IDs
 *   - Server controls ordering (oldest first)
 *   - Simpler client code
 *
 * Files larger than `aiFileExtractionMaxKB` are truncated; the truncation is
 * recorded in `parsedData.truncated` and `truncatedAtBytes`.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { aiExtractData, loadFileExtractionSettings } from '@/lib/ai/file-extractor'
import { logEvent } from '@/lib/logger'
import type { AIFileHints, AIRecognitionLog, UploadedFileParsedData } from '@/types'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await getPayload({ config })
    const settings = await loadFileExtractionSettings()

    if (!settings.enabled) {
      return NextResponse.json({
        done: true,
        processed: false,
        reason: 'ai_file_extraction_disabled',
      })
    }

    const pending = await payload.find({
      collection: 'uploaded-files',
      where: {
        owner: { equals: user.id },
        parseStatus: { equals: 'needs_ai_extraction' },
      },
      sort: 'createdAt',
      limit: 1,
    })

    if (pending.docs.length === 0) {
      return NextResponse.json({ done: true, processed: false })
    }

    const doc = pending.docs[0]
    const stored = (doc.parsedData ?? {}) as unknown as UploadedFileParsedData
    const existingLogs = Array.isArray(doc.aiRecognitionLog)
      ? (doc.aiRecognitionLog as AIRecognitionLog[])
      : []
    const content = stored.raw ?? ''
    const hints = stored.aiHints

    if (!content || !hints) {
      await payload.update({
        collection: 'uploaded-files',
        id: doc.id,
        data: {
          parseStatus: 'error',
          parseErrors: { reason: 'missing_content_or_hints' },
        },
      })
      return NextResponse.json({
        done: false,
        processed: true,
        ok: false,
        fileId: String(doc.id),
        error: 'missing_content_or_hints',
      })
    }

    const result = await aiExtractData(content, hints as AIFileHints, user.id, {
      maxBytes: settings.maxBytes,
    })

    const log: AIRecognitionLog = {
      attemptedAt: new Date().toISOString(),
      promptKey: 'data_extraction',
      success: !!result.parsed,
      durationMs: result.durationMs,
      inputBytes: Buffer.byteLength(content, 'utf-8'),
      rawResponse: result.rawResponse,
      error: result.error,
    }

    if (result.parsed) {
      const updatedData: UploadedFileParsedData = {
        ...stored,
        aiParsed: result.parsed,
        truncated: result.truncated,
        truncatedAtBytes: result.truncatedAtBytes,
      }
      await payload.update({
        collection: 'uploaded-files',
        id: doc.id,
        data: {
          parseStatus: result.truncated ? 'warning' : 'success',
          parsedData: updatedData as unknown as Record<string, unknown>,
          aiRecognitionLog: [...existingLogs, log],
          parseErrors: result.truncated
            ? { reason: 'truncated_for_ai_extraction', truncatedAtBytes: result.truncatedAtBytes }
            : null,
        },
      })
      await logEvent(user.id, 'ai.response', 'uploaded-file', String(doc.id), {
        stage: 'data_extraction',
        truncated: result.truncated,
      })
      return NextResponse.json({
        done: false,
        processed: true,
        ok: true,
        fileId: String(doc.id),
        truncated: result.truncated,
      })
    }

    await payload.update({
      collection: 'uploaded-files',
      id: doc.id,
      data: {
        parseStatus: 'error',
        parseErrors: { reason: result.error ?? 'extraction_failed' },
        aiRecognitionLog: [...existingLogs, log],
      },
    })
    await logEvent(user.id, 'ai.error', 'uploaded-file', String(doc.id), {
      stage: 'data_extraction',
      error: result.error,
    })

    return NextResponse.json({
      done: false,
      processed: true,
      ok: false,
      fileId: String(doc.id),
      error: result.error,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[AI Extract Next] Error:', message, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
