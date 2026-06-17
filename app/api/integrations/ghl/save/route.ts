import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { encryptSecret } from '@/lib/crypto/secrets'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json()
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const locationId = typeof body.locationId === 'string' ? body.locationId.trim() : ''

  if (!apiKey || !locationId) {
    return NextResponse.json({ error: 'API key and Location ID are required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  await (supabase as any)
    .from('clients')
    .update({
      has_ghl: true,
      ghl_access_token: encryptSecret(apiKey),
      ghl_location_id: locationId,
      ghl_refresh_token: null,
      ghl_token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  return NextResponse.json({ success: true })
}
