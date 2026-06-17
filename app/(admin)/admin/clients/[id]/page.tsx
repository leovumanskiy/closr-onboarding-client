import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/requireUser'
import { createServiceClient } from '@/lib/supabase/service'
import { getJourneyState } from '@/lib/journey/engine'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { ChevronLeft, CheckCircle2, Clock, Lock, AlertTriangle, User, Building2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { AdminOverrideButton } from '@/components/admin/AdminOverrideButton'
import { ClientEditPanel } from '@/components/admin/ClientEditPanel'
import { DeleteClientButton } from '@/components/admin/DeleteClientButton'
import { ResetClientButton } from '@/components/admin/ResetClientButton'
import { SubmissionView } from '@/components/admin/SubmissionView'
import { AdminGhlDashboard } from '@/components/admin/AdminGhlDashboard'
import { AdminEodSection } from '@/components/admin/AdminEodSection'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminClientDetailPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params
  const supabase = createServiceClient()

  const { data: clientRaw } = await supabase
    .from('clients')
    .select('id, business_name, full_name, email, business_website, niche, start_date, status, created_at, notes, image_url, slack_channel_id, slack_user_id')
    .eq('id', id)
    .single()
  const client = clientRaw as any

  if (!client) notFound()

  const avatarUrl: string | null = client.image_url ?? null

  const journey = await getJourneyState(id)

  const { data: submissionsRaw } = await supabase
    .from('client_form_submissions')
    .select('*, steps(title, config)')
    .eq('client_id', id)
    .order('submitted_at', { ascending: false })
  const submissions = (submissionsRaw ?? []) as any[]

  const { data: auditLogRaw } = await supabase
    .from('audit_log')
    .select('*')
    .eq('subject_id', id)
    .order('created_at', { ascending: false })
    .limit(20)
  const auditLog = (auditLogRaw ?? []) as any[]

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">

      {/* Back + header */}
      <div>
        <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
          <ChevronLeft className="h-4 w-4" /> All Clients
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
              {avatarUrl
                ? <Image src={avatarUrl} alt={client.business_name} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                : <Building2 className="h-6 w-6 text-primary" />
              }
            </div>
            <div>
              <h1 className="text-2xl font-bold">{client.business_name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {client.full_name && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {client.full_name}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{client.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full font-medium border',
              client.status === 'active' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              client.status === 'paused' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              client.status === 'completed' && 'bg-primary/10 text-primary border-primary/20',
              client.status === 'churned' && 'bg-destructive/10 text-destructive border-destructive/20',
            )}>
              {client.status}
            </span>
            <ResetClientButton clientId={id} businessName={client.business_name} />
            <DeleteClientButton clientId={id} businessName={client.business_name} />
          </div>
        </div>
      </div>

      {/* GHL performance dashboard */}
      <AdminGhlDashboard clientId={id} />

      {/* End of Day reports */}
      <AdminEodSection clientId={id} />

      {/* Progress overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Overall</p>
          <p className="text-2xl font-bold tabular-nums">{journey.percentComplete}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${journey.percentComplete}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Steps done</p>
          <p className="text-2xl font-bold tabular-nums">
            {journey.completedSteps}
            <span className="text-base font-normal text-muted-foreground">/{journey.totalSteps}</span>
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Joined</p>
          <p className="text-sm font-semibold">{format(new Date(client.created_at), 'dd MMM yyyy')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}</p>
        </div>
      </div>

      {/* Edit panel */}
      <section>
        <h2 className="text-base font-semibold mb-4">Edit Client</h2>
        <ClientEditPanel
          clientId={id}
          initial={{
            businessName: client.business_name ?? '',
            fullName: client.full_name ?? '',
            email: client.email ?? '',
            businessWebsite: client.business_website ?? '',
            niche: client.niche ?? '',
            startDate: client.start_date ?? '',
            status: client.status ?? 'active',
            slackChannelId: client.slack_channel_id ?? '',
            slackUserId: client.slack_user_id ?? '',
          }}
        />
      </section>

      {/* Journey timeline */}
      <section>
        <h2 className="text-base font-semibold mb-4">Journey Progress</h2>
        <div className="space-y-4">
          {journey.modules.map(mod => {
            const pct = mod.steps.length > 0 ? Math.round((mod.completedCount / mod.steps.length) * 100) : 0
            const isLocked = mod.progress === 'locked'
            const isDone = mod.progress === 'completed'

            return (
              <div key={mod.id} className={cn('rounded-xl border bg-card overflow-hidden', isLocked && 'opacity-50')}>
                <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-6 w-6 rounded-md flex items-center justify-center shrink-0',
                      isDone ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-primary/10 border border-primary/20'
                    )}>
                      <span className={cn('text-[10px] font-bold', isDone ? 'text-emerald-400' : 'text-primary')}>
                        {mod.order_index}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{mod.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-28">
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full rounded-full', isDone ? 'bg-emerald-400' : 'bg-primary')} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{mod.completedCount}/{mod.steps.length}</span>
                    </div>
                  </div>
                </div>

                <div className="divide-y">
                  {mod.steps.map(step => (
                    <div key={step.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="shrink-0">
                        {step.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : step.status === 'locked' ? (
                          <Lock className="h-4 w-4 text-muted-foreground/30" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className={cn('text-sm', step.status === 'locked' && 'text-muted-foreground/50')}>
                          {step.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {step.progress?.completed_at && (
                            <span className="text-xs text-muted-foreground">
                              Completed {format(new Date(step.progress.completed_at), 'dd MMM, HH:mm')}
                            </span>
                          )}
                          {step.progress?.due_at && step.status !== 'completed' && (
                            <span className={cn(
                              'text-xs flex items-center gap-1',
                              new Date(step.progress.due_at) < new Date() ? 'text-destructive' : 'text-muted-foreground'
                            )}>
                              {new Date(step.progress.due_at) < new Date() && <AlertTriangle className="h-3 w-3" />}
                              Due {formatDistanceToNow(new Date(step.progress.due_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>

                      {step.status !== 'completed' && step.status !== 'locked' && (
                        <AdminOverrideButton stepId={step.id} clientId={id} stepTitle={step.title} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Form submissions */}
      {submissions.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Form Submissions</h2>
          <div className="space-y-3">
            {submissions.map(s => (
              <SubmissionView key={s.id} submission={s} />
            ))}
          </div>
        </section>
      )}

      {/* Audit log */}
      {auditLog.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Audit Log</h2>
          <div className="rounded-xl border bg-card overflow-hidden divide-y">
            {auditLog.map(entry => (
              <div key={entry.id} className="px-5 py-2.5 flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">{entry.action}</span>
                <span className="text-xs text-muted-foreground/60">
                  {format(new Date(entry.created_at), 'dd MMM HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
