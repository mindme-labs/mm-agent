import fs from 'fs'
import path from 'path'
import { parseOSVFile } from './lib/parser/osv-parser'
import { runRulesEngine } from './lib/rules/engine'
import { calculateMetrics } from './lib/rules/metrics'
import type { ParsedAccountData } from './types'

const demoDir = path.resolve(process.cwd(), 'src/demo-data')
const files = fs.readdirSync(demoDir).filter(f => f.endsWith('.csv'))

console.log(`Found ${files.length} demo CSV files\n`)

const allData: ParsedAccountData[] = files.map(f => {
  const content = fs.readFileSync(path.join(demoDir, f), 'utf-8')
  const parsed = parseOSVFile(content)
  console.log(`✅ Parsed: ${f} → Account ${parsed.accountCode}, ${parsed.entities.length} entities`)
  return parsed
})

console.log('\nRunning rules engine...')
const recommendations = runRulesEngine(allData)
console.log(`Generated ${recommendations.length} recommendations`)

console.log('\nCalculating metrics...')
const metrics = calculateMetrics(allData)
console.log(`Revenue: ${(metrics.revenue / 1_000_000).toFixed(1)}M ₽`)
console.log(`Margin: ${metrics.grossMargin.toFixed(1)}%`)
console.log(`Health: ${metrics.healthIndex}`)

console.log('\n--- Recommendations ---')
for (const rec of recommendations) {
  console.log(`[${rec.priority.toUpperCase()}] ${rec.ruleCode}: ${rec.title}`)
}

console.log('\n✅ Seed data validated. Use the onboarding flow to seed for a specific user.')
console.log('   Or call POST /api/demo/seed while logged in as a demo user.')
