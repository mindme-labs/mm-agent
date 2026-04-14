import { NextResponse } from 'next/server'
import { isAIAvailable } from '@/lib/ai/client'

export async function GET() {
  try {
    const available = await isAIAvailable()
    return NextResponse.json({ available })
  } catch {
    return NextResponse.json({ available: false })
  }
}
