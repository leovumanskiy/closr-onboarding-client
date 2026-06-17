import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json()
  const allowed = ['has_ghl', 'has_fb_ads']
  const update: Record<string, boolean> = {}
  for (const key of allowed) {
    if (key in body) update[key] = Boolean(body[key])
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  const service = createServiceClient()
  await (service as any).from('clients').update(update).eq('id', session.id)

  return NextResponse.json({ success: true })
}
