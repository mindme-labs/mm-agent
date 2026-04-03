import type { ParsedAccountData, AccountTotals, ParsedEntity, MonthlyData } from '@/types'

function parseNumber(raw: string): number {
  if (!raw || raw.trim() === '') return 0
  const cleaned = raw.replace(/\s/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function stripBOM(content: string): string {
  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content
}

export function identifyFile(fileContent: string): { accountCode: string; period: string } | null {
  const clean = stripBOM(fileContent)
  const firstLine = clean.split('\n')[0] || ''
  const match = firstLine.match(/по счету\s+(.+?)\s+за\s+(.+?)(?:\s*\.?\s*;|$)/)
  if (!match) return null
  return { accountCode: match[1].trim(), period: match[2].trim() }
}

function isMonthLine(value: string): boolean {
  return /^Обороты за\s/i.test(value.trim())
}

function extractMonth(value: string): string {
  return value.replace(/^Обороты за\s*/i, '').trim()
}

function isTotalLine(value: string, accountCode: string): boolean {
  const v = value.trim()
  return v === accountCode || v === 'Итого'
}

function isSkipLine(value: string): boolean {
  const v = value.trim()
  return v === '' || v === 'Период' || v.startsWith('Выводимые данные') ||
    v.startsWith('Счет') || v.startsWith('Контрагенты') || v.startsWith('Номенклатура') ||
    v.startsWith('Номенклатурные') || v.startsWith('Договоры')
}

function parse7ColFile(lines: string[], accountCode: string): ParsedEntity[] {
  const entities: ParsedEntity[] = []
  let currentEntity: ParsedEntity | null = null

  for (const line of lines) {
    const cols = line.split(';')
    const first = (cols[0] || '').trim()

    if (isSkipLine(first) || first === '' && cols.every(c => c.trim() === '')) continue
    if (first === 'Итого') break
    if (isTotalLine(first, accountCode)) continue

    if (isMonthLine(first)) {
      if (currentEntity) {
        const month = extractMonth(first)
        const monthly: MonthlyData = {
          month,
          turnoverDebit: parseNumber(cols[3]),
          turnoverCredit: parseNumber(cols[4]),
          closingDebit: parseNumber(cols[5]),
          closingCredit: parseNumber(cols[6]),
        }
        currentEntity.monthly.push(monthly)
      }
      continue
    }

    if (first && !isMonthLine(first)) {
      // For account 60, skip contract sub-lines (they have data in cols but
      // the first column looks like a contract number/date pattern)
      if (accountCode === '60' && currentEntity && /^\d|^[А-Яа-я]/.test(first) &&
          (first.includes(' от ') || first.match(/^\d{5,}/))) {
        continue
      }

      currentEntity = {
        name: first,
        totals: {
          openingDebit: parseNumber(cols[1]),
          openingCredit: parseNumber(cols[2]),
          turnoverDebit: parseNumber(cols[3]),
          turnoverCredit: parseNumber(cols[4]),
          closingDebit: parseNumber(cols[5]),
          closingCredit: parseNumber(cols[6]),
        },
        monthly: [],
      }
      entities.push(currentEntity)
    }
  }

  return entities
}

function parse8ColFile(lines: string[], accountCode: string): ParsedEntity[] {
  const entities: ParsedEntity[] = []
  let currentEntity: ParsedEntity | null = null

  for (const line of lines) {
    const cols = line.split(';')
    const first = (cols[0] || '').trim()
    const second = (cols[1] || '').trim()

    if (first === '' && second === '') continue
    if (isSkipLine(first)) continue
    if (first === 'Итого') break
    if (isTotalLine(first, accountCode)) continue

    // Skip quantity rows (Кол.)
    if (second === 'Кол.') continue
    if (first === '' && second === 'Кол.') continue

    if (isMonthLine(first) && second === 'БУ') {
      if (currentEntity) {
        const month = extractMonth(first)
        const monthly: MonthlyData = {
          month,
          turnoverDebit: parseNumber(cols[4]),
          turnoverCredit: parseNumber(cols[5]),
          closingDebit: parseNumber(cols[6]),
          closingCredit: parseNumber(cols[7]),
        }
        currentEntity.monthly.push(monthly)
      }
      continue
    }

    // Month line without БУ indicator (already has opening balance in col[0])
    if (isMonthLine(first) && second !== 'Кол.') {
      if (currentEntity) {
        const month = extractMonth(first)
        const monthly: MonthlyData = {
          month,
          turnoverDebit: parseNumber(cols[4]),
          turnoverCredit: parseNumber(cols[5]),
          closingDebit: parseNumber(cols[6]),
          closingCredit: parseNumber(cols[7]),
        }
        currentEntity.monthly.push(monthly)
      }
      continue
    }

    // Entity header line with БУ
    if (first && second === 'БУ') {
      currentEntity = {
        name: first,
        totals: {
          openingDebit: parseNumber(cols[2]),
          openingCredit: parseNumber(cols[3]),
          turnoverDebit: parseNumber(cols[4]),
          turnoverCredit: parseNumber(cols[5]),
          closingDebit: parseNumber(cols[6]),
          closingCredit: parseNumber(cols[7]),
        },
        monthly: [],
      }
      entities.push(currentEntity)
    }
  }

  return entities
}

function parseTotals7Col(lines: string[], accountCode: string): AccountTotals {
  for (const line of lines) {
    const cols = line.split(';')
    const first = (cols[0] || '').trim()
    if (first === accountCode) {
      return {
        openingDebit: parseNumber(cols[1]),
        openingCredit: parseNumber(cols[2]),
        turnoverDebit: parseNumber(cols[3]),
        turnoverCredit: parseNumber(cols[4]),
        closingDebit: parseNumber(cols[5]),
        closingCredit: parseNumber(cols[6]),
      }
    }
  }
  return { openingDebit: 0, openingCredit: 0, turnoverDebit: 0, turnoverCredit: 0, closingDebit: 0, closingCredit: 0 }
}

function parseTotals8Col(lines: string[], accountCode: string): AccountTotals {
  for (const line of lines) {
    const cols = line.split(';')
    const first = (cols[0] || '').trim()
    const second = (cols[1] || '').trim()
    if (first === accountCode && second === 'БУ') {
      return {
        openingDebit: parseNumber(cols[2]),
        openingCredit: parseNumber(cols[3]),
        turnoverDebit: parseNumber(cols[4]),
        turnoverCredit: parseNumber(cols[5]),
        closingDebit: parseNumber(cols[6]),
        closingCredit: parseNumber(cols[7]),
      }
    }
  }
  return { openingDebit: 0, openingCredit: 0, turnoverDebit: 0, turnoverCredit: 0, closingDebit: 0, closingCredit: 0 }
}

export function parseOSVFile(fileContent: string): ParsedAccountData {
  const clean = stripBOM(fileContent)
  const lines = clean.split('\n').map(l => l.replace(/\r$/, ''))

  const id = identifyFile(fileContent)
  if (!id) {
    throw new Error('Cannot identify OSV file: first line does not match expected pattern')
  }

  const { accountCode, period } = id
  const is8Col = ['10', '41', '45'].includes(accountCode)

  const dataLines = lines.slice(1)

  const totals = is8Col
    ? parseTotals8Col(dataLines, accountCode)
    : parseTotals7Col(dataLines, accountCode)

  const entities = is8Col
    ? parse8ColFile(dataLines, accountCode)
    : parse7ColFile(dataLines, accountCode)

  return { accountCode, period, totals, entities }
}
