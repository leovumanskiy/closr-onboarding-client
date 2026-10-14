'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/auth/requireUser'
import { createNotification } from '@/lib/notifications/create'
import { n8nWebhookHeaders } from '@/lib/integrations/n8n'
import { resolveProgramId } from '@/lib/journey/engine'

export async function markStepComplete(stepId: string) {
  const session = await requireUser()
  const service = createServiceClient()

  // These three lookups don't depend on each other, so run them together rather than
  // one after another: each is a round trip to the database.
  const [{ data: clientRaw }, { data: stepRaw }, { data: progressRaw }] = await Promise.all([
    service
      .from('clients')
      .select('id, business_name, slack_channel_id, slack_user_id, program_id')
      .eq('id', session.id)
      .single(),
    service
      .from('steps')
      .select('id, title, slug, sla_hours, module_id, modules(id, title, slug, order_index)')
      .eq('id', stepId)
      .single(),
    service
      .from('client_progress')
      .select('id, status')
      .eq('client_id', session.id)
      .eq('step_id', stepId)
      .single(),
  ])
  const client = clientRaw as any
  if (!client) return { error: 'Client not found' }
  const step = stepRaw as any
  if (!step) return { error: 'Step not found' }
  const progress = progressRaw as any

  if (!progress) return { error: 'Progress record not found' }
  if (progress.status === 'locked') return { error: 'Step is locked' }
  if (progress.status === 'completed') return { error: 'Already completed' }

  const now = new Date().toISOString()

  // The module's step list doesn't depend on the save, so fetch it alongside.
  const [, { data: siblingSteps }] = await Promise.all([
    (async () => {
      await service
        .from('client_progress')
        .update({ status: 'completed', completed_at: now } as any)
        .eq('client_id', client.id)
        .eq('step_id', stepId)

      await service.rpc('unlock_next_steps', { p_client_id: client.id } as any)
    })(),
    service
      .from('steps')
      .select('id')
      .eq('module_id', step.module_id),
  ])

  const mod = step.modules as any

  // Per-step n8n webhooks. Keyed by step slug; webhook URL pulled from env so
  // each is independently togglable and unset slugs silently skip.
  const STEP_WEBHOOK_ENV: Record<string, string> = {
    'atp-form-submission': 'N8N_WEBHOOK_STEP_A2P_FORM',
    'copy-intake-form': 'N8N_WEBHOOK_STEP_COPY_INTAKE',
    'submit-setup-assets': 'N8N_WEBHOOK_STEP_SETUP_ASSETS',
    'asset-upload': 'N8N_WEBHOOK_STEP_ASSET_UPLOAD',
    'ghl-facebook-access': 'N8N_WEBHOOK_STEP_GHL_FB_ACCESS',
  }
  const stepWebhookUrl = process.env[STEP_WEBHOOK_ENV[step.slug] ?? '']
  if (stepWebhookUrl) {
    fetch(stepWebhookUrl, {
      method: 'POST',
      headers: n8nWebhookHeaders(),
      body: JSON.stringify({
        event: 'step_completed',
        client_id: client.id,
        client_name: client.business_name,
        slack_channel_id: client.slack_channel_id,
        slack_user_id: client.slack_user_id,
        step_slug: step.slug,
        step_title: step.title,
        module_slug: mod?.slug,
        module_title: mod?.title,
        link: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/modules/${mod?.slug}`,
      }),
    }).catch(e => console.error('[n8n] step-complete hook failed', e))
  }

  // Check if the entire module is now complete
  const siblingIds = (siblingSteps ?? []).map((s: any) => s.id)

  const { data: completedRows } = await service
    .from('client_progress')
    .select('step_id')
    .eq('client_id', client.id)
    .in('step_id', siblingIds)
    .eq('status', 'completed')
  const completedSet = new Set((completedRows ?? []).map((r: any) => r.step_id))
  const moduleComplete = siblingIds.every((id: string) => completedSet.has(id))

  let nextModuleSlug: string | null = null
  let nextModuleTitle: string | null = null
  let moduleOrder: number | null = null
  if (moduleComplete) {
    // "Next module" is the next one in THIS client's program, not the next by
    // global order_index — those diverge as soon as a second program exists.
    const programId = client.program_id ?? (await resolveProgramId(client.id, service as any))

    const { data: currentLinkRaw } = await service
      .from('module_programs')
      .select('order_index')
      .eq('program_id', programId)
      .eq('module_id', step.module_id)
      .maybeSingle()
    moduleOrder = (currentLinkRaw as any)?.order_index ?? null

    const { data: nextLinkRaw } = await service
      .from('module_programs')
      .select('order_index, modules!inner(id, slug, title)')
      .eq('program_id', programId)
      .gt('order_index', moduleOrder ?? 0)
      .order('order_index')
      .limit(1)
      .maybeSingle()
    const nextMod = (nextLinkRaw as any)?.modules ?? null
    nextModuleSlug = nextMod?.slug ?? null
    nextModuleTitle = nextMod?.title ?? null

    await Promise.all([
      nextMod?.id
        ? service
            .from('clients')
            .update({ current_module_id: nextMod.id } as any)
            .eq('id', client.id)
        : null,
      createNotification({
        userId: session.id,
        type: 'module_unlocked',
        title: `Module complete: ${mod?.title}`,
        body: nextModuleSlug
          ? `You've unlocked the next module.`
          : `You've completed the entire onboarding journey! 🎉`,
        link: nextModuleSlug ? `/modules/${nextModuleSlug}` : '/dashboard',
      }),
    ])

    if (process.env.N8N_WEBHOOK_MODULE_COMPLETE) {
      fetch(process.env.N8N_WEBHOOK_MODULE_COMPLETE, {
        method: 'POST',
        headers: n8nWebhookHeaders(),
        body: JSON.stringify({
          event: 'module_completed',
          client_id: client.id,
          client_name: client.business_name,
          slack_channel_id: client.slack_channel_id,
          slack_user_id: client.slack_user_id,
          module_slug: mod?.slug,
          module_title: mod?.title,
          module_order: moduleOrder ?? mod?.order_index,
          next_module_title: nextModuleTitle,
        }),
      }).catch(e => console.error('[n8n] module-complete hook failed', e))
    }
  } else {
    await createNotification({
      userId: session.id,
      type: 'step_completed',
      title: 'Step completed!',
      body: `You completed "${step.title}".`,
      link: '/dashboard',
    })
  }

  revalidatePath('/dashboard')
  revalidatePath(`/modules/${mod?.slug}`)
  if (nextModuleSlug) revalidatePath(`/modules/${nextModuleSlug}`)

  return { success: true, moduleComplete, nextModuleSlug }
}

export async function startStep(stepId: string) {
  const session = await requireUser()
  const service = createServiceClient()

  const { data: stepRaw } = await service
    .from('steps')
    .select('sla_hours')
    .eq('id', stepId)
    .single()
  const step = stepRaw as any

  const { data: progressRaw } = await service
    .from('client_progress')
    .select('status')
    .eq('client_id', session.id)
    .eq('step_id', stepId)
    .single()
  const progress = progressRaw as any

  if (progress?.status === 'available') {
    const dueAt = step?.sla_hours
      ? new Date(Date.now() + step.sla_hours * 3600000).toISOString()
      : null

    await service
      .from('client_progress')
      .update({ status: 'in_progress', started_at: new Date().toISOString(), due_at: dueAt } as any)
      .eq('client_id', session.id)
      .eq('step_id', stepId)

    // No revalidatePath here: startStep is awaited during the step page's
    // Server Component render (auto-start on first open), and calling
    // revalidatePath during render throws in Next 16. /dashboard is a
    // dynamic route (never cached), so it re-renders fresh on next visit.
  }

  return { success: true }
}
