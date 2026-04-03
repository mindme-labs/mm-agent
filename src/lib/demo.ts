import { getPayload } from 'payload'
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { parseOSVFile } from './parser/osv-parser'
import { runRulesEngine } from './rules/engine'
import { calculateMetrics } from './rules/metrics'
import type { ParsedAccountData } from '@/types'

function loadDemoData(): ParsedAccountData[] {
  const demoDir = path.resolve(process.cwd(), 'src/demo-data')
  const files = fs.readdirSync(demoDir).filter(f => f.endsWith('.csv'))
  return files.map(f => parseOSVFile(fs.readFileSync(path.join(demoDir, f), 'utf-8')))
}

export async function seedDemoForUser(userId: string): Promise<number> {
  const payload = await getPayload({ config })

  const data = loadDemoData()
  const recommendations = runRulesEngine(data)
  const metrics = calculateMetrics(data)

  await payload.create({
    collection: 'analysis-results',
    data: {
      owner: userId,
      period: metrics.period,
      revenue: metrics.revenue,
      cogs: metrics.cogs,
      grossProfit: metrics.grossProfit,
      grossMargin: metrics.grossMargin,
      accountsReceivable: metrics.accountsReceivable,
      accountsPayable: metrics.accountsPayable,
      inventory: metrics.inventory,
      shippedGoods: metrics.shippedGoods,
      arTurnoverDays: metrics.arTurnoverDays,
      apTurnoverDays: metrics.apTurnoverDays,
      inventoryTurnoverDays: metrics.inventoryTurnoverDays,
      healthIndex: metrics.healthIndex,
      topDebtors: metrics.topDebtors,
      topCreditors: metrics.topCreditors,
      isDemo: true,
    },
  })

  for (const rec of recommendations) {
    await payload.create({
      collection: 'recommendations',
      data: {
        owner: userId,
        ruleCode: rec.ruleCode,
        ruleName: rec.ruleName,
        priority: rec.priority,
        title: rec.title,
        description: rec.description,
        shortRecommendation: rec.shortRecommendation,
        fullText: rec.fullText,
        status: 'new',
        impactMetric: rec.impactMetric,
        impactDirection: rec.impactDirection,
        impactAmount: rec.impactAmount,
        sourceAccount: rec.sourceAccount,
        counterparty: rec.counterparty,
        recipient: rec.recipient,
        isDemo: true,
        isAiGenerated: false,
      },
    })
  }

  for (const file of data) {
    await payload.create({
      collection: 'uploaded-files',
      data: {
        owner: userId,
        originalName: `ОСВ по счёту ${file.accountCode} за ${file.period}`,
        detectedType: 'ОСВ',
        accountCode: file.accountCode,
        period: file.period,
        parseStatus: 'success',
        parsedData: file as unknown as Record<string, unknown>,
      },
    })
  }

  return recommendations.length
}

export async function clearDemoForUser(userId: string): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'recommendations',
    where: { owner: { equals: userId }, isDemo: { equals: true } },
  })

  await payload.delete({
    collection: 'analysis-results',
    where: { owner: { equals: userId }, isDemo: { equals: true } },
  })

  await payload.delete({
    collection: 'uploaded-files',
    where: { owner: { equals: userId } },
  })

  await payload.delete({
    collection: 'recommendation-feedback',
    where: { owner: { equals: userId } },
  })

  await payload.update({
    collection: 'users',
    id: userId,
    data: { hasCompletedOnboarding: false },
  })
}
