'use server'

import { requireAdmin } from '@/lib/auth/requireUser'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { initClientJourney } from '@/lib/journey/engine'
import type { StepStatus } from '@/lib/supabase/types'

export async function createClientUser({
  email,
  password,
  businessName,
  fullName,
  slackChannelId,
  slackUserId,
}: {
  email: string
  password: string
  businessName: string
  fullName?: string
  slackChannelId?: string
  slackUserId?: string
}) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const normEmail = email.toLowerCase().trim()

  // Create the Supabase Auth user first. If the clients insert fails we'll
  // roll it back, so no auth.users orphans are left behind.
  const { data: authData, error: authErr } = await service.auth.admin.createUser({
    email: normEmail,
    password,
    email_confirm: true,
  })
  if (authErr || !authData?.user) {
    return { error: authErr?.message ?? 'Failed to create auth user.' }
  }

  const { data: newClient, error } = await service.from('clients').insert({
    email: normEmail,
    user_id: authData.user.id,
    business_name: businessName,
    full_name: fullName ?? null,
    role: 'client',
    must_change_password: true,
    slack_channel_id: slackChannelId ?? null,
    slack_user_id: slackUserId ?? null,
  } as any).select('id').single()

  if (error) {
    await service.auth.admin.deleteUser(authData.user.id)
    return { error: error.message }
  }

  const clientId = (newClient as any).id

  await initClientJourney(clientId)
  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_create_client',
    subject_table: 'clients',
    subject_id: clientId,
    meta: { email, business_name: businessName },
  } as any)

  revalidatePath('/admin/clients')
  return { success: true, clientId }
}

export async function updateStepConfig({
  stepId,
  config,
}: {
  stepId: string
  config: Record<string, unknown>
}) {
  await requireAdmin()
  const service = createServiceClient()

  const { error } = await service
    .from('steps')
    .update({ config, updated_at: new Date().toISOString() } as any)
    .eq('id', stepId)

  if (error) return { error: error.message }

  revalidatePath('/admin/content')
  return { success: true }
}

export async function updateClientDetails({
  clientId,
  businessName,
  fullName,
  email,
  businessWebsite,
  niche,
  startDate,
  status,
  slackChannelId,
  slackUserId,
}: {
  clientId: string
  businessName: string
  fullName: string
  email: string
  businessWebsite?: string
  niche?: string
  startDate?: string
  status: string
  slackChannelId?: string
  slackUserId?: string
}) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const normEmail = email.trim().toLowerCase()

  // If the email changes, mirror it onto auth.users so signInWithPassword
  // keeps working against the new address.
  const { data: existing } = await service
    .from('clients')
    .select('email, user_id')
    .eq('id', clientId)
    .single()

  if (existing && (existing as any).user_id && (existing as any).email !== normEmail) {
    const { error: authErr } = await service.auth.admin.updateUserById(
      (existing as any).user_id,
      { email: normEmail, email_confirm: true } as any,
    )
    if (authErr) return { error: `Auth email sync failed: ${authErr.message}` }
  }

  const { error } = await service
    .from('clients')
    .update({
      business_name: businessName.trim(),
      full_name: fullName.trim() || null,
      email: normEmail,
      business_website: businessWebsite?.trim() || null,
      niche: niche?.trim() || null,
      start_date: startDate || null,
      status,
      slack_channel_id: slackChannelId?.trim() || null,
      slack_user_id: slackUserId?.trim() || null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', clientId)

  if (error) return { error: error.message }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_update_client',
    subject_table: 'clients',
    subject_id: clientId,
    meta: { business_name: businessName, email },
  } as any)

  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin/clients')
  return { success: true }
}

export async function deleteClient({ clientId }: { clientId: string }) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const { data: target } = await service
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single()

  const { error } = await service.from('clients').delete().eq('id', clientId)
  if (error) return { error: error.message }

  const userId = (target as any)?.user_id
  if (userId) {
    // Auth user goes after the clients row so referential cleanup is in the
    // right order. Failure here is logged but doesn't block the delete.
    const { error: authErr } = await service.auth.admin.deleteUser(userId)
    if (authErr) console.warn('[deleteClient] failed to delete auth user', userId, authErr.message)
  }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_delete_client',
    subject_table: 'clients',
    subject_id: clientId,
    meta: {},
  } as any)

  revalidatePath('/admin/clients')
  return { success: true }
}

