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
      return NextResponse.json({ phase: 'none', total: 0, enhanced: 0, remaining: 0 })
    }

    const analysis = result.docs[0]

    const [totalResult, enhancedResult] = await Promise.all([
      payload.count({
        collection: 'recommendations',
        where: { owner: { equals: user.id }, status: { equals: 'new' } },
      }),
      payload.count({
        collection: 'recommendations',
        where: { owner: { equals: user.id }, status: { equals: 'new' }, aiEnhanced: { equals: true } },
      }),
    ])

    return NextResponse.json({
      phase: analysis.analysisPhase ?? 'rules_done',
      total: totalResult.totalDocs,
      enhanced: enhancedResult.totalDocs,
      remaining: totalResult.totalDocs - enhancedResult.totalDocs,
    })
  } catch (err) {
    console.error('[Analysis Status] Error:', err)
    return NextResponse.json({ phase: 'error', total: 0, enhanced: 0, remaining: 0 }, { status: 500 })
  }
}
