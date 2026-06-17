import { requireAdmin } from '@/lib/auth/requireUser'
import { createServiceClient } from '@/lib/supabase/service'
import { ModulesEditor } from '@/components/admin/modules/ModulesEditor'

export default async function AdminModulesPage() {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: modulesRaw } = await supabase
    .from('modules')
    .select('*, steps(*)')
    .order('order_index')
  const modules = (modulesRaw ?? []) as any[]

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Module Editor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create, edit, and reorder modules and steps. Drag to reorder.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold tabular-nums">
            {modules.length}
            <span className="text-muted-foreground font-normal text-base"> modules</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {modules.reduce((acc, m) => acc + (m.steps?.length ?? 0), 0)} total steps
          </p>
        </div>
      </div>

      <ModulesEditor initialModules={modules} />
    </div>
  )
}
