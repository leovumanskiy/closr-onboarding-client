'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/auth/requireUser'

interface SubmitFormArgs {
  stepId: string
  payload: Record<string, unknown>
}

export async function submitForm({ stepId, payload }: SubmitFormArgs) {
  const session = await requireUser()
  const service = createServiceClient()

  const { error } = await service
    .from('client_form_submissions')
    .insert({ client_id: session.id, step_id: stepId, payload } as any)

  if (error) return { error: error.message }
  return { success: true }
}
