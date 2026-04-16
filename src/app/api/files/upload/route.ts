import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { identifyFile } from '@/lib/parser/osv-parser'
import { logEvent } from '@/lib/logger'

const MAX_FILES = 10
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'Файлы не выбраны' }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Максимум ${MAX_FILES} файлов` }, { status: 400 })
    }

    const totalSize = files.reduce((s, f) => s + f.size, 0)
    if (totalSize > MAX_SIZE) {
      return NextResponse.json({ error: 'Суммарный размер файлов превышает 10 Мб' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    const uploaded: Array<{ id: string; name: string; accountCode: string | null; period: string | null; status: string }> = []

    for (const file of files) {
      const name = file.name
      const ext = name.split('.').pop()?.toLowerCase()
      if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
        uploaded.push({ id: '', name, accountCode: null, period: null, status: 'error' })
        continue
      }

      const content = await file.text()
      const identified = identifyFile(content)

      const doc = await payload.create({
        collection: 'uploaded-files',
        data: {
          owner: user.id,
          originalName: name,
          detectedType: identified ? `ОСВ по счёту ${identified.accountCode}` : undefined,
          accountCode: identified?.accountCode,
          period: identified?.period,
          parseStatus: identified ? 'success' : 'warning',
          parsedData: { raw: content },
        },
      })

      await logEvent(user.id, 'onboarding.file_upload', 'uploaded-file', doc.id, {
        fileName: name,
        accountCode: identified?.accountCode,
        detected: !!identified,
      })

      uploaded.push({
        id: doc.id,
        name,
        accountCode: identified?.accountCode ?? null,
        period: identified?.period ?? null,
        status: identified ? 'success' : 'warning',
      })
    }

    return NextResponse.json({ ok: true, files: uploaded })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Upload] Error:', message, err)
    return NextResponse.json({ error: `Ошибка загрузки: ${message}` }, { status: 500 })
  }
}
