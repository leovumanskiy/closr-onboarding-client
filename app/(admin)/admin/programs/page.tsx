import { requireAdmin } from '@/lib/auth/requireUser'
import { createServiceClient } from '@/lib/supabase/service'
import { ProgramsEditor } from '@/components/admin/programs/ProgramsEditor'

export default async function AdminProgramsPage() {
  await requireAdmin()
  const supabase = createServiceClient()

  const [{ data: programsRaw }, { data: linksRaw }, { data: clientsRaw }] = await Promise.all([
    supabase.from('programs').select('*').order('name'),
    supabase.from('module_programs').select('program_id'),
    supabase.from('clients').select('program_id').eq('role', 'client'),
  ])

  const links = (linksRaw ?? []) as any[]
  const clients = (clientsRaw ?? []) as any[]

  const programs = ((programsRaw ?? []) as any[]).map(p => ({
    ...p,
    moduleCount: links.filter(l => l.program_id === p.id).length,
    clientCount: clients.filter(c => c.program_id === p.id).length,
  }))

  const unassigned = clients.filter(c => !c.program_id).length

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Programs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Each client is assigned to one program and sees only that program&apos;s modules.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold tabular-nums">
            {programs.length}
            <span className="text-muted-foreground font-normal text-base"> programs</span>
          </p>
          <p className="text-xs text-muted-foreground">{clients.length} clients assigned</p>
        </div>
      </div>

      {unassigned > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
          <span className="font-medium text-amber-600 dark:text-amber-400">
            {unassigned} client{unassigned === 1 ? '' : 's'} not assigned to a program.
          </span>{' '}
          <span className="text-muted-foreground">
            They fall back to the default program until assigned.
          </span>
        </div>
      )}

      <ProgramsEditor initialPrograms={programs} />
    </div>
  )
}
