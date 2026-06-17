'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateStep } from '@/lib/admin/actions'
import type { UploadConfig } from '@/lib/journey/types'
import { cn } from '@/lib/utils'

const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function UploadConfigEditor({ stepId, config }: { stepId: string; config: UploadConfig }) {
  const [label, setLabel] = useState(config?.label ?? '')
  const [accept, setAccept] = useState(config?.accept ?? '*/*')
  const [minFiles, setMinFiles] = useState(String(config?.min_files ?? 1))
  const [maxFiles, setMaxFiles] = useState(String(config?.max_files ?? 5))
  const [maxSizeMb, setMaxSizeMb] = useState(String(config?.max_size_mb ?? 10))
  const [instructions, setInstructions] = useState(config?.instructions ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await updateStep({
      id: stepId,
      config: { label, accept, min_files: Number(minFiles), max_files: Number(maxFiles), max_size_mb: Number(maxSizeMb), instructions },
    })
    setSaving(false)
    res.error ? toast.error(res.error) : toast.success('Saved')
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Accept (e.g. image/*, .pdf)</label>
          <input value={accept} onChange={e => setAccept(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Min files</label>
          <input type="number" min={1} value={minFiles} onChange={e => setMinFiles(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Max files</label>
          <input type="number" min={1} value={maxFiles} onChange={e => setMaxFiles(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Max size (MB)</label>
          <input type="number" min={1} value={maxSizeMb} onChange={e => setMaxSizeMb(e.target.value)} className={cn(inputClass, 'col-span-1')} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Instructions</label>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2} className={inputClass} />
      </div>
      <button onClick={save} disabled={saving} className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
