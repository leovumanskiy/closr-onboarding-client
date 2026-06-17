import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { stepId, scheduledFor, callType } = await request.json()

  if (typeof stepId !== 'string' || !stepId) {
    return NextResponse.json({ error: 'stepId required' }, { status: 400 })
  }

  const service = createServiceClient()

  // Confirm this step is on the caller's journey AND is a booking step.
  // Without this, any logged-in user could write bookings against arbitrary
  // step IDs (BOLA/IDOR).
  const { data: progress } = await service
    .from('client_progress')
    .select('step_id, steps:step_id(type)')
    .eq('client_id', session.id)
    .eq('step_id', stepId)
    .single()

  if (!progress) {
    return NextResponse.json({ error: 'Step not found on your journey' }, { status: 404 })
  }

  const stepType = (progress as any)?.steps?.type
  if (stepType !== 'booking') {
    return NextResponse.json({ error: 'Step is not bookable' }, { status: 400 })
  }

  await service.from('client_bookings').insert({
    client_id: session.id,
    step_id: stepId,
    scheduled_for: scheduledFor ?? null,
    provider: 'manual',
    notes: callType,
  } as any)

  return NextResponse.json({ success: true })
}
