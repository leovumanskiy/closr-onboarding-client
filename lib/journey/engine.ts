import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { JourneyState, ModuleWithSteps, StepWithProgress } from './types'
import type { StepStatus } from '@/lib/supabase/types'

export async function getJourneyState(clientId: string): Promise<JourneyState> {
  // Reads run through the user-scoped client so RLS gates which client_progress
  // rows are visible (own row for clients, all rows for admins via is_admin()).
  const supabase = await createClient()

  const [modulesRes, progressRes] = await Promise.all([
    supabase
      .from('modules')
      .select('*, steps(*)')
      .order('order_index'),
    supabase
      .from('client_progress')
      .select('*')
      .eq('client_id', clientId),
  ])

  const rawModules = (modulesRes.data ?? []) as any[]
  const progressMap = new Map(
    ((progressRes.data ?? []) as any[]).map(p => [p.step_id, p])
  )

  // Repair missing client_progress rows for steps added after a client's journey was initialised.
  // If every sibling step in the module is completed, auto-complete the orphaned step so the
  // module doesn't incorrectly revert to locked. Otherwise insert it as locked so it unlocks
  // naturally when the client reaches it.
  // Skip entirely for brand-new clients (no progress rows yet) — initClientJourney handles those,
  // and racing it here would land every step as 'locked' before init can mark step 0 'available'.
  const missingRows: { client_id: string; step_id: string; status: StepStatus; completed_at: string | null }[] = []
  if (progressMap.size > 0) for (const m of rawModules) {
    const moduleSteps = (m.steps ?? []) as any[]
    const allIds: string[] = moduleSteps.map((s: any) => s.id)
    const missing = moduleSteps.filter((s: any) => !progressMap.has(s.id))
    if (!missing.length) continue

    const presentRows = allIds.filter(id => progressMap.has(id))
    const allPresentDone = presentRows.length > 0 && presentRows.every(id => progressMap.get(id)?.status === 'completed')

    for (const s of missing) {
      const now = new Date().toISOString()
      const status: StepStatus = allPresentDone ? 'completed' : 'locked'
      const row = { client_id: clientId, step_id: s.id, status, completed_at: allPresentDone ? now : null }
      missingRows.push(row)
      progressMap.set(s.id, row)
    }
  }
  if (missingRows.length) {
    // Repair writes use service-role: no INSERT policy on client_progress and
    // this is a server-controlled idempotent fix, not user input.
    const service = createServiceClient()
    await service.from('client_progress').upsert(missingRows as any, { onConflict: 'client_id,step_id', ignoreDuplicates: true })
  }

  let totalSteps = 0
  let completedSteps = 0

  const modules: ModuleWithSteps[] = rawModules.map(m => {
    const steps: StepWithProgress[] = ((m.steps ?? []) as any[])
      .sort((a, b) => a.order_index - b.order_index)
      .map(s => {
        const prog = progressMap.get(s.id) ?? null
        const status: StepStatus = prog?.status ?? 'locked'
        totalSteps++
        if (status === 'completed') completedSteps++
        return { ...s, progress: prog, status }
      })

    const allDone = steps.length > 0 && steps.every(s => s.status === 'completed')
    const anyActive = steps.some(s => s.status === 'in_progress' || s.status === 'available')
    const moduleProgress: ModuleWithSteps['progress'] = allDone
      ? 'completed'
      : anyActive ? 'in_progress' : 'locked'

    return {
      ...m,
      steps,
      progress: moduleProgress,
      completedCount: steps.filter(s => s.status === 'completed').length,
    }
  })

  const currentModule = modules.find(m =>
    m.steps.some(s => s.status === 'available' || s.status === 'in_progress')
  ) ?? null

  const currentStep = currentModule?.steps.find(
    s => s.status === 'in_progress' || s.status === 'available'
  ) ?? null

  return {
    modules,
    currentModule,
    currentStep,
    totalSteps,
    completedSteps,
    percentComplete: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
  }
}

export async function initClientJourney(clientId: string) {
  const service = createServiceClient()

  const { data: stepsRaw } = await service
    .from('steps')
    .select('id, order_index, sla_hours, module_id, modules!inner(order_index)')
    .order('order_index')
  const steps = (stepsRaw ?? []) as any[]

  if (!steps.length) return

  // Sort by module order_index then step order_index
  steps.sort((a, b) => {
    const modA = (a.modules as any)?.order_index ?? 0
    const modB = (b.modules as any)?.order_index ?? 0
    if (modA !== modB) return modA - modB
    return a.order_index - b.order_index
  })

  const progressRows = steps.map((s, i) => ({
    client_id: clientId,
    step_id: s.id,
    status: (i === 0 ? 'available' : 'locked') as StepStatus,
    due_at: i === 0 ? new Date(Date.now() + (s.sla_hours ?? 72) * 3600000).toISOString() : null,
  }))

  await service
    .from('client_progress')
    .upsert(progressRows as any, { onConflict: 'client_id,step_id' })

  const { data: firstModuleRaw } = await service
    .from('modules')
    .select('id')
    .order('order_index')
    .limit(1)
    .single()
  const firstModule = firstModuleRaw as any

  if (firstModule) {
    await service
      .from('clients')
      .update({ current_module_id: firstModule.id } as any)
      .eq('id', clientId)
  }
}
