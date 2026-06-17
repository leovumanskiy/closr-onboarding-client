import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const supabase = createServiceClient()
  await (supabase as any)
    .from('clients')
    .update({
      has_ghl: false,
      ghl_access_token: null,
      ghl_location_id: null,
      ghl_refresh_token: null,
      ghl_token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  return NextResponse.json({ success: true })
}
