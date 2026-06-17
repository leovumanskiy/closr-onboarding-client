'use server'

import { requireUser } from '@/lib/auth/requireUser'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

export async function updateProfile({
  fullName,
  businessName,
  businessWebsite,
  niche,
  startDate,
  imageUrl,
  slackChannelId,
  slackUserId,
}: {
  fullName?: string
  businessName?: string
  businessWebsite?: string
  niche?: string
  startDate?: string
  imageUrl?: string
  slackChannelId?: string
  slackUserId?: string
}) {
  const session = await requireUser()
  const service = createServiceClient()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (fullName !== undefined) patch.full_name = fullName.trim() || null
  if (businessName !== undefined && businessName.trim()) patch.business_name = businessName.trim()
  if (businessWebsite !== undefined) patch.business_website = businessWebsite.trim() || null
  if (niche !== undefined) patch.niche = niche.trim() || null
  if (startDate !== undefined) patch.start_date = startDate || null
  if (imageUrl !== undefined) patch.image_url = imageUrl || null
  if (slackChannelId !== undefined) patch.slack_channel_id = slackChannelId.trim() || null
  if (slackUserId !== undefined) patch.slack_user_id = slackUserId.trim() || null

  const { error } = await service
    .from('clients')
    .update(patch as any)
    .eq('id', session.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return { success: true }
}

