export interface AccountTotals {
  openingDebit: number
  openingCredit: number
  turnoverDebit: number
  turnoverCredit: number
  closingDebit: number
  closingCredit: number
}

export interface MonthlyData {
  month: string
  turnoverDebit: number
  turnoverCredit: number
  closingDebit: number
  closingCredit: number
}

export interface ParsedEntity {
  name: string
  totals: AccountTotals
  monthly: MonthlyData[]
}

export interface ParsedAccountData {
  accountCode: string
  period: string
  totals: AccountTotals
  entities: ParsedEntity[]
}

export interface GeneratedRecommendation {
  ruleCode: string
  ruleName: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  shortRecommendation: string
  fullText: string
  impactMetric: 'accounts_receivable' | 'accounts_payable' | 'inventory' | 'revenue' | 'strategic'
  impactDirection: 'decrease' | 'increase'
  impactAmount: number
  sourceAccount: string
  counterparty?: string
  recipient: string
}

export interface UploadedFileParsedData {
  raw: string
  parsed?: ParsedAccountData
  aiParsed?: ParsedAccountData
  aiHints?: AIFileHints
  truncated?: boolean
  truncatedAtBytes?: number
}

export interface AIFileHints {
  accountCode: string
  period: string
  documentType: string
  columnFormat?: '7-col' | '8-col' | 'unknown'
}

export interface AIRecognitionLog {
  attemptedAt: string
  promptKey: 'file_recognition' | 'data_extraction'
  success: boolean
  durationMs: number
  inputBytes: number
  rawResponse?: string
  error?: string
}

export type RuleSignalValue = string | number | boolean

export interface RuleCandidate {
  ruleCode: string
  ruleName: string
  priorityHint: 'critical' | 'high' | 'medium' | 'low'
  impactMetric: GeneratedRecommendation['impactMetric']
  impactDirection: 'decrease' | 'increase'
  impactAmount: number
  sourceAccount: string
  counterparty?: string
  recipient: string
  signals: Record<string, RuleSignalValue>
  fallbackTemplateKey?: string
}
