import { getPayload } from 'payload'
import config from '@payload-config'

export async function logEvent(
  userId: string | null,
  eventType: string,
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
