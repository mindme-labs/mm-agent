import { getPayload } from 'payload'
import config from '@payload-config'
import type { EventLog } from '@/payload-types'

type EventType = NonNullable<EventLog['eventType']>

export async function logEvent(
  userId: string | null,
  eventType: EventType,
  entityType?: string,
  entityId?: string,
  eventPayload?: Record<string, unknown>,
): Promise<void> {
  try {
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'event-log',
      data: {
        owner: userId || undefined,
        eventType,
        entityType,
        entityId,
        payload: eventPayload,
      },
    })
  } catch (err) {
    console.error('[EventLog] Failed to log event:', eventType, err)
  }
}
