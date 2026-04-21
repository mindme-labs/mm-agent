/**
 * Chunked AI recognition for uploaded files.
 *
 * Pulls up to N files (default 2) with parseStatus='needs_ai_recognition',
 * runs AI recognition (~2-3 s each) in parallel, then attempts a lenient
 * parse with the AI-provided hints. Files that succeed move to 'success';
 * files where the lenient parser still fails move to 'needs_ai_extraction'
 * (handled by Phase 2 / /api/files/ai-extract/[id]).
 *
 * Designed to fit Vercel Hobby's 10s function timeout — total wall time per
 * call is bounded at ~7 s (2 parallel calls × 3.5 s each).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { aiIdentifyFile, loadFileExtractionSettings } from '@/lib/ai/file-extractor'
import { parseOSVFileWithHints } from '@/lib/parser/lenient-parser'
import { logEvent } from '@/lib/logger'
import type { AIRecognitionLog, UploadedFileParsedData } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await getPayload({ config })
    const settings = await loadFileExtractionSettings()

    if (!settings.enabled) {
      return NextResponse.json({
        done: true,
        processed: 0,
        recovered: 0,
        remaining: 0,
        failed: 0,
        reason: 'ai_file_extraction_disabled',
      })
    }

    let batchSize = settings.batchSize
    try {
      const body = (await request.json()) as { batchSize?: number } | null
      if (body && typeof body.batchSize === 'number' && body.batchSize > 0) {
        batchSize = Math.min(body.batchSize, 5)
      }
    } catch {
      // No body — use settings default.
    }

    const pending = await payload.find({
      collection: 'uploaded-files',
      where: {
        owner: { equals: user.id },
        parseStatus: { equals: 'needs_ai_recognition' },
      },
      sort: 'createdAt',
      limit: batchSize,
    })

    if (pending.docs.length === 0) {
      const remaining = await payload.count({
        collection: 'uploaded-files',
        where: {
          owner: { equals: user.id },
          parseStatus: { in: ['needs_ai_recognition', 'needs_ai_extraction'] },
        },
      })
      return NextResponse.json({
        done: remaining.totalDocs === 0,
        processed: 0,
        recovered: 0,
        remaining: remaining.totalDocs,
        failed: 0,
      })
    }

    const outcomes = await Promise.all(
      pending.docs.map((doc) => recognizeOne(doc, user.id, payload)),
    )

    const processed = outcomes.length
    const recovered = outcomes.filter((o) => o.outcome === 'recovered').length
    const failed = outcomes.filter((o) => o.outcome === 'failed').length

    const remaining = await payload.count({
      collection: 'uploaded-files',
      where: {
        owner: { equals: user.id },
        parseStatus: { in: ['needs_ai_recognition', 'needs_ai_extraction'] },
      },
    })

    return NextResponse.json({
      done: remaining.totalDocs === 0,
      processed,
      recovered,
      failed,
      remaining: remaining.totalDocs,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[AI Recognize Batch] Error:', message, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface RecognizeOutcome {
  fileId: string
  outcome: 'recovered' | 'needs_extraction' | 'failed'
  error?: string
}

async function recognizeOne(
  doc: {
    id: string | number
    parsedData?: unknown
    originalName?: string | null
    aiRecognitionLog?: unknown
  },
  userId: string,
  payload: Awaited<ReturnType<typeof getPayload>>,
): Promise<RecognizeOutcome> {
  const fileId = String(doc.id)
  const stored = (doc.parsedData ?? {}) as UploadedFileParsedData
  const existingLogs = Array.isArray(doc.aiRecognitionLog)
    ? (doc.aiRecognitionLog as AIRecognitionLog[])
    : []
  const content = stored.raw ?? ''
  const filename = doc.originalName ?? 'unknown.csv'

  if (!content) {
    await markFailed(payload, fileId, 'no_raw_content')
    return { fileId, outcome: 'failed', error: 'no_raw_content' }
  }

  const recognition = await aiIdentifyFile(content, filename, userId)

  const log: AIRecognitionLog = {
    attemptedAt: new Date().toISOString(),
    promptKey: 'file_recognition',
    success: !!recognition.hints,
    durationMs: recognition.durationMs,
    inputBytes: Buffer.byteLength(content, 'utf-8'),
    rawResponse: recognition.rawResponse,
    error: recognition.error,
  }

  if (!recognition.hints) {
    await payload.update({
      collection: 'uploaded-files',
      id: doc.id,
      data: {
        parseStatus: 'error',
        parseErrors: { reason: recognition.error ?? 'recognition_failed' },
        aiRecognitionLog: [...existingLogs, log],
      },
    })
    await logEvent(userId, 'ai.error', 'uploaded-file', fileId, {
      stage: 'file_recognition',
      error: recognition.error,
    })
    return { fileId, outcome: 'failed', error: recognition.error }
  }

  // AI recognition succeeded — try the lenient parser with the hints.
  const parsed = parseOSVFileWithHints(content, recognition.hints)

  if (parsed) {
    const updatedData: UploadedFileParsedData = {
      ...stored,
      parsed,
      aiHints: recognition.hints,
    }
    await payload.update({
      collection: 'uploaded-files',
      id: doc.id,
      data: {
        parseStatus: 'success',
        accountCode: recognition.hints.accountCode,
        period: recognition.hints.period,
        detectedType: recognition.hints.documentType,
        parsedData: updatedData as unknown as Record<string, unknown>,
        aiRecognitionLog: [...existingLogs, log],
        parseErrors: null,
      },
    })
    return { fileId, outcome: 'recovered' }
  }

  // Recognition OK but lenient parser couldn't extract entities — defer to Phase 2 extraction.
  const updatedData: UploadedFileParsedData = {
    ...stored,
    aiHints: recognition.hints,
  }
  await payload.update({
    collection: 'uploaded-files',
    id: doc.id,
    data: {
      parseStatus: 'needs_ai_extraction',
      accountCode: recognition.hints.accountCode,
      period: recognition.hints.period,
      detectedType: recognition.hints.documentType,
      parsedData: updatedData as unknown as Record<string, unknown>,
      aiRecognitionLog: [...existingLogs, log],
    },
  })
  return { fileId, outcome: 'needs_extraction' }
}

async function markFailed(
  payload: Awaited<ReturnType<typeof getPayload>>,
  fileId: string,
  reason: string,
): Promise<void> {
  await payload.update({
    collection: 'uploaded-files',
    id: fileId,
    data: {
      parseStatus: 'error',
      parseErrors: { reason },
    },
  })
}

