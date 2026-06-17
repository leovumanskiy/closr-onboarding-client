import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const report_date = typeof body.report_date === 'string' ? body.report_date.trim() : ''
  const calls_booked = Number(body.calls_booked)
  const calls_showed = Number(body.calls_showed)
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

  if (!/^\d{4}-\d{2}-\d{2}$/.test(report_date)) {
    return NextResponse.json({ error: 'report_date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (!Number.isFinite(calls_booked) || calls_booked < 0 || !Number.isInteger(calls_booked)) {
    return NextResponse.json({ error: 'calls_booked must be a non-negative integer' }, { status: 400 })
  }
  if (!Number.isFinite(calls_showed) || calls_showed < 0 || !Number.isInteger(calls_showed)) {
    return NextResponse.json({ error: 'calls_showed must be a non-negative integer' }, { status: 400 })
  }
  if (calls_showed > calls_booked) {
    return NextResponse.json({ error: 'calls_showed cannot exceed calls_booked' }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)
  if (report_date > today) {
    return NextResponse.json({ error: 'report_date cannot be in the future' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await (supabase as any)
    .from('client_eod_reports')
    .upsert(
      {
        client_id: session.id,
        report_date,
        calls_booked,
        calls_showed,
        notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,report_date' }
    )
    .select()
    .single()

  if (error) {
    console.error('[eod/submit] insert failed', error)
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, report: data })
}
