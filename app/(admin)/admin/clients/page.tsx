import { requireAdmin } from '@/lib/auth/requireUser'
import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { AlertTriangle, Users } from 'lucide-react'
import { NewClientForm } from '@/components/admin/NewClientForm'

export default async function AdminClientsPage() {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: clientsRaw } = await supabase
    .from('clients')
    .select('id, business_name, full_name, email, status, created_at, program_id')
    .eq('role', 'client')
    .order('created_at', { ascending: false })
  const clients = (clientsRaw ?? []) as any[]

  const { data: programsRaw } = await supabase
    .from('programs')
    .select('id, name, is_default')
    .order('name')
  const programs = (programsRaw ?? []) as any[]
  const programById = new Map(programs.map(p => [p.id, p]))

  // Every aggregate below must be scoped to each client's program, or it counts
  // steps the client cannot see. That matters after a client is moved between
  // programs: their old program's client_progress rows are kept deliberately
  // (so shared-module completions survive a move back) but must not be counted.
  const [{ data: linksRaw }, { data: stepsRaw }, { data: allProgressRaw }] = await Promise.all([
    supabase.from('module_programs').select('module_id, program_id, order_index'),
    supabase.from('steps').select('id, module_id, title, slug, order_index'),
    supabase.from('client_progress').select('client_id, step_id, status, started_at, due_at'),
  ])

  const links = (linksRaw ?? []) as any[]
  const allSteps = (stepsRaw ?? []) as any[]
  const allProgress = (allProgressRaw ?? []) as any[]

  const stepById = new Map(allSteps.map(s => [s.id, s]))
  const defaultProgramId = programs.find(p => p.is_default)?.id ?? null

  // program_id -> (module_id -> position within that program)
  const moduleOrderByProgram = new Map<string, Map<string, number>>()
  for (const l of links) {
    if (!moduleOrderByProgram.has(l.program_id)) moduleOrderByProgram.set(l.program_id, new Map())
    moduleOrderByProgram.get(l.program_id)!.set(l.module_id, l.order_index)
  }

  const currentStepMap = new Map<string, any>()
  const overdueMap = new Map<string, number>()
  const progressByClient = new Map<string, { total: number; completed: number }>()
  const now = new Date()

  const clientProgramId = new Map<string, string | null>(
    clients.map(c => [c.id, c.program_id ?? defaultProgramId])
  )

  for (const p of allProgress) {
    const programId = clientProgramId.get(p.client_id)
    if (!programId) continue

    const step = stepById.get(p.step_id)
    if (!step) continue

    const moduleOrder = moduleOrderByProgram.get(programId)?.get(step.module_id)
    if (moduleOrder === undefined) continue // step's module isn't in this client's program

    const counts = progressByClient.get(p.client_id) ?? { total: 0, completed: 0 }
    counts.total++
    if (p.status === 'completed') counts.completed++
    progressByClient.set(p.client_id, counts)

    if (p.status !== 'available' && p.status !== 'in_progress') continue

    if (p.due_at && new Date(p.due_at) < now) {
      overdueMap.set(p.client_id, (overdueMap.get(p.client_id) ?? 0) + 1)
    }

    // Earliest reachable step, by the client's program order then step order —
    // the same ordering getJourneyState() uses to pick currentStep.
    const candidate = { ...p, step, moduleOrder }
    const existing = currentStepMap.get(p.client_id)
    if (
      !existing ||
      candidate.moduleOrder < existing.moduleOrder ||
      (candidate.moduleOrder === existing.moduleOrder && step.order_index < existing.step.order_index)
    ) {
      currentStepMap.set(p.client_id, candidate)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clients.length} client{clients.length !== 1 ? 's' : ''} enrolled
          </p>
        </div>
        <NewClientForm programs={programs} />
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border bg-card py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No clients yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create your first client to get started</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Company</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Program</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Progress</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Current Step</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Time in Step</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map(c => {
                const progress = currentStepMap.get(c.id)
                const step = progress?.step as any
                const overdue = overdueMap.get(c.id) ?? 0
                const isStuck = progress?.due_at && new Date(progress.due_at) < now
                const counts = progressByClient.get(c.id) ?? { total: 0, completed: 0 }
                const pct = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0

                return (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/clients/${c.id}`} className="block">
                        <p className="font-medium group-hover:text-primary transition-colors">{c.business_name}</p>
                        <p className="text-xs text-muted-foreground">{c.full_name ?? c.email}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      {(() => {
                        const prog = c.program_id ? programById.get(c.program_id) : null
                        if (prog) {
                          return (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{prog.name}</span>
                          )
                        }
                        return (
                          <span
                            className="text-xs text-amber-600 dark:text-amber-400"
                            title="No program assigned — falls back to the default program"
                          >
                            unassigned
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {step ? (
                        <div className="flex items-center gap-1.5">
                          {isStuck && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                          <span className={cn(
                            'text-xs bg-muted px-2 py-0.5 rounded-full',
                            isStuck && 'text-destructive'
                          )}>
                            {step.title}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {progress?.started_at
                        ? formatDistanceToNow(new Date(progress.started_at), { addSuffix: false })
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium border',
                          c.status === 'active' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                          c.status === 'paused' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                          c.status === 'completed' && 'bg-primary/10 text-primary border-primary/20',
                          c.status === 'churned' && 'bg-destructive/10 text-destructive border-destructive/20',
                        )}>
                          {c.status}
                        </span>
                        {overdue > 0 && (
                          <span className="text-xs text-destructive font-medium">{overdue} overdue</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
