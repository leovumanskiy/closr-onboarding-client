'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'
import { updateStep, deleteStep } from '@/lib/admin/actions'
import { VideoConfigEditor } from './StepConfigEditors/VideoConfigEditor'
import { DocumentConfigEditor } from './StepConfigEditors/DocumentConfigEditor'
import { FormFieldsEditor } from './StepConfigEditors/FormFieldsEditor'
import { UploadConfigEditor } from './StepConfigEditors/UploadConfigEditor'
import { BookingConfigEditor } from './StepConfigEditors/BookingConfigEditor'
import { ConditionalConfigEditor } from './StepConfigEditors/ConditionalConfigEditor'
import { ExternalConfigEditor } from './StepConfigEditors/ExternalConfigEditor'
import { DashboardConfigEditor } from './StepConfigEditors/DashboardConfigEditor'
import { VideoDocumentConfigEditor } from './StepConfigEditors/VideoDocumentConfigEditor'
import { IframeConfigEditor } from './StepConfigEditors/IframeConfigEditor'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { STEP_TYPES, typeLabels } from './stepTypeMap'
import { X, ChevronRight, AlertTriangle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function ConfigEditor({ stepId, type, config }: { stepId: string; type: string; config: any }) {
  switch (type) {
    case 'video': return <VideoConfigEditor stepId={stepId} config={config} />
    case 'document': return <DocumentConfigEditor stepId={stepId} config={config} />
    case 'form': return <FormFieldsEditor stepId={stepId} config={config} />
    case 'upload': return <UploadConfigEditor stepId={stepId} config={config} />
    case 'booking': return <BookingConfigEditor stepId={stepId} config={config} />
    case 'conditional': return <ConditionalConfigEditor stepId={stepId} config={config} />
    case 'external':       return <ExternalConfigEditor stepId={stepId} config={config} />
    case 'dashboard':      return <DashboardConfigEditor stepId={stepId} config={config} />
    case 'video_document': return <VideoDocumentConfigEditor stepId={stepId} config={config} />
    case 'iframe':         return <IframeConfigEditor stepId={stepId} config={config} />
    default: return <p className="text-xs text-muted-foreground pt-2">No config editor for type &quot;{type}&quot;.</p>
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: any
  moduleId: string
  onStepUpdated: (patch: Partial<any>) => void
  onStepDeleted: () => void
}

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function StepEditorSheet({ open, onOpenChange, step, moduleId, onStepUpdated, onStepDeleted }: Props) {
  const [title, setTitle] = useState(step.title)
  const [type, setType] = useState(step.type)
  const [slaHours, setSlaHours] = useState(String(step.sla_hours ?? 24))
  const [slug, setSlug] = useState(step.slug)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [typeChanged, setTypeChanged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!slugManuallyEdited) {
      setSlug(val.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }

  function handleTypeChange(val: string) {
    setType(val)
    setTypeChanged(val !== step.type)
  }

  async function handleSaveBasics() {
    if (!title.trim()) { toast.error('Step title is required'); return }
    const finalSlug = slugManuallyEdited ? slug : title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setSaving(true)
    const res = await updateStep({
      id: step.id,
      title: title.trim(),
      slug: finalSlug,
      sla_hours: Number(slaHours),
      ...(typeChanged ? { type } : {}),
    })
    setSaving(false)
    if (res.error) { toast.error(res.error); return }
    toast.success('Step saved')
    setTypeChanged(false)
    onStepUpdated({ title: title.trim(), slug: finalSlug, type, sla_hours: Number(slaHours) })
    onOpenChange(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteStep({ id: step.id })
    setDeleting(false)
    if (res.error) { toast.error(res.error); return }
    setDeleteOpen(false)
    onStepDeleted()
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-lg flex-col border-l bg-card shadow-2xl focus:outline-none">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
              <div className="min-w-0">
                <Dialog.Title className="text-base font-semibold">Edit Step</Dialog.Title>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{step.title}</p>
              </div>
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
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Basics section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basics</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Step title <span className="text-destructive">*</span></label>
                  <input
                    value={title}
                    onChange={e => handleTitleChange(e.target.value)}
                    className={inputClass}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Type</label>
                    <select
                      value={type}
                      onChange={e => handleTypeChange(e.target.value)}
                      className={inputClass}
                    >
                      {STEP_TYPES.map(t => (
                        <option key={t} value={t}>{typeLabels[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">SLA (hours)</label>
                    <input
                      type="number"
                      min={1}
                      value={slaHours}
                      onChange={e => setSlaHours(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {typeChanged && (
                  <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2.5 dark:border-yellow-900/50 dark:bg-yellow-900/20">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      Changing the step type will reset its configuration when you save.
                    </p>
                  </div>
                )}

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
              </div>

              {/* Configuration section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuration</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <ConfigEditor stepId={step.id} type={type} config={step.config ?? {}} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">
              <Dialog.Close className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </Dialog.Close>
              <button
                onClick={handleSaveBasics}
                disabled={saving}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Step"
        description={`This will permanently delete "${step.title}".`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
