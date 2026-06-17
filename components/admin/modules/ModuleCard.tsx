'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { deleteModule } from '@/lib/admin/actions'
import { ModuleEditorSheet } from './ModuleEditorSheet'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { GripVertical, Layers, Pencil, Trash2 } from 'lucide-react'

interface Props {
  module: any
  onDeleted: () => void
  onUpdated: (patch: Partial<any>) => void
}

export function ModuleCard({ module, onDeleted, onUpdated }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: module.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const stepCount = (module.steps ?? []).length

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteModule({ id: module.id })
    setDeleting(false)
    if (res.error) { toast.error(res.error); return }
    setDeleteOpen(false)
    onDeleted()
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md"
      >
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Layers className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold">{module.title}</p>
          {module.description && (
            <p className="truncate text-xs text-muted-foreground mt-0.5">{module.description}</p>
          )}
        </div>

        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          {stepCount} {stepCount === 1 ? 'step' : 'steps'}
        </span>

        <button
          onClick={() => setSheetOpen(true)}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Edit module"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <button
          onClick={() => setDeleteOpen(true)}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Delete module"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ModuleEditorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        module={module}
        onModuleUpdated={patch => { onUpdated(patch); setSheetOpen(false) }}
        onModuleDeleted={() => { setSheetOpen(false); onDeleted() }}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Module"
        description={`This will permanently delete "${module.title}" and all ${stepCount} step${stepCount === 1 ? '' : 's'}.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
