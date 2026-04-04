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

  const content = fs.readFileSync(path.join(demoDir, file), 'utf-8')
  const lines = content.split('\n').map(l => l.replace(/\r$/, ''))

  const rows = lines
    .filter(l => l.trim() !== '')
    .map(l => l.split(';').map(c => c.trim()))

  return NextResponse.json({ fileName: file, rows, totalLines: rows.length })
}
