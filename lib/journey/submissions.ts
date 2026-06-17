import { createClient } from '@/lib/supabase/server'

// `client_form_submissions` was dropped from the schema when in-app form
// submissions were replaced by Closr-embedded forms. Stub kept so callers
// don't crash; always returns null.
export async function getLatestFormSubmission(
  _clientId: string,
  _stepId: string
): Promise<Record<string, unknown> | null> {
  return null
}

export interface ExistingUpload {
  id: string
  file_name: string
  size: number
  mime: string
  file_path: string
}

// `client_uploads` was dropped when in-app upload was replaced by external
// Closr/Drive embeds. Stub returns empty array.
export async function getStepUploads(
  _clientId: string,
  _stepId: string
): Promise<ExistingUpload[]> {
  return []
}

export interface ExistingBooking {
  id: string
  scheduled_for: string | null
  call_type: string | null
  created_at: string
}

export async function getStepBooking(
  clientId: string,
  stepId: string
): Promise<ExistingBooking | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('client_bookings')
    .select('id, scheduled_for, call_type, created_at')
    .eq('client_id', clientId)
    .eq('step_id', stepId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return (data as any) ?? null
}
