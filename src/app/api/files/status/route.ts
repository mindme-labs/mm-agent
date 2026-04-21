/**
 * Aggregated upload status for the current user.
 *
 * The onboarding UI polls this endpoint to know whether to keep calling
 * /api/files/ai-recognize-batch (and Phase 2: /api/files/ai-extract/[id]).
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await getPayload({ config })

    const [total, success, needsRecognition, needsExtraction, warning, errored] = await Promise.all([
      payload.count({
        collection: 'uploaded-files',
        where: { owner: { equals: user.id } },
      }),
      payload.count({
        collection: 'uploaded-files',
        where: { owner: { equals: user.id }, parseStatus: { equals: 'success' } },
      }),
      payload.count({
        collection: 'uploaded-files',
        where: { owner: { equals: user.id }, parseStatus: { equals: 'needs_ai_recognition' } },
      }),
      payload.count({
        collection: 'uploaded-files',
        where: { owner: { equals: user.id }, parseStatus: { equals: 'needs_ai_extraction' } },
      }),
      payload.count({
        collection: 'uploaded-files',
        where: { owner: { equals: user.id }, parseStatus: { equals: 'warning' } },
      }),
      payload.count({
        collection: 'uploaded-files',
        where: { owner: { equals: user.id }, parseStatus: { equals: 'error' } },
      }),
    ])

    const inProgress = needsRecognition.totalDocs + needsExtraction.totalDocs

    return NextResponse.json({
      total: total.totalDocs,
      success: success.totalDocs,
      needsRecognition: needsRecognition.totalDocs,
      needsExtraction: needsExtraction.totalDocs,
      warning: warning.totalDocs,
      failed: errored.totalDocs,
      inProgress,
      done: inProgress === 0,
    })
  } catch (err) {
    console.error('[Files Status] Error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
