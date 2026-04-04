import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  const accountCode = request.nextUrl.searchParams.get('account')
  if (!accountCode) {
    return NextResponse.json({ error: 'Missing account parameter' }, { status: 400 })
  }

  const demoDir = path.resolve(process.cwd(), 'src/demo-data')
  const files = fs.readdirSync(demoDir).filter(f => f.endsWith('.csv'))
  const file = files.find(f => f.includes(`счету ${accountCode} `))

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const content = fs.readFileSync(path.join(demoDir, file))

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file)}"`,
    },
  })
}
