'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { typeIcons, typeLabels } from './stepTypeMap'
import { GripVertical, Pencil, ClipboardList } from 'lucide-react'

interface Props {
  step: any
  onEdit: () => void
}

export function StepRow({ step, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const Icon = typeIcons[step.type] ?? ClipboardList

  return (
    <div ref={setNodeRef} style={style} className="group flex items-center gap-3 py-2.5">
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <span className="flex-1 min-w-0 truncate text-sm font-medium">{step.title}</span>

      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {typeLabels[step.type] ?? step.type}
      </span>

      <button
        onClick={onEdit}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