export async function resetClient({ clientId }: { clientId: string }) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const { data: existing } = await service
    .from('clients')
    .select('id, email')
    .eq('id', clientId)
    .single()

  if (!existing) return { error: 'Client not found.' }

  // Wipe existing progress and re-init from step 0. initClientJourney upserts
  // all step rows, so a plain delete first ensures any steps that have since
  // been removed don't linger as orphan rows.
  const { error: delError } = await service
    .from('client_progress')
    .delete()
    .eq('client_id', clientId)
  if (delError) return { error: delError.message }

  // Clear module-level reminder log so SLA reminders re-arm from scratch.
  await service.from('reminder_log').delete().eq('client_id', clientId)

  await initClientJourney(clientId)

  // If the client was marked 'completed', flip them back to 'active' so the
  // UI doesn't keep showing the completed badge after a reset.
  await service
    .from('clients')
    .update({ status: 'active', updated_at: new Date().toISOString() } as any)
    .eq('id', clientId)
    .eq('status', 'completed')

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_reset_user',
    subject_table: 'clients',
    subject_id: clientId,
    meta: { email: (existing as any).email, reset: 'journey_progress' },
  } as any)

  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin/clients')
  return { success: true }
}

export async function updateClientPassword({
  clientId,
  newPassword,
}: {
  clientId: string
  newPassword: string
}) {
  const session = await requireAdmin()

  if (newPassword.length < 8) return { error: 'Password must be at least 8 characters.' }

  const service = createServiceClient()

  const { data: target } = await service
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single()

  const userId = (target as any)?.user_id
  if (!userId) return { error: 'Client is missing an auth.users link.' }

  const { error: authErr } = await service.auth.admin.updateUserById(userId, {
    password: newPassword,
  })
  if (authErr) return { error: authErr.message }

  const { error } = await service
    .from('clients')
    .update({ must_change_password: true, updated_at: new Date().toISOString() } as any)
    .eq('id', clientId)

  if (error) return { error: error.message }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_reset_password',
    subject_table: 'clients',
    subject_id: clientId,
    meta: {},
  } as any)

  revalidatePath(`/admin/clients/${clientId}`)
  return { success: true }
}

// ── Module CRUD ────────────────────────────────────────────────────

export async function createModule({
  title,
  description,
  slug,
}: {
  title: string
  description: string
  slug: string
}) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const { data: existing } = await service.from('modules').select('order_index').order('order_index', { ascending: false }).limit(1).single()
  const nextIndex = ((existing as any)?.order_index ?? 0) + 1

  const { data, error } = await service.from('modules').insert({
    title: title.trim(),
    description: description.trim() || null,
    slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
    order_index: nextIndex,
    unlock_rule: 'previous_module_complete',
  } as any).select('id').single()

  if (error) return { error: error.message }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_create_module',
    subject_table: 'modules',
    subject_id: (data as any).id,
    meta: { title },
  } as any)

  revalidatePath('/admin/modules')
  return { success: true, id: (data as any).id }
}

export async function updateModule({
  id,
  title,
  description,
  slug,
  unlock_rule,
}: {
  id: string
  title: string
  description: string
  slug: string
  unlock_rule: string
}) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const { error } = await service.from('modules').update({
    title: title.trim(),
    description: description.trim() || null,
    slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
    unlock_rule,
    updated_at: new Date().toISOString(),
  } as any).eq('id', id)

  if (error) return { error: error.message }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_update_module',
    subject_table: 'modules',
    subject_id: id,
    meta: { title },
  } as any)

  revalidatePath('/admin/modules')
  return { success: true }
}

export async function deleteModule({ id }: { id: string }) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const { error } = await service.from('modules').delete().eq('id', id)
  if (error) return { error: error.message }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_delete_module',
    subject_table: 'modules',
    subject_id: id,
    meta: {},
  } as any)

  revalidatePath('/admin/modules')
  return { success: true }
}

export async function reorderModules({ orderedIds }: { orderedIds: string[] }) {
  await requireAdmin()
  const service = createServiceClient()

  const updates = orderedIds.map((id, i) => service.from('modules').update({ order_index: i + 1 } as any).eq('id', id))
  const results = await Promise.all(updates)

  const failed = results.find(r => r.error)
  if (failed?.error) return { error: failed.error.message }

  revalidatePath('/admin/modules')
  return { success: true }
}

// ── Step CRUD ──────────────────────────────────────────────────────

const defaultStepConfig: Record<string, unknown> = {
  video: { url: '', min_watch_seconds: 0 },
  document: { url: '', require_ack: true, instructions: '' },
  form: { fields: [], instructions: '' },
  upload: { label: '', accept: '*/*', min_files: 1, max_files: 5, max_size_mb: 10, instructions: '' },
  booking: { calendar_url: '', call_type: 'onboarding', duration_min: 30, description: '' },
  conditional: { question: { field: '', label: '' }, branches: [] },
  external: { provider: 'ghl', metric: '', label: '' },
  dashboard: { source: 'mock', metrics: [], description: '' },
  video_document: { video_url: '', doc_url: '', doc_label: '', doc_require_ack: true, instructions: '' },
  iframe: { url: '', height: 600, instructions: '' },
}

