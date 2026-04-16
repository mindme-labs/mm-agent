import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'analysis-results',
      where: { owner: { equals: user.id } },
      sort: '-createdAt',
      limit: 1,
    })

    if (result.docs.length === 0) {
      return NextResponse.json({ phase: 'none', recommendationCount: 0 })
    }

    const analysis = result.docs[0]

    const recCount = await payload.count({
      collection: 'recommendations',
      where: { owner: { equals: user.id } },
    })

    return NextResponse.json({
      phase: analysis.analysisPhase ?? 'rules_done',
      recommendationCount: recCount.totalDocs,
      analysisId: analysis.id,
    })
  } catch (err) {
    console.error('[Analysis Status] Error:', err)
    return NextResponse.json({ phase: 'error', recommendationCount: 0 }, { status: 500 })
  }
}
