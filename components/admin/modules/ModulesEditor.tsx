'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { createModule, reorderModules } from '@/lib/admin/actions'
import { ModuleCard } from './ModuleCard'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ModulesEditor({ initialModules }: { initialModules: any[] }) {
  const sorted = [...initialModules].sort((a, b) => a.order_index - b.order_index)
  const [modules, setModules] = useState<any[]>(sorted)
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor))

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = modules.findIndex(m => m.id === active.id)
    const newIdx = modules.findIndex(m => m.id === over.id)
    const reordered = arrayMove(modules, oldIdx, newIdx)
    setModules(reordered)
    const res = await reorderModules({ orderedIds: reordered.map(m => m.id) })
    if (res.error) toast.error(res.error)
  }

  async function handleCreate() {
    if (!newTitle.trim()) { toast.error('Module title is required'); return }
    const slug = newTitle.trim().toLowerCase().replace(/\s+/g, '-')
    setCreating(true)
    const res = await createModule({ title: newTitle.trim(), description: newDesc.trim(), slug })
    setCreating(false)
    if (res.error) { toast.error(res.error); return }
    setModules(m => [...m, {
      id: res.id,
      title: newTitle.trim(),
      description: newDesc.trim(),
      slug,
      steps: [],
      order_index: m.length + 1,
    }])
    setNewTitle('')
    setNewDesc('')
    setAddOpen(false)
    toast.success('Module created')
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
          {modules.map(mod => (
            <ModuleCard
              key={mod.id}
              module={mod}
              onDeleted={() => setModules(ms => ms.filter(m => m.id !== mod.id))}
              onUpdated={patch => setModules(ms => ms.map(m => m.id === mod.id ? { ...m, ...patch } : m))}
            />
          ))}
        </SortableContext>
      </DndContext>

      {modules.length === 0 && (
        <div className="rounded-xl border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">No modules yet. Create your first module below.</p>
        </div>
      )}

      {/* Add module button */}
      <button
        onClick={() => setAddOpen(true)}
        className="w-full rounded-xl border border-dashed bg-card py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
      >
        <Plus className="h-4 w-4" /> Add module
      </button>

      {/* Add module dialog */}
      <Dialog.Root open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) { setNewTitle(''); setNewDesc('') } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[50] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[50] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-xl focus:outline-none">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-base font-semibold">Add module</Dialog.Title>
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
    </div>
  )
}
