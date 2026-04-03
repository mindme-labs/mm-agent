import fs from 'fs'
import path from 'path'
import { parseOSVFile, identifyFile } from './osv-parser.ts'

const demoDir = path.resolve(import.meta.dirname, '../../demo-data')
const files = fs.readdirSync(demoDir).filter(f => f.endsWith('.csv'))

let allPassed = true

for (const file of files) {
  const content = fs.readFileSync(path.join(demoDir, file), 'utf-8')

  const id = identifyFile(content)
  if (!id) {
    console.error(`❌ ${file}: cannot identify`)
    allPassed = false
    continue
  }

  try {
    const result = parseOSVFile(content)
    const entityCount = result.entities.length
    const monthlyCount = result.entities.reduce((sum, e) => sum + e.monthly.length, 0)
    const hasTotals = result.totals.turnoverDebit > 0 || result.totals.turnoverCredit > 0 ||
      result.totals.closingDebit > 0 || result.totals.closingCredit > 0

    const checks = [
      entityCount > 0 ? '✓' : '✗ no entities',
      monthlyCount > 0 ? '✓' : '✗ no monthly data',
      hasTotals ? '✓' : '✗ no totals',
    ]

    const passed = entityCount > 0 && monthlyCount > 0 && hasTotals
    if (!passed) allPassed = false

    console.log(`${passed ? '✅' : '❌'} Account ${result.accountCode} (${result.period})`)
    console.log(`   Entities: ${entityCount}, Monthly records: ${monthlyCount}`)
    console.log(`   Totals: D.open=${fmt(result.totals.openingDebit)} C.open=${fmt(result.totals.openingCredit)} D.turn=${fmt(result.totals.turnoverDebit)} C.turn=${fmt(result.totals.turnoverCredit)} D.close=${fmt(result.totals.closingDebit)} C.close=${fmt(result.totals.closingCredit)}`)
    console.log(`   Checks: ${checks.join(', ')}`)
    console.log()
  } catch (err) {
    console.error(`❌ ${file}: parse error:`, (err as Error).message)
    allPassed = false
  }
}

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

console.log(allPassed ? '🎉 All 7 files parsed successfully!' : '⚠️ Some files had issues')
process.exit(allPassed ? 0 : 1)
