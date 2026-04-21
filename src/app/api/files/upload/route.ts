import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayload } from 'payload'
import config from '@payload-config'
import { identifyFile, parseOSVFile } from '@/lib/parser/osv-parser'
import { loadFileExtractionSettings } from '@/lib/ai/file-extractor'
import { logEvent } from '@/lib/logger'
import type { ParsedAccountData, UploadedFileParsedData } from '@/types'

const MAX_FILES = 10
const MAX_SIZE = 10 * 1024 * 1024

interface UploadResultEntry {
  id: string
  name: string
  accountCode: string | null
  period: string | null
  status: 'success' | 'needs_ai_recognition' | 'warning' | 'error'
}

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
    const aiSettings = await loadFileExtractionSettings()
    const uploaded: UploadResultEntry[] = []
    let needsAi = 0

    for (const file of files) {
      const name = file.name
      const ext = name.split('.').pop()?.toLowerCase()
      if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
        uploaded.push({ id: '', name, accountCode: null, period: null, status: 'error' })
        continue
      }

      const content = await file.text()
      const result = attemptDeterministicParse(content)

      let parseStatus: UploadResultEntry['status']
      const parsedData: UploadedFileParsedData = { raw: content }

      if (result.parsed) {
        parsedData.parsed = result.parsed
        parseStatus = 'success'
      } else if (aiSettings.enabled) {
        parseStatus = 'needs_ai_recognition'
        needsAi++
      } else {
        // AI disabled — keep legacy behavior: store with warning, analysis will retry parse later
        parseStatus = result.identified ? 'warning' : 'warning'
      }

      const doc = await payload.create({
        collection: 'uploaded-files',
        data: {
          owner: user.id,
          originalName: name,
          detectedType: result.identified ? `ОСВ по счёту ${result.identified.accountCode}` : undefined,
          accountCode: result.identified?.accountCode,
          period: result.identified?.period,
          parseStatus,
          parsedData: parsedData as unknown as Record<string, unknown>,
          parseErrors: result.error ? { reason: result.error } : undefined,
        },
      })

      await logEvent(user.id, 'onboarding.file_upload', 'uploaded-file', String(doc.id), {
        fileName: name,
        accountCode: result.identified?.accountCode,
        detected: !!result.identified,
        parseStatus,
        deterministicParseOk: !!result.parsed,
      })

      uploaded.push({
        id: String(doc.id),
        name,
        accountCode: result.identified?.accountCode ?? null,
        period: result.identified?.period ?? null,
        status: parseStatus,
      })
    }

    return NextResponse.json({
      ok: true,
      files: uploaded,
      needsAi,
      aiAvailable: aiSettings.enabled,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Upload] Error:', message, err)
    return NextResponse.json({ error: `Ошибка загрузки: ${message}` }, { status: 500 })
  }
}

interface DeterministicParseResult {
  identified: { accountCode: string; period: string } | null
  parsed: ParsedAccountData | null
  error: string | null
}

function attemptDeterministicParse(content: string): DeterministicParseResult {
  const identified = identifyFile(content)
  if (!identified) {
    return { identified: null, parsed: null, error: 'header_regex_no_match' }
  }
  try {
    const parsed = parseOSVFile(content)
    return { identified, parsed, error: null }
  } catch (err) {
    return {
      identified,
      parsed: null,
      error: err instanceof Error ? err.message : 'parse_failed',
    }
  }
}
