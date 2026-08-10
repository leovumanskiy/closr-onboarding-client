'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { createModule } from '@/lib/admin/actions'
import { reorderModulesInProgram, setModulePrograms } from '@/lib/admin/programActions'
import { ModuleCard } from './ModuleCard'
import { Plus, X, Library } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface Program {
  id: string
  slug: string
  name: string
  is_default: boolean
}

/**
 * Modules are shared across programs, so this editor always works "inside" one
 * program: the list, the ordering and the drag handles all apply to the selected
 * program only. Editing a module's content edits it everywhere it appears —
 * which is the point of sharing — but adding, removing and reordering are scoped.
 */
export function ModulesEditor({
  initialModules,
  programs,
}: {
  initialModules: any[]
  programs: Program[]
}) {
  const [modules, setModules] = useState<any[]>(initialModules)
  const [programId, setProgramId] = useState<string>(
    programs.find(p => p.is_default)?.id ?? programs[0]?.id ?? ''
  )
  const [addOpen, setAddOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor))

  const orderIn = (m: any, pid: string): number | null => {
    const link = (m.module_programs ?? []).find((l: any) => l.program_id === pid)
    return link ? link.order_index : null
  }

  // Modules in the selected program, in that program's order.
  const visible = useMemo(
    () =>
      modules
        .filter(m => orderIn(m, programId) !== null)
        .sort((a, b) => (orderIn(a, programId)! - orderIn(b, programId)!)),
    [modules, programId]
  )

  // Modules that exist but aren't in this program yet — the "library".
  const available = useMemo(
    () => modules.filter(m => orderIn(m, programId) === null),
    [modules, programId]
  )

  const selectedProgram = programs.find(p => p.id === programId)

  function setLinks(moduleId: string, fn: (links: any[]) => any[]) {
    setModules(ms =>
      ms.map(m => (m.id === moduleId ? { ...m, module_programs: fn(m.module_programs ?? []) } : m))
    )
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = visible.findIndex(m => m.id === active.id)
    const newIdx = visible.findIndex(m => m.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return

    const reordered = arrayMove(visible, oldIdx, newIdx)

    // Optimistically renumber this program's links 1..n.
    setModules(ms =>
      ms.map(m => {
        const pos = reordered.findIndex(r => r.id === m.id)
        if (pos < 0) return m
        return {
          ...m,
          module_programs: (m.module_programs ?? []).map((l: any) =>
            l.program_id === programId ? { ...l, order_index: pos + 1 } : l
          ),
        }
      })
    )

    const res = await reorderModulesInProgram({ programId, orderedIds: reordered.map(m => m.id) })
    if (res.error) toast.error(res.error)
  }

  async function handleCreate() {
    if (!newTitle.trim()) { toast.error('Module title is required'); return }
    if (!programId) { toast.error('Create a program first'); return }
    const slug = newTitle.trim().toLowerCase().replace(/\s+/g, '-')
    setCreating(true)
    const res = await createModule({ title: newTitle.trim(), description: newDesc.trim(), slug, programId })
    setCreating(false)
    if (res.error) { toast.error(res.error); return }
    setModules(m => [...m, {
      id: res.id,
      title: newTitle.trim(),
      description: newDesc.trim(),
      slug,
      steps: [],
      order_index: m.length + 1,
      module_programs: [{ program_id: programId, order_index: visible.length + 1 }],
    }])
    setNewTitle('')
    setNewDesc('')
    setAddOpen(false)
    toast.success('Module created')
  }

  async function addExisting(mod: any) {
    const programIds = [...(mod.module_programs ?? []).map((l: any) => l.program_id), programId]
    setLinks(mod.id, links => [...links, { program_id: programId, order_index: visible.length + 1 }])
    const res = await setModulePrograms({ moduleId: mod.id, programIds })
    if (res.error) {
      toast.error(res.error)
      setLinks(mod.id, links => links.filter((l: any) => l.program_id !== programId))
      return
    }
    toast.success(`Added to ${selectedProgram?.name}`)
  }

  async function removeFromProgram(mod: any) {
    const programIds = (mod.module_programs ?? [])
      .map((l: any) => l.program_id)
      .filter((p: string) => p !== programId)
    const snapshot = mod.module_programs ?? []
    setLinks(mod.id, links => links.filter((l: any) => l.program_id !== programId))
    const res = await setModulePrograms({ moduleId: mod.id, programIds })
    if (res.error) {
      toast.error(res.error)
      setLinks(mod.id, () => snapshot)
      return
    }
    toast.success(`Removed from ${selectedProgram?.name}`)
  }

  if (!programs.length) {
    return (
      <div className="rounded-xl border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No programs yet. Create one on the Programs page before adding modules.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Program selector */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
        {programs.map(p => (
          <button
            key={p.id}
            onClick={() => setProgramId(p.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              p.id === programId
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {p.name}
            <span className="ml-1.5 text-xs opacity-60">
              {modules.filter(m => orderIn(m, p.id) !== null).length}
            </span>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Ordering and membership below apply to <span className="font-medium text-foreground">{selectedProgram?.name}</span> only.
        Editing a module&apos;s title or steps changes it in every program that uses it.
      </p>

      <div className="space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visible.map(m => m.id)} strategy={verticalListSortingStrategy}>
            {visible.map(mod => (
              <ModuleCard
                key={mod.id}
                module={mod}
                programs={programs}
                currentProgramId={programId}
                onDeleted={() => setModules(ms => ms.filter(m => m.id !== mod.id))}
                onUpdated={patch => setModules(ms => ms.map(m => m.id === mod.id ? { ...m, ...patch } : m))}
                onRemoveFromProgram={() => removeFromProgram(mod)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {visible.length === 0 && (
          <div className="rounded-xl border bg-card py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No modules in {selectedProgram?.name} yet. Add a new one, or reuse an existing module.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setAddOpen(true)}
            className="flex-1 rounded-xl border border-dashed bg-card py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" /> Add module
          </button>
          {available.length > 0 && (
            <button
              onClick={() => setLibraryOpen(true)}
              className="flex-1 rounded-xl border border-dashed bg-card py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <Library className="h-4 w-4" /> Reuse existing ({available.length})
            </button>
          )}
        </div>
      </div>

      {/* Add module dialog */}
      <Dialog.Root open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) { setNewTitle(''); setNewDesc('') } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[50] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[50] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-xl focus:outline-none">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-base font-semibold">Add module to {selectedProgram?.name}</Dialog.Title>
              <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Getting Started"
                  className={inputClass}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAddOpen(false) }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Description <span className="text-xs font-normal text-muted-foreground">(optional)</span></label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Brief description of this module"
                  rows={2}
                  className={cn(inputClass, 'resize-none')}
                />
              </div>

              <p className="text-xs text-muted-foreground">Slug will be auto-generated from the title.</p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </Dialog.Close>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create module'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Reuse existing module dialog */}
      <Dialog.Root open={libraryOpen} onOpenChange={setLibraryOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[50] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[50] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-xl focus:outline-none">
            <div className="flex items-center justify-between mb-2">
              <Dialog.Title className="text-base font-semibold">Reuse an existing module</Dialog.Title>
              <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              The same module appears in both programs. Editing it in one place changes it everywhere.
            </p>

            <div className="max-h-80 space-y-2 overflow-y-auto">
              {available.map(mod => (
                <div key={mod.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{mod.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {(mod.steps ?? []).length} steps
                      {(mod.module_programs ?? []).length > 0 && ' · in '}
                      {(mod.module_programs ?? [])
                        .map((l: any) => programs.find(p => p.id === l.program_id)?.name)
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => addExisting(mod)}
                    className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
