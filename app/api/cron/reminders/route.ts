import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email/resend'
import { stepReminderEmail } from '@/lib/email/templates'
import { createNotification } from '@/lib/notifications/create'
import { isAuthorizedCron } from '@/lib/auth/cron'
import { n8nWebhookHeaders } from '@/lib/integrations/n8n'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 3600_000)

  // Fetch all in-progress/available steps with their module and client info
  const { data: progressRaw } = await service
    .from('client_progress')
    .select(`
      id, client_id, step_id, status, due_at, started_at,
      steps!inner(id, title, sla_hours, slug, order_index,
        modules!inner(id, title, slug, order_index)
      ),
      clients!inner(id, email, full_name, business_name, slack_channel_id, slack_user_id)
    `)
    .in('status', ['available', 'in_progress'])
    .not('due_at', 'is', null)
  const rows = (progressRaw ?? []) as any[]

  if (!rows.length) return NextResponse.json({ sent: 0 })

  // Group by (client_id, module_id)
  type ModuleGroup = {
    clientId: string
    moduleId: string
    moduleSlug: string
    moduleTitle: string
    client: any
    steps: any[]
    earliestDue: Date
    mostOverdueHours: number
    link: string
  }

  const groups = new Map<string, ModuleGroup>()

  for (const row of rows) {
    const step = row.steps as any
    const module_ = step.modules as any
    const client = row.clients as any
    if (!step || !module_ || !client) continue

    const key = `${row.client_id}::${module_.id}`
    if (!groups.has(key)) {
      groups.set(key, {
        clientId: row.client_id,
        moduleId: module_.id,
        moduleSlug: module_.slug,
        moduleTitle: module_.title,
        client,
        steps: [],
        earliestDue: new Date(row.due_at),
        mostOverdueHours: 0,
        link: `${APP_URL}/modules/${module_.slug}`,
      })
    }

    const g = groups.get(key)!
    g.steps.push(row)

    const due = new Date(row.due_at)
    if (due < g.earliestDue) g.earliestDue = due

    if (due < now) {
      const overdueHours = (now.getTime() - due.getTime()) / 3_600_000
      if (overdueHours > g.mostOverdueHours) g.mostOverdueHours = overdueHours
    }
  }

  // Fetch existing reminders for deduplication
  const { data: logRaw } = await service
    .from('reminder_log')
    .select('client_id, module_id, kind')
    .not('module_id', 'is', null)
  const sentSet = new Set<string>(
    ((logRaw ?? []) as any[]).map(r => `${r.client_id}::${r.module_id}::${r.kind}`)
  )

  let sent = 0

  for (const g of Array.from(groups.values())) {
    const { client, clientId, moduleId, moduleSlug, moduleTitle, link, steps, earliestDue, mostOverdueHours } = g
    const clientName = client.full_name ?? client.business_name

    const isOverdue = mostOverdueHours > 0
    const isApproaching = !isOverdue && earliestDue <= in24h

    // ── 24-hour approaching reminder ─────────────────────────────────────────
    if (isApproaching && !sentSet.has(`${clientId}::${moduleId}::module_approaching`)) {
      await sendModuleReminder({
        service, client, clientName, moduleTitle, link, moduleId,
        kind: 'module_approaching',
        subject: `Action needed: ${moduleTitle} is due in 24 hours`,
        urgency: 'approaching',
      })

      if (process.env.N8N_WEBHOOK_APPROACHING) {
        fetch(process.env.N8N_WEBHOOK_APPROACHING, {
          method: 'POST',
          headers: n8nWebhookHeaders(),
          body: JSON.stringify({
            event: 'approaching',
            client_id: clientId,
            client_name: client.business_name,
            slack_channel_id: client.slack_channel_id,
            slack_user_id: client.slack_user_id,
            module_slug: moduleSlug,
            module_title: moduleTitle,
            due_at: earliestDue.toISOString(),
            link,
          }),
        }).catch(e => console.error('[n8n] approaching hook failed', e))
      }

      sentSet.add(`${clientId}::${moduleId}::module_approaching`)
      sent++
    }

    // ── Overdue reminder ──────────────────────────────────────────────────────
    if (isOverdue && !sentSet.has(`${clientId}::${moduleId}::module_overdue`)) {
      await sendModuleReminder({
        service, client, clientName, moduleTitle, link, moduleId,
        kind: 'module_overdue',
        subject: `Action required: ${moduleTitle} is overdue`,
        urgency: 'overdue',
      })

      if (process.env.N8N_WEBHOOK_OVERDUE) {
        const mostOverdueStep = steps.reduce((acc: any, r: any) => {
          const due = new Date(r.due_at)
          if (!acc || due < new Date(acc.due_at)) return r
          return acc
        }, null as any)
        const stepNode = mostOverdueStep?.steps as any
        fetch(process.env.N8N_WEBHOOK_OVERDUE, {
          method: 'POST',
          headers: n8nWebhookHeaders(),
          body: JSON.stringify({
            event: 'overdue',
            client_id: clientId,
            client_name: client.business_name,
            slack_channel_id: client.slack_channel_id,
            slack_user_id: client.slack_user_id,
            step_slug: stepNode?.slug ?? null,
            step_title: stepNode?.title ?? null,
            module_slug: moduleSlug,
            module_title: moduleTitle,
            hours_overdue: Math.round(mostOverdueHours),
            due_at: mostOverdueStep?.due_at ?? earliestDue.toISOString(),
            link,
          }),
        }).catch(e => console.error('[n8n] overdue hook failed', e))
      }

      sentSet.add(`${clientId}::${moduleId}::module_overdue`)
      sent++
    }

  }

  return NextResponse.json({ sent })
}

async function sendModuleReminder({
  service, client, clientName, moduleTitle, link, moduleId, kind, subject, urgency,
}: {
  service: any
  client: any
  clientName: string
  moduleTitle: string
  link: string
  moduleId: string
  kind: string
  subject: string
  urgency: 'approaching' | 'overdue'
}) {
  // Email
  if (client.email) {
    await sendEmail({
      to: client.email,
      subject,
      html: stepReminderEmail({
        clientName,
        stepTitle: moduleTitle,
        moduleTitle,
        dueAt: new Date(),
        link,
      }),
    })
  }

  // In-app notification
  await createNotification({
    userId: client.id,
    type: 'reminder',
    title: urgency === 'overdue' ? `Overdue: ${moduleTitle}` : `Due soon: ${moduleTitle}`,
    body: urgency === 'overdue'
      ? `${moduleTitle} is overdue. Complete it to stay on track.`
      : `${moduleTitle} is due in less than 24 hours.`,
    link: link.replace(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000', ''),
  })

  // Log it
  await service.from('reminder_log').insert({
    client_id: client.id,
    module_id: moduleId,
    kind,
  } as any)
}
