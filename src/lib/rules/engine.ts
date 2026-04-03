import type { ParsedAccountData, GeneratedRecommendation } from '@/types'
import { runDZ1 } from './dz1-overdue-receivable'
import { runDZ2 } from './dz2-concentration'
import { runDZ3 } from './dz3-customer-churn'
import { runKZ1 } from './kz1-unclosed-advances'
import { runZAP1 } from './zap1-illiquid-inventory'
import { runZAP2 } from './zap2-excess-inventory'
import { runPL1 } from './pl1-margin-decline'
import { runFC1 } from './fc1-payment-cycle-imbalance'
import { runSVS1 } from './svs1-data-quality'

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function runRulesEngine(data: ParsedAccountData[]): GeneratedRecommendation[] {
  const rules = [runDZ1, runDZ2, runDZ3, runKZ1, runZAP1, runZAP2, runPL1, runFC1, runSVS1]

  const results: GeneratedRecommendation[] = []
  for (const rule of rules) {
    results.push(...rule(data))
  }

  results.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))

  return results
}
