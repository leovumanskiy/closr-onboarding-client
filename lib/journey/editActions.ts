'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/auth/requireUser'

export async function resubmitForm({
  stepId,
  payload,
  moduleSlug,
  stepSlug,
}: {
  stepId: string
  payload: Record<string, unknown>
  moduleSlug: string
  stepSlug: string
}) {
  const session = await requireUser()
  const service = createServiceClient()

  // Safety: only allow edits on completed steps
  const { data: progressRaw } = await service
    .from('client_progress')
    .select('status')
    .eq('client_id', session.id)
    .eq('step_id', stepId)
    .single()
  const progress = progressRaw as any

  if (!progress) return { error: 'Progress record not found' }
  if (progress.status !== 'completed') return { error: 'Step is not completed' }

  const { error } = await service
    .from('client_form_submissions')
    .insert({ client_id: session.id, step_id: stepId, payload } as any)

  if (error) return { error: error.message }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'client_edited_step',
    subject_table: 'client_form_submissions',
    subject_id: stepId,
    meta: { kind: 'form_resubmit' },
  } as any)

  revalidatePath(`/modules/${moduleSlug}/${stepSlug}`)
  revalidatePath(`/modules/${moduleSlug}`)

  return { success: true }
}

