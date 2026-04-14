import Anthropic from '@anthropic-ai/sdk'
import { getPayload } from 'payload'
import config from '@payload-config'

export interface AICallOptions {
  promptKey: string
  variables?: Record<string, string>
  userId: string
  maxTokens?: number
}

export interface AICallResult {
  text: string
  inputTokens: number
  outputTokens: number
  model: string
  durationMs: number
  fromAI: boolean
}

let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

export async function isAIAvailable(): Promise<boolean> {
  try {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'global-settings' })
    if (!settings.aiEnabled) return false
    return !!process.env.ANTHROPIC_API_KEY
  } catch {
    return false
  }
}

async function loadPrompt(promptKey: string): Promise<{
  systemPrompt: string
  userPromptTemplate: string | null
  model: string
} | null> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'ai-prompts',
      where: {
        promptKey: { equals: promptKey },
        isActive: { equals: true },
      },
      limit: 1,
      sort: '-version',
    })

    if (result.docs.length === 0) return null

    const prompt = result.docs[0]
    const settings = await payload.findGlobal({ slug: 'global-settings' })

    return {
      systemPrompt: prompt.systemPrompt,
      userPromptTemplate: prompt.userPromptTemplate ?? null,
      model: (settings.aiModel as string) || 'claude-sonnet-4-20250514',
    }
  } catch {
    return null
  }
}

function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`)
}

async function logUsage(
  userId: string,
  promptKey: string,
  inputTokens: number,
  outputTokens: number,
  model: string,
  durationMs: number,
): Promise<void> {
  try {
    const payload = await getPayload({ config })
    const inputCost = (inputTokens / 1_000_000) * 3
    const outputCost = (outputTokens / 1_000_000) * 15
    await payload.create({
      collection: 'ai-usage-logs',
      data: {
        owner: userId,
        promptKey,
        inputTokens,
        outputTokens,
        model,
        cost: Math.round((inputCost + outputCost) * 10000) / 10000,
        durationMs,
      },
    })
  } catch (err) {
    console.error('[AI] Failed to log usage:', err)
  }
}

export async function callAI(options: AICallOptions): Promise<AICallResult | null> {
  const { promptKey, variables = {}, userId, maxTokens = 2048 } = options

  const prompt = await loadPrompt(promptKey)
  if (!prompt) {
    console.warn(`[AI] Prompt "${promptKey}" not found or inactive`)
    return null
  }

  const client = getAnthropicClient()
  if (!client) {
    console.warn('[AI] Anthropic client not available (missing API key)')
    return null
  }

  const userContent = prompt.userPromptTemplate
    ? interpolate(prompt.userPromptTemplate, variables)
    : variables.input ?? ''

  const start = Date.now()

  await logEvent(userId, 'ai.request', undefined, undefined, {
    promptKey,
    model: prompt.model,
  })

  try {
    const response = await client.messages.create({
      model: prompt.model,
      max_tokens: maxTokens,
      system: prompt.systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    const durationMs = Date.now() - start
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')

    const result: AICallResult = {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: prompt.model,
      durationMs,
      fromAI: true,
    }

    await logUsage(userId, promptKey, result.inputTokens, result.outputTokens, result.model, result.durationMs)

    await logEvent(userId, 'ai.response', undefined, undefined, {
      promptKey,
      model: prompt.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs,
    })

    return result
  } catch (err) {
    console.error(`[AI] Call failed for prompt "${promptKey}":`, err)
    await logEvent(userId, 'ai.error', undefined, undefined, {
      promptKey,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
    return null
  }
}

async function logEvent(
  userId: string,
  eventType: string,
  entityType?: string,
  entityId?: string,
  eventPayload?: Record<string, unknown>,
): Promise<void> {
  try {
    const { logEvent: log } = await import('@/lib/logger')
    await log(userId, eventType, entityType, entityId, eventPayload)
  } catch {}
}
