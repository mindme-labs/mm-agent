import fs from 'fs'
import path from 'path'
import { parseOSVFile } from '../parser/osv-parser.ts'
import { fillTemplate, formatAmount, TEMPLATES } from './templates.ts'
import type { ParsedAccountData, GeneratedRecommendation } from '../../types/index.ts'

// Inline imports to avoid @/ alias issues with Node
import { runDZ1 } from './dz1-overdue-receivable.ts'
import { runDZ2 } from './dz2-concentration.ts'
import { runDZ3 } from './dz3-customer-churn.ts'
import { runKZ1 } from './kz1-unclosed-advances.ts'
import { runZAP1 } from './zap1-illiquid-inventory.ts'
import { runZAP2 } from './zap2-excess-inventory.ts'
import { runPL1 } from './pl1-margin-decline.ts'
import { runFC1 } from './fc1-payment-cycle-imbalance.ts'
import { runSVS1 } from './svs1-data-quality.ts'

function runAllRules(data: ParsedAccountData[]): GeneratedRecommendation[] {
  const rules = [runDZ1, runDZ2, runDZ3, runKZ1, runZAP1, runZAP2, runPL1, runFC1, runSVS1]
  const results: GeneratedRecommendation[] = []
  for (const rule of rules) results.push(...rule(data))
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  results.sort((a, b) => (order[a.priority] ?? 99) - (order[b.priority] ?? 99))
  return results
}

// --- Metrics inline ---
function calcMetrics(data: ParsedAccountData[]) {
  const find = (code: string) => data.find(d => d.accountCode === code)
  const acc9001 = find('90.01'), acc9002 = find('90.02'), acc62 = find('62'), acc60 = find('60')
  const acc41 = find('41'), acc10 = find('10')
  const revenue = acc9001?.totals.turnoverCredit ?? 0
  const cogs = acc9002?.totals.turnoverDebit ?? 0
  const ar = acc62?.totals.closingDebit ?? 0
  const ap = acc60?.totals.closingCredit ?? 0
  const inv = (acc41?.totals.closingDebit ?? 0) + (acc10?.totals.closingDebit ?? 0)
  const avgAR = ((acc62?.totals.openingDebit ?? 0) + ar) / 2
  const avgAP = ((acc60?.totals.openingCredit ?? 0) + ap) / 2
  const arDays = revenue > 0 ? Math.round((avgAR / revenue) * 365) : 0
  const apDays = cogs > 0 ? Math.round((avgAP / cogs) * 365) : 0
  const ratio = ap > 0 ? ar / ap : 999
  const health = ratio > 1.2 ? 'fine' : ratio >= 0.8 ? 'issues' : 'risky'
  return { revenue, cogs, margin: revenue > 0 ? ((revenue-cogs)/revenue*100) : 0, ar, ap, inv, arDays, apDays, health }
}

// --- Run ---
const demoDir = path.resolve(import.meta.dirname, '../../demo-data')
const files = fs.readdirSync(demoDir).filter(f => f.endsWith('.csv'))
const allData: ParsedAccountData[] = files.map(f => parseOSVFile(fs.readFileSync(path.join(demoDir, f), 'utf-8')))

console.log(`Parsed ${allData.length} files\n`)

const recs = runAllRules(allData)
console.log(`Generated ${recs.length} recommendations:\n`)

const byRule = new Map<string, number>()
for (const r of recs) {
  byRule.set(r.ruleCode, (byRule.get(r.ruleCode) ?? 0) + 1)
  console.log(`  [${r.priority.toUpperCase().padEnd(8)}] ${r.ruleCode}: ${r.title}`)
}
console.log(`\nBy rule:`)
for (const [code, count] of byRule) console.log(`  ${code}: ${count}`)

const m = calcMetrics(allData)
console.log(`\nMetrics:`)
console.log(`  Revenue: ${fmt(m.revenue)}, COGS: ${fmt(m.cogs)}, Margin: ${m.margin.toFixed(1)}%`)
console.log(`  AR: ${fmt(m.ar)}, AP: ${fmt(m.ap)}, Inventory: ${fmt(m.inv)}`)
console.log(`  AR Days: ${m.arDays}, AP Days: ${m.apDays}, Health: ${m.health}`)

function fmt(n: number) { return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) }

const hasDZ = recs.some(r => r.ruleCode.startsWith('ДЗ'))
const hasKZ = recs.some(r => r.ruleCode === 'КЗ-1')
const hasZAP = recs.some(r => r.ruleCode.startsWith('ЗАП'))
const hasPL = recs.some(r => r.ruleCode === 'ПЛ-1')
const hasFC = recs.some(r => r.ruleCode === 'ФЦ-1')
const ok = recs.length >= 5 && hasDZ && hasKZ && hasZAP && hasPL && hasFC
console.log(`\nChecks: ≥5=${recs.length >= 5} ДЗ=${hasDZ} КЗ=${hasKZ} ЗАП=${hasZAP} ПЛ=${hasPL} ФЦ=${hasFC}`)
console.log(`${ok ? '🎉 All checks passed!' : '⚠️ Some checks failed'}`)
process.exit(ok ? 0 : 1)
