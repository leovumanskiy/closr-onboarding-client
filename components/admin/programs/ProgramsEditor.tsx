'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'
import { createProgram, updateProgram, deleteProgram, setDefaultProgram } from '@/lib/admin/programActions'
import { DeleteConfirmDialog } from '@/components/admin/modules/DeleteConfirmDialog'
import { Plus, X, Pencil, Trash2, Star, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface Program {
  id: string
  slug: string
  name: string
  description: string | null
  is_default: boolean
  is_active: boolean
  moduleCount: number
  clientCount: number
}

export function ProgramsEditor({ initialPrograms }: { initialPrograms: Program[] }) {
  const [programs, setPrograms] = useState<Program[]>(initialPrograms)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [deleting, setDeleting] = useState<Program | null>(null)
  const [busy, setBusy] = useState(false)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')

  function openAdd() {
    setName(''); setSlug(''); setDescription('')
    setAddOpen(true)
  }

  function openEdit(p: Program) {
    setName(p.name); setSlug(p.slug); setDescription(p.description ?? '')
    setEditing(p)
  }

  async function handleCreate() {
    if (!name.trim()) { toast.error('Program name is required'); return }
    setBusy(true)
    const res = await createProgram({ name, slug, description })
    setBusy(false)
    if (res.error) { toast.error(res.error); return }
    setPrograms(ps => [...ps, {
      id: res.id!,
      name: name.trim(),
      slug: (slug || name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      description: description.trim() || null,
      is_default: false,
      is_active: true,
      moduleCount: 0,
      clientCount: 0,
    }].sort((a, b) => a.name.localeCompare(b.name)))
    setAddOpen(false)
    toast.success('Program created')
  }

  async function handleUpdate() {
    if (!editing) return
    if (!name.trim()) { toast.error('Program name is required'); return }
    setBusy(true)
    const res = await updateProgram({ id: editing.id, name, slug, description })
    setBusy(false)
    if (res.error) { toast.error(res.error); return }
    setPrograms(ps => ps.map(p => p.id === editing.id
      ? { ...p, name: name.trim(), slug: slug.trim(), description: description.trim() || null }
      : p
    ))
    setEditing(null)
    toast.success('Program updated')
  }

  async function handleDelete() {
    if (!deleting) return
    setBusy(true)
    const res = await deleteProgram({ id: deleting.id })
    setBusy(false)
    if (res.error) { toast.error(res.error); return }
    setPrograms(ps => ps.filter(p => p.id !== deleting.id))
    setDeleting(null)
    toast.success('Program deleted')
  }

  async function handleSetDefault(p: Program) {
    const res = await setDefaultProgram({ id: p.id })
    if (res.error) { toast.error(res.error); return }
    setPrograms(ps => ps.map(x => ({ ...x, is_default: x.id === p.id })))
    toast.success(`${p.name} is now the default program`)
  }

  return (
    <div className="space-y-3">
      {programs.map(p => (
        <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <GitBranch className="h-4 w-4 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              {p.is_default && (
                <span className="shrink-0 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Default
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground mt-0.5">
              /{p.slug}
              {p.description ? ` · ${p.description}` : ''}
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {p.moduleCount} {p.moduleCount === 1 ? 'module' : 'modules'}
          </span>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {p.clientCount} {p.clientCount === 1 ? 'client' : 'clients'}
          </span>

          <button
            onClick={() => handleSetDefault(p)}
            disabled={p.is_default}
            className={cn(
              'shrink-0 rounded-md p-1.5',
              p.is_default
                ? 'text-primary/40 cursor-default'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            title={p.is_default ? 'Already the default program' : 'Make default (fallback for unassigned clients)'}
          >
            <Star className={cn('h-4 w-4', p.is_default && 'fill-current')} />
          </button>

          <button
            onClick={() => openEdit(p)}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Edit program"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            onClick={() => setDeleting(p)}
            disabled={p.is_default}
            className={cn(
              'shrink-0 rounded-md p-1.5',
              p.is_default
                ? 'text-muted-foreground/30 cursor-not-allowed'
                : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
            )}
            title={p.is_default ? 'The default program cannot be deleted' : 'Delete program'}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {programs.length === 0 && (
        <div className="rounded-xl border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">No programs yet. Create your first one below.</p>
        </div>
      )}

      <button
        onClick={openAdd}
        className="w-full rounded-xl border border-dashed bg-card py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
      >
        <Plus className="h-4 w-4" /> Add program
      </button>

      {/* Create / edit dialog — same form, two modes */}
      <Dialog.Root
        open={addOpen || editing !== null}
        onOpenChange={open => { if (!open) { setAddOpen(false); setEditing(null) } }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[50] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[50] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-xl focus:outline-none">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-base font-semibold">
                {editing ? 'Edit program' : 'Add program'}
              </Dialog.Title>
              <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. DWY"
                  className={inputClass}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">
                  Slug <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="auto-generated from name"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">
                  Description <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Who this program is for"
                  rows={2}
                  className={cn(inputClass, 'resize-none')}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </Dialog.Close>
              <button
                onClick={editing ? handleUpdate : handleCreate}
                disabled={busy}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Create program'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <DeleteConfirmDialog
        open={deleting !== null}
        onOpenChange={open => { if (!open) setDeleting(null) }}
        title="Delete Program"
        description={
          deleting
            ? `This deletes the program "${deleting.name}". Its ${deleting.moduleCount} module${deleting.moduleCount === 1 ? '' : 's'} are not deleted — they stay available for other programs.`
            : ''
        }
        onConfirm={handleDelete}
        loading={busy}
      />
    </div>
  )
}
