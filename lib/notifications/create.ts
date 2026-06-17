import { createServiceClient } from '@/lib/supabase/service'
import type { NotificationType } from '@/lib/supabase/types'

interface CreateNotificationArgs {
  userId: string
  type: NotificationType
  title: string
  body: string
  link?: string
}

export async function createNotification({ userId, type, title, body, link }: CreateNotificationArgs) {
  const service = createServiceClient()
  await service.from('notifications').insert({
    user_id: userId, type, title, body, link,
  } as any)
}
