'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { updateModule, deleteModule, createStep, reorderSteps } from '@/lib/admin/actions'
import { StepRow } from './StepRow'
import { StepEditorSheet } from './StepEditorSheet'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { STEP_TYPES, typeLabels } from './stepTypeMap'
import { X, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  module: any
  onModuleUpdated: (patch: Partial<any>) => void
  onModuleDeleted: () => void
}

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ModuleEditorSheet({ open, onOpenChange, module, onModuleUpdated, onModuleDeleted }: Props) {
  const sorted = [...(module.steps ?? [])].sort((a: any, b: any) => a.order_index - b.order_index)

  const [title, setTitle] = useState(module.title)
  const [description, setDescription] = useState(module.description ?? '')
  const [slug, setSlug] = useState(module.slug)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [saving, setSaving] = useState(false)
  const [steps, setSteps] = useState<any[]>(sorted)
  const [addingStep, setAddingStep] = useState(false)
  const [newStepTitle, setNewStepTitle] = useState('')
  const [newStepType, setNewStepType] = useState('form')
  const [creatingStep, setCreatingStep] = useState(false)
  const [activeStep, setActiveStep] = useState<any | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor))

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!slugManuallyEdited) {
      setSlug(val.trim().toLowerCase().replace(/\s+/g, '-'))
    }
  }

  async function handleSave() {
    if (!title.trim()) { toast.error('Title is required'); return }
    const finalSlug = slugManuallyEdited ? slug : title.trim().toLowerCase().replace(/\s+/g, '-')
    setSaving(true)
    const res = await updateModule({
      id: module.id,
      title: title.trim(),
      description,
      slug: finalSlug,
      unlock_rule: module.unlock_rule ?? 'previous_module_complete',
    })
    setSaving(false)
    if (res.error) { toast.error(res.error); return }
    toast.success('Module saved')
    onModuleUpdated({ title: title.trim(), description, slug: finalSlug })
  }

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteModule({ id: module.id })
    setDeleting(false)
    if (res.error) { toast.error(res.error); return }
    setDeleteOpen(false)
    onModuleDeleted()
  }

  async function handleAddStep() {
    if (!newStepTitle.trim()) { toast.error('Step title is required'); return }
    const slugified = newStepTitle.trim().toLowerCase().replace(/\s+/g, '-')
    setCreatingStep(true)
    const res = await createStep({ moduleId: module.id, type: newStepType, title: newStepTitle.trim(), slug: slugified, sla_hours: 24 })
    setCreatingStep(false)
    if (res.error) { toast.error(res.error); return }
    setSteps(s => [...s, { id: res.id, title: newStepTitle.trim(), slug: slugified, type: newStepType, sla_hours: 24, config: {}, order_index: s.length + 1 }])
    setNewStepTitle('')
    setNewStepType('form')
    setAddingStep(false)
    toast.success('Step created')
  }

  async function handleStepDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = steps.findIndex(s => s.id === active.id)
    const newIdx = steps.findIndex(s => s.id === over.id)
    const reordered = arrayMove(steps, oldIdx, newIdx)
    setSteps(reordered)
    await reorderSteps({ moduleId: module.id, orderedIds: reordered.map(s => s.id) })
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[50] bg-black/30 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed inset-y-0 right-0 z-[50] flex w-full max-w-lg flex-col border-l bg-card shadow-xl focus:outline-none">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
              <Dialog.Title className="text-base font-semibold">Edit Module</Dialog.Title>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  value={title}
                  onChange={e => handleTitleChange(e.target.value)}
                  className={inputClass}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of this module (optional)"
                  rows={2}
                  className={cn(inputClass, 'resize-none')}
                />
              </div>

              {/* Advanced toggle */}
              <div>
                <button
                  onClick={() => setShowAdvanced(a => !a)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', showAdvanced && 'rotate-90')} />
                  Advanced
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-1.5">
                    <label className="block text-sm font-medium">Slug</label>
                    <p className="text-xs text-muted-foreground">Auto-derived from title. Only edit if you know what you&apos;re doing.</p>
                    <input
                      value={slug}
                      onChange={e => { setSlug(e.target.value.replace(/\s+/g, '-').toLowerCase()); setSlugManuallyEdited(true) }}
                      className={inputClass}
                    />
                  </div>
                )}
              </div>

              {/* Steps section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Steps ({steps.length})
                  </span>
                  <div className="h-px flex-1 bg-border" />
                  {!addingStep && (
                    <button
                      onClick={() => setAddingStep(true)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add step
                    </button>
                  )}
                </div>

                {steps.length > 0 && (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStepDragEnd}>
                    <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="divide-y">
                        {steps.map(step => (
                          <StepRow
                            key={step.id}
                            step={step}
                            onEdit={() => setActiveStep(step)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {steps.length === 0 && !addingStep && (
                  <p className="text-xs text-muted-foreground py-2">No steps yet. Add your first step above.</p>
                )}

                {/* Add step inline form */}
                {addingStep && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                    <p className="text-xs font-medium">New step</p>
                    <input
                      value={newStepTitle}
                      onChange={e => setNewStepTitle(e.target.value)}
                      placeholder="Step title"
                      className={inputClass}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleAddStep(); if (e.key === 'Escape') setAddingStep(false) }}
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={newStepType}
                        onChange={e => setNewStepType(e.target.value)}
                        className={cn(inputClass, 'flex-1')}
                      >
                        {STEP_TYPES.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddStep}
                        disabled={creatingStep}
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {creatingStep ? 'Adding…' : 'Add step'}
                      </button>
                      <button
                        onClick={() => { setAddingStep(false); setNewStepTitle('') }}
                        className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">
              <Dialog.Close className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </Dialog.Close>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Step editor stacked on top */}
      {activeStep && (
        <StepEditorSheet
          open={!!activeStep}
          onOpenChange={open => { if (!open) setActiveStep(null) }}
          step={activeStep}
          moduleId={module.id}
          onStepUpdated={patch => setSteps(ss => ss.map(s => s.id === activeStep.id ? { ...s, ...patch } : s))}
          onStepDeleted={() => { setSteps(ss => ss.filter(s => s.id !== activeStep.id)); setActiveStep(null) }}
        />
      )}

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Module"
        description={`This will permanently delete "${module.title}" and all ${steps.length} step${steps.length === 1 ? '' : 's'}.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
