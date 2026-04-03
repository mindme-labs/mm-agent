import type { ParsedAccountData } from '@/types'

export interface AnalysisMetrics {
  period: string
  revenue: number
  cogs: number
  grossProfit: number
  grossMargin: number
  accountsReceivable: number
  accountsPayable: number
  inventory: number
  shippedGoods: number
  arTurnoverDays: number
  apTurnoverDays: number
  inventoryTurnoverDays: number
  healthIndex: 'fine' | 'issues' | 'risky'
  topDebtors: Array<{ name: string; amount: number; share: number }>
  topCreditors: Array<{ name: string; amount: number; hasAdvance: boolean }>
}

function findAccount(data: ParsedAccountData[], code: string): ParsedAccountData | undefined {
  return data.find(d => d.accountCode === code)
}

export function calculateMetrics(data: ParsedAccountData[]): AnalysisMetrics {
  const acc9001 = findAccount(data, '90.01')
  const acc9002 = findAccount(data, '90.02')
  const acc62 = findAccount(data, '62')
  const acc60 = findAccount(data, '60')
  const acc41 = findAccount(data, '41')
  const acc10 = findAccount(data, '10')
  const acc45 = findAccount(data, '45')

  const revenue = acc9001?.totals.turnoverCredit ?? 0
  const cogs = acc9002?.totals.turnoverDebit ?? 0
  const grossProfit = revenue - cogs
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

  const accountsReceivable = acc62?.totals.closingDebit ?? 0
  const accountsPayable = acc60?.totals.closingCredit ?? 0
  const inventory = (acc41?.totals.closingDebit ?? 0) + (acc10?.totals.closingDebit ?? 0)
  const shippedGoods = acc45?.totals.closingDebit ?? 0

  const periodDays = 365
  const avgAR = ((acc62?.totals.openingDebit ?? 0) + accountsReceivable) / 2
  const avgAP = ((acc60?.totals.openingCredit ?? 0) + accountsPayable) / 2
  const avgInventory = (((acc41?.totals.openingDebit ?? 0) + (acc10?.totals.openingDebit ?? 0)) + inventory) / 2

  const arTurnoverDays = revenue > 0 ? Math.round((avgAR / revenue) * periodDays) : 0
  const apTurnoverDays = cogs > 0 ? Math.round((avgAP / cogs) * periodDays) : 0
  const inventoryTurnoverDays = cogs > 0 ? Math.round((avgInventory / cogs) * periodDays) : 0

  const arApRatio = accountsPayable > 0 ? accountsReceivable / accountsPayable : 999
  let healthIndex: 'fine' | 'issues' | 'risky'
  if (arApRatio > 1.2) healthIndex = 'fine'
  else if (arApRatio >= 0.8) healthIndex = 'issues'
  else healthIndex = 'risky'

  const topDebtors = (acc62?.entities ?? [])
    .filter(e => e.totals.closingDebit > 0)
    .sort((a, b) => b.totals.closingDebit - a.totals.closingDebit)
    .slice(0, 5)
    .map(e => ({
      name: e.name,
      amount: e.totals.closingDebit,
      share: accountsReceivable > 0 ? Math.round((e.totals.closingDebit / accountsReceivable) * 100) : 0,
    }))

  const topCreditors = (acc60?.entities ?? [])
    .filter(e => e.totals.closingCredit > 0)
    .sort((a, b) => b.totals.closingCredit - a.totals.closingCredit)
    .slice(0, 5)
    .map(e => ({
      name: e.name,
      amount: e.totals.closingCredit,
      hasAdvance: e.totals.closingDebit > 0,
    }))

  const period = data[0]?.period ?? ''

  return {
    period,
    revenue,
    cogs,
    grossProfit,
    grossMargin,
    accountsReceivable,
    accountsPayable,
    inventory,
    shippedGoods,
    arTurnoverDays,
    apTurnoverDays,
    inventoryTurnoverDays,
    healthIndex,
    topDebtors,
    topCreditors,
  }
}
