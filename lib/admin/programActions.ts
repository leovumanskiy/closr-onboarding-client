'use server'

import { requireAdmin } from '@/lib/auth/requireUser'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { reseedClientProgram } from '@/lib/journey/engine'

/**
 * Program CRUD and module/client assignment.
 *
 * Same contract as lib/admin/actions.ts: every export starts with requireAdmin()
 * — the service-role client below bypasses RLS entirely, so that check is the
 * only gate — and every mutation writes an audit_log row.
 */

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ── Program CRUD ───────────────────────────────────────────────────────

export async function createProgram({
  name,
  slug,
  description,
}: {
  name: string
  slug?: string
  description?: string
}) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const finalSlug = slugify(slug || name)
  if (!finalSlug) return { error: 'Program needs a name.' }

  const { data, error } = await service.from('programs').insert({
    name: name.trim(),
    slug: finalSlug,
    description: description?.trim() || null,
    // Never auto-default: the default program is the fallback for unassigned
    // clients and is set deliberately via setDefaultProgram.
    is_default: false,
  } as any).select('id').single()

  if (error) {
    if (error.code === '23505') return { error: `A program with slug "${finalSlug}" already exists.` }
    return { error: error.message }
  }

  const id = (data as any).id

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_create_program',
    subject_table: 'programs',
    subject_id: id,
    meta: { name, slug: finalSlug },
  } as any)

  revalidatePath('/admin/programs')
  revalidatePath('/admin/modules')
  return { success: true, id }
}

export async function updateProgram({
  id,
  name,
  slug,
  description,
  isActive,
}: {
  id: string
  name: string
  slug: string
  description?: string
  isActive?: boolean
}) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const finalSlug = slugify(slug || name)
  if (!finalSlug) return { error: 'Program needs a name.' }

  const { error } = await service.from('programs').update({
    name: name.trim(),
    slug: finalSlug,
    description: description?.trim() || null,
    ...(isActive === undefined ? {} : { is_active: isActive }),
    updated_at: new Date().toISOString(),
  } as any).eq('id', id)

  if (error) {
    if (error.code === '23505') return { error: `A program with slug "${finalSlug}" already exists.` }
    return { error: error.message }
  }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_update_program',
    subject_table: 'programs',
    subject_id: id,
    meta: { name, slug: finalSlug },
  } as any)

  revalidatePath('/admin/programs')
  revalidatePath('/admin/modules')
  return { success: true }
}

export async function deleteProgram({ id }: { id: string }) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const { data: program } = await service
    .from('programs')
    .select('is_default, name')
    .eq('id', id)
    .single()

  if (!program) return { error: 'Program not found.' }
  if ((program as any).is_default) {
    return { error: 'The default program cannot be deleted — it is the fallback for unassigned clients.' }
  }

  // clients.program_id is ON DELETE SET NULL, so deleting a program in use would
  // silently drop those clients back onto the default journey. Make it explicit.
  const { count } = await service
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('program_id', id)

  if ((count ?? 0) > 0) {
    return { error: `${count} client${count === 1 ? ' is' : 's are'} still on this program. Move them to another program first.` }
  }

  const { error } = await service.from('programs').delete().eq('id', id)
  if (error) return { error: error.message }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_delete_program',
    subject_table: 'programs',
    subject_id: id,
    meta: { name: (program as any).name },
  } as any)

  revalidatePath('/admin/programs')
  revalidatePath('/admin/modules')
  return { success: true }
}

export async function setDefaultProgram({ id }: { id: string }) {
  const session = await requireAdmin()
  const service = createServiceClient()

  // programs_one_default_idx is a partial unique index, so the old default must
  // be cleared before the new one is set or the update collides.
  const { error: clearErr } = await service
    .from('programs')
    .update({ is_default: false } as any)
    .eq('is_default', true)
  if (clearErr) return { error: clearErr.message }

  const { error } = await service
    .from('programs')
    .update({ is_default: true } as any)
    .eq('id', id)
  if (error) return { error: error.message }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_set_default_program',
    subject_table: 'programs',
    subject_id: id,
    meta: {},
  } as any)

  revalidatePath('/admin/programs')
  return { success: true }
}

// ── Module ↔ program assignment ────────────────────────────────────────

export async function setModulePrograms({
  moduleId,
  programIds,
}: {
  moduleId: string
  programIds: string[]
}) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const { data: currentRaw } = await service
    .from('module_programs')
    .select('program_id')
    .eq('module_id', moduleId)
  const current = new Set(((currentRaw ?? []) as any[]).map(r => r.program_id))
  const target = new Set(programIds)

  const toRemove = [...current].filter(p => !target.has(p))
  const toAdd = [...target].filter(p => !current.has(p))

  if (toRemove.length) {
    const { error } = await service
      .from('module_programs')
      .delete()
      .eq('module_id', moduleId)
      .in('program_id', toRemove)
    if (error) return { error: error.message }
  }

  for (const programId of toAdd) {
    // Append to the end of that program's list.
    const { data: last } = await service
      .from('module_programs')
      .select('order_index')
      .eq('program_id', programId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { error } = await service.from('module_programs').insert({
      module_id: moduleId,
      program_id: programId,
      order_index: ((last as any)?.order_index ?? 0) + 1,
    } as any)
    if (error) return { error: error.message }
  }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_set_module_programs',
    subject_table: 'modules',
    subject_id: moduleId,
    meta: { added: toAdd, removed: toRemove },
  } as any)

  revalidatePath('/admin/modules')
  return { success: true }
}

export async function reorderModulesInProgram({
  programId,
  orderedIds,
}: {
  programId: string
  orderedIds: string[]
}) {
  await requireAdmin()
  const service = createServiceClient()

  // Sequential 1..n renumber. (program_id, order_index) is intentionally not
  // unique — see 0020 — so these updates can't collide mid-flight.
  const updates = orderedIds.map((moduleId, i) =>
    service
      .from('module_programs')
      .update({ order_index: i + 1 } as any)
      .eq('program_id', programId)
      .eq('module_id', moduleId)
  )

  const results = await Promise.all(updates)
  const failed = results.find(r => r.error)
  if (failed?.error) return { error: failed.error.message }

  revalidatePath('/admin/modules')
  return { success: true }
}

// ── Client ↔ program assignment ────────────────────────────────────────

export async function setClientProgram({
  clientId,
  programId,
}: {
  clientId: string
  programId: string
}) {
  const session = await requireAdmin()
  const service = createServiceClient()

  const { data: before } = await service
    .from('clients')
    .select('program_id')
    .eq('id', clientId)
    .single()

  const previous = (before as any)?.program_id ?? null
  if (previous === programId) return { success: true }

  const { error } = await service
    .from('clients')
    .update({ program_id: programId, updated_at: new Date().toISOString() } as any)
    .eq('id', clientId)
  if (error) return { error: error.message }

  // Seed progress rows for whatever the new program contains and make sure the
  // client has a reachable step. Completions on modules shared by both programs
  // are preserved.
  await reseedClientProgram(clientId)

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'admin_set_client_program',
    subject_table: 'clients',
    subject_id: clientId,
    meta: { from: previous, to: programId },
  } as any)

  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${clientId}`)
  return { success: true }
}
