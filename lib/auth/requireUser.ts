import { redirect } from 'next/navigation'
import { getSession } from './session'
import { createClient } from '@/lib/supabase/server'

export async function requireUser() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/dashboard')
  return session
}

export async function getClient() {
  const session = await getSession()
  if (!session) return null

  // RLS-scoped: clients_select_own returns only the caller's own row.
  // Explicit allowlist of columns — keeps client-facing reads off the
  // admin-only `notes` column and the encrypted GHL token columns so a
  // future grant-tightening migration can revoke them without breaking
  // this call site.
  const supabase = await createClient()
  const { data } = await supabase
    .from('clients')
    .select(
      'id, user_id, email, role, full_name, business_name, business_website,' +
      'niche, has_ghl, has_fb_ads, status, current_module_id, start_date,' +
      'image_url, slack_channel_id, slack_user_id, must_change_password,' +
      'created_at, updated_at, ghl_location_id, ghl_token_expires_at'
    )
    .eq('id', session.id)
    .single()

  return data as any
}

export async function getProfile() {
  return getSession()
}
