'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { deleteModule } from '@/lib/admin/actions'
import { ModuleEditorSheet } from './ModuleEditorSheet'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { GripVertical, Layers, Pencil, Trash2, Minus, Share2 } from 'lucide-react'

interface Props {
  module: any
  programs: { id: string; name: string }[]
  currentProgramId: string
  onDeleted: () => void
  onUpdated: (patch: Partial<any>) => void
  onRemoveFromProgram: () => void
}

export function ModuleCard({
  module,
  programs,
  currentProgramId,
  onDeleted,
  onUpdated,
  onRemoveFromProgram,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: module.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const stepCount = (module.steps ?? []).length
  const otherPrograms = (module.module_programs ?? [])
    .filter((l: any) => l.program_id !== currentProgramId)
    .map((l: any) => programs.find(p => p.id === l.program_id)?.name)
    .filter(Boolean) as string[]

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

        {otherPrograms.length > 0 && (
          <span
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs text-amber-600 dark:text-amber-400"
            title={`Also used by: ${otherPrograms.join(', ')}`}
          >
            <Share2 className="h-3 w-3" /> Shared
          </span>
        )}

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
          onClick={onRemoveFromProgram}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Remove from this program (keeps the module and its other programs)"
        >
          <Minus className="h-4 w-4" />
        </button>

        <button
          onClick={() => setDeleteOpen(true)}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Delete module everywhere"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ModuleEditorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        module={module}
        programs={programs}
        onModuleUpdated={patch => { onUpdated(patch); setSheetOpen(false) }}
        onProgramsChanged={patch => onUpdated(patch)}
        onModuleDeleted={() => { setSheetOpen(false); onDeleted() }}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Module"
        description={
          otherPrograms.length > 0
            ? `"${module.title}" is also used by ${otherPrograms.join(', ')}. Deleting removes it and all ${stepCount} step${stepCount === 1 ? '' : 's'} from every program. To take it out of this program only, use the − button instead.`
            : `This will permanently delete "${module.title}" and all ${stepCount} step${stepCount === 1 ? '' : 's'}.`
        }
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
