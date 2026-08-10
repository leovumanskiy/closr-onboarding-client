import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { JourneyState, ModuleWithSteps, StepWithProgress } from './types'
import type { StepStatus } from '@/lib/supabase/types'

/**
 * The program whose module list governs a client's journey.
 *
 * Falls back to the default program when the client has no program_id, so a row
 * that predates the backfill (or was created by an older build) still renders the
 * legacy journey instead of an empty portal. Mirrors the same coalesce in the
 * unlock_next_steps() SQL function and in the modules RLS policy.
 */
export async function resolveProgramId(
  clientId: string,
  db?: { from: (t: string) => any }
): Promise<string | null> {
  const supabase = db ?? (await createClient())

  const { data: client } = await supabase
    .from('clients')
    .select('program_id')
    .eq('id', clientId)
    .single()

  const programId = (client as any)?.program_id as string | null | undefined
  if (programId) return programId

  const { data: fallback } = await supabase
    .from('programs')
    .select('id')
    .eq('is_default', true)
    .limit(1)
    .maybeSingle()

  return ((fallback as any)?.id as string | undefined) ?? null
}

export async function getJourneyState(clientId: string): Promise<JourneyState> {
  // Reads run through the user-scoped client so RLS gates which client_progress
  // rows are visible (own row for clients, all rows for admins via is_admin()).
  const supabase = await createClient()

  const programId = await resolveProgramId(clientId, supabase as any)

  // No program at all (programs table empty / not yet migrated) — render nothing
  // rather than falling back to every module, which would leak other cohorts'
  // content to whoever is looking.
  if (!programId) {
    return {
      modules: [],
      currentModule: null,
      currentStep: null,
      totalSteps: 0,
      completedSteps: 0,
      percentComplete: 0,
    }
  }

  const [modulesRes, progressRes] = await Promise.all([
    supabase
      .from('modules')
      .select('*, steps(*), module_programs!inner(program_id, order_index)')
      .eq('module_programs.program_id', programId),
    supabase
      .from('client_progress')
      .select('*')
      .eq('client_id', clientId),
  ])

  // Ordering is per-program and lives on the join row, so it is applied here
  // rather than via .order() — embedded-column ordering is not reliable across
  // PostgREST versions. The step sort below already works the same way.
  const rawModules = ((modulesRes.data ?? []) as any[])
    .map(m => ({ ...m, programOrderIndex: m.module_programs?.[0]?.order_index ?? m.order_index }))
    .sort((a, b) => a.programOrderIndex - b.programOrderIndex)
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

    // A step with zero sibling rows (brand-new module, none of its steps seen before)
    // always lands here as 'locked', even for a client who already finished every
    // earlier module. Nothing else re-evaluates that client afterwards, so ask the DB's
    // next-module unlock rule to fix it up now instead of leaving them stuck.
    await service.rpc('unlock_next_steps', { p_client_id: clientId } as any)
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

  const programId = await resolveProgramId(clientId, service as any)
  if (!programId) return

  // The program's module list, in the program's own order.
  const { data: linksRaw } = await service
    .from('module_programs')
    .select('module_id, order_index')
    .eq('program_id', programId)
    .order('order_index')
  const links = (linksRaw ?? []) as any[]

  if (!links.length) return

  const moduleOrder = new Map<string, number>(links.map(l => [l.module_id, l.order_index]))

  const { data: stepsRaw } = await service
    .from('steps')
    .select('id, order_index, sla_hours, module_id')
    .in('module_id', links.map(l => l.module_id))
  const steps = (stepsRaw ?? []) as any[]

  if (!steps.length) return

  // Sort by the program's module order, then step order_index.
  steps.sort((a, b) => {
    const modA = moduleOrder.get(a.module_id) ?? 0
    const modB = moduleOrder.get(b.module_id) ?? 0
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

  await service
    .from('clients')
    .update({ current_module_id: links[0].module_id } as any)
    .eq('id', clientId)
}

/**
 * Re-seed a client's progress after their program assignment changes.
 *
 * Existing client_progress rows are deliberately kept: they're per-step, so steps
 * outside the new program simply stop being read. That makes a switch reversible
 * and lets completions on modules shared between the two programs survive.
 *
 * Adds locked rows for any step in the new program the client has never seen,
 * makes sure at least one step is actually reachable, then lets the DB's unlock
 * rule settle the rest.
 */
export async function reseedClientProgram(clientId: string) {
  const service = createServiceClient()

  const programId = await resolveProgramId(clientId, service as any)
  if (!programId) return

  const { data: linksRaw } = await service
    .from('module_programs')
    .select('module_id, order_index')
    .eq('program_id', programId)
    .order('order_index')
  const links = (linksRaw ?? []) as any[]
  if (!links.length) return

  const moduleOrder = new Map<string, number>(links.map(l => [l.module_id, l.order_index]))

  const { data: stepsRaw } = await service
    .from('steps')
    .select('id, order_index, sla_hours, module_id')
    .in('module_id', links.map(l => l.module_id))
  const steps = ((stepsRaw ?? []) as any[]).sort((a, b) => {
    const modA = moduleOrder.get(a.module_id) ?? 0
    const modB = moduleOrder.get(b.module_id) ?? 0
    if (modA !== modB) return modA - modB
    return a.order_index - b.order_index
  })
  if (!steps.length) return

  const { data: existingRaw } = await service
    .from('client_progress')
    .select('step_id, status')
    .eq('client_id', clientId)
  const existing = new Map<string, string>(
    ((existingRaw ?? []) as any[]).map(p => [p.step_id, p.status])
  )

  const missing = steps
    .filter(s => !existing.has(s.id))
    .map(s => ({ client_id: clientId, step_id: s.id, status: 'locked' as StepStatus }))

  if (missing.length) {
    await service
      .from('client_progress')
      .upsert(missing as any, { onConflict: 'client_id,step_id', ignoreDuplicates: true })
    for (const m of missing) existing.set(m.step_id, 'locked')
  }

  // Nothing reachable in the new program (e.g. every step is a freshly-locked
  // row) — open the first one so the client isn't stranded.
  const hasEntryPoint = steps.some(s => {
    const st = existing.get(s.id)
    return st === 'available' || st === 'in_progress' || st === 'completed'
  })

  if (!hasEntryPoint) {
    const first = steps[0]
    await service
      .from('client_progress')
      .update({
        status: 'available',
        due_at: new Date(Date.now() + (first.sla_hours ?? 72) * 3600000).toISOString(),
      } as any)
      .eq('client_id', clientId)
      .eq('step_id', first.id)
  }

  await service
    .from('clients')
    .update({ current_module_id: links[0].module_id } as any)
    .eq('id', clientId)

  await service.rpc('unlock_next_steps', { p_client_id: clientId } as any)
}
