'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateStep } from '@/lib/admin/actions'
import type { FormConfig, FormField } from '@/lib/journey/types'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

const inputClass = 'rounded-md border border-input bg-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
const FIELD_TYPES = ['text', 'email', 'url', 'number', 'textarea', 'select', 'checkbox']

function FieldRow({ field, onChange, onDelete }: {
  field: FormField & { _id: string }
  onChange: (updated: FormField & { _id: string }) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field._id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-start bg-muted/30 rounded-lg p-2 border">
      <button {...attributes} {...listeners} className="mt-1 text-muted-foreground/50 hover:text-muted-foreground cursor-grab">
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Label</label>
          <input value={field.label} onChange={e => onChange({ ...field, label: e.target.value })} className={cn(inputClass, 'w-full')} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Field name (key)</label>
          <input value={field.name} onChange={e => onChange({ ...field, name: e.target.value.replace(/\s+/g, '_').toLowerCase() })} className={cn(inputClass, 'w-full')} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Type</label>
          <select value={field.type} onChange={e => onChange({ ...field, type: e.target.value as FormField['type'] })} className={cn(inputClass, 'w-full')}>
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Placeholder</label>
          <input value={field.placeholder ?? ''} onChange={e => onChange({ ...field, placeholder: e.target.value })} className={cn(inputClass, 'w-full')} />
        </div>
        {field.type === 'select' && (
          <div className="col-span-2 space-y-1">
            <label className="text-[10px] text-muted-foreground">Options (comma-separated)</label>
            <input
              value={(field.options ?? []).join(', ')}
              onChange={e => onChange({ ...field, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              className={cn(inputClass, 'w-full')}
            />
          </div>
        )}
        <label className="col-span-2 flex items-center gap-2 text-[10px] cursor-pointer">
          <input type="checkbox" checked={field.required ?? false} onChange={e => onChange({ ...field, required: e.target.checked })} className="h-3 w-3 accent-primary" />
          Required
        </label>
      </div>

      <button onClick={onDelete} className="mt-1 text-destructive/60 hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function FormFieldsEditor({ stepId, config }: { stepId: string; config: FormConfig }) {
  const toKeyed = (f: FormField) => ({ ...f, _id: f.name || Math.random().toString(36).slice(2) })
  const [fields, setFields] = useState<(FormField & { _id: string })[]>((config?.fields ?? []).map(toKeyed))
  const [instructions, setInstructions] = useState(config?.instructions ?? '')
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor))

  function addField() {
    const _id = Math.random().toString(36).slice(2)
    setFields(f => [...f, { _id, name: `field_${f.length + 1}`, label: '', type: 'text', required: false }])
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = fields.findIndex(f => f._id === active.id)
    const newIdx = fields.findIndex(f => f._id === over.id)
    setFields(arrayMove(fields, oldIdx, newIdx))
  }

  async function save() {
    // Ensure all field names are unique and non-empty
    const names = fields.map(f => f.name.trim()).filter(Boolean)
    if (names.length !== new Set(names).size) {
      toast.error('Field names must be unique')
      return
    }
    setSaving(true)
    const cleanFields = fields.map(({ _id, ...rest }) => ({ ...rest, name: rest.name.trim() }))
    const res = await updateStep({ id: stepId, config: { fields: cleanFields, instructions } })
    setSaving(false)
    res.error ? toast.error(res.error) : toast.success('Saved')
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Form instructions</label>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map(f => f._id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {fields.map((f, i) => (
              <FieldRow
                key={f._id}
                field={f}
                onChange={updated => setFields(fs => fs.map((x, j) => j === i ? updated : x))}
                onDelete={() => setFields(fs => fs.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-2">
        <button onClick={addField} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border hover:bg-muted transition-colors">
          <Plus className="h-3 w-3" /> Add field
        </button>
        <button onClick={save} disabled={saving} className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save fields'}
        </button>
      </div>
    </div>
  )
}
