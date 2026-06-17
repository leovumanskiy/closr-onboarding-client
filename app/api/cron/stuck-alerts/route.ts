import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createNotification } from '@/lib/notifications/create'
import { isAuthorizedCron } from '@/lib/auth/cron'

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date()

  const { data: stuckRaw } = await service
    .from('client_progress')
    .select(`
      client_id, step_id, started_at, due_at,
      steps!inner(title, sla_hours),
      clients!inner(id, business_name)
    `)
    .eq('status', 'in_progress')
    .not('due_at', 'is', null)
    .lt('due_at', new Date(now.getTime() - 6 * 3600000).toISOString())
  const stuck = (stuckRaw ?? []) as any[]

  if (!stuck.length) return NextResponse.json({ alerted: 0 })

  const { data: adminsRaw } = await service
    .from('clients')
    .select('id')
    .eq('role', 'admin')
  const admins = (adminsRaw ?? []) as any[]

  let alerted = 0

  for (const row of stuck) {
    const step = row.steps as any
    const client = row.clients as any
    if (!client || !step) continue

    const hoursStuck = Math.round(
      (now.getTime() - new Date(row.started_at ?? row.due_at).getTime()) / 3600000
    )

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: 'stuck_alert',
        title: `${client.business_name} needs help`,
        body: `Stuck on "${step.title}" for ~${hoursStuck}h.`,
        link: `/admin/clients`,
      })
    }

    alerted++
  }

  return NextResponse.json({ alerted })
}