export async function createStep({
  moduleId,
  type,
  title,
  slug,
  sla_hours,
}: {
  moduleId: string
  type: string
  title: string
  slug: string
  sla_hours: number
}) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const { data: existing } = await service.from('steps').select('order_index').eq('module_id', moduleId).order('order_index', { ascending: false }).limit(1).single()
  const nextIndex = ((existing as any)?.order_index ?? 0) + 1

  const { data, error } = await service.from('steps').insert({
    module_id: moduleId,
    type,
    title: title.trim(),
    slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
    order_index: nextIndex,
    sla_hours: sla_hours ?? 24,
    config: defaultStepConfig[type] ?? {},
    version: 1,
  } as any).select('id').single()

  if (error) return { error: error.message }

  const newStepId = (data as any).id

  // Backfill client_progress for all existing clients so completed accounts aren't broken.
  // Clients who already finished every other step in this module get the new step auto-completed;
  // everyone else gets it locked (will unlock naturally when they reach it).
  const { data: allClients } = await service.from('clients').select('id')
  if (allClients?.length) {
    const { data: moduleSteps } = await service
      .from('steps')
      .select('id')
      .eq('module_id', moduleId)
      .neq('id', newStepId)

    const siblingIds = (moduleSteps ?? []).map((s: any) => s.id)

    const backfillRows = await Promise.all(
      (allClients as any[]).map(async (client) => {
        if (!siblingIds.length) return { client_id: client.id, step_id: newStepId, status: 'locked' as StepStatus }

        const { data: siblingProgress } = await service
          .from('client_progress')
          .select('status')
          .eq('client_id', client.id)
          .in('step_id', siblingIds)

        const allSiblingsDone =
          (siblingProgress ?? []).length === siblingIds.length &&
          (siblingProgress as any[]).every((p) => p.status === 'completed')

        return {
          client_id: client.id,
          step_id: newStepId,
          status: (allSiblingsDone ? 'completed' : 'locked') as StepStatus,
          completed_at: allSiblingsDone ? new Date().toISOString() : null,
        }
      })
    )

    await service
      .from('client_progress')
      .upsert(backfillRows as any, { onConflict: 'client_id,step_id', ignoreDuplicates: true })
  }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_create_step',
    subject_table: 'steps',
    subject_id: newStepId,
    meta: { module_id: moduleId, type, title },
  } as any)

  revalidatePath('/admin/modules')
  return { success: true, id: newStepId }
}

export async function updateStep({
  id,
  title,
  slug,
  type,
  sla_hours,
  config,
}: {
  id: string
  title?: string
  slug?: string
  type?: string
  sla_hours?: number
  config?: Record<string, unknown>
}) {
  await requireAdmin()
  const service = createServiceClient()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (title !== undefined) patch.title = title.trim()
  if (slug !== undefined) patch.slug = slug.trim().toLowerCase().replace(/\s+/g, '-')
  if (sla_hours !== undefined) patch.sla_hours = sla_hours
  if (config !== undefined) patch.config = config
  if (type !== undefined) {
    patch.type = type
    patch.config = defaultStepConfig[type] ?? {}
  }

  const { error } = await service.from('steps').update(patch as any).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/modules')
  return { success: true }
}

export async function deleteStep({ id }: { id: string }) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const { error } = await service.from('steps').delete().eq('id', id)
  if (error) return { error: error.message }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_delete_step',
    subject_table: 'steps',
    subject_id: id,
    meta: {},
  } as any)

  revalidatePath('/admin/modules')
  return { success: true }
}

export async function reorderSteps({ moduleId, orderedIds }: { moduleId: string; orderedIds: string[] }) {
  await requireAdmin()
  const service = createServiceClient()

  const updates = orderedIds.map((id, i) => service.from('steps').update({ order_index: i + 1 } as any).eq('id', id).eq('module_id', moduleId))
  const results = await Promise.all(updates)

  const failed = results.find(r => r.error)
  if (failed?.error) return { error: failed.error.message }

  revalidatePath('/admin/modules')
  return { success: true }
}

export async function adminUnlockStep({ stepId, clientId }: { stepId: string; clientId: string }) {
  try {
    const session = await requireAdmin()
    const service = createServiceClient()

    const now = new Date().toISOString()

    const { error } = await service
      .from('client_progress')
      .update({ status: 'completed', completed_at: now } as any)
      .eq('client_id', clientId)
      .eq('step_id', stepId)

    if (error) return { success: false, error: error.message }

    await service.rpc('unlock_next_steps', { p_client_id: clientId } as any)

    await service.from('audit_log').insert({
      actor_id: session.id,
      action: 'admin_force_complete_step',
      subject_table: 'client_progress',
      subject_id: clientId,
      meta: { step_id: stepId },
    } as any)

    revalidatePath(`/admin/clients/${clientId}`)
    return { success: true, error: undefined }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
