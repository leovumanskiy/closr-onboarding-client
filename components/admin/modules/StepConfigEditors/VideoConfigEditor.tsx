'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateStep } from '@/lib/admin/actions'
import type { VideoConfig } from '@/lib/journey/types'
import { cn } from '@/lib/utils'

export function VideoConfigEditor({ stepId, config }: { stepId: string; config: VideoConfig }) {
  const [url, setUrl] = useState(config?.url ?? '')
  const [minWatch, setMinWatch] = useState(String(config?.min_watch_seconds ?? 0))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await updateStep({ id: stepId, config: { url, min_watch_seconds: Number(minWatch) } })
    setSaving(false)
    res.error ? toast.error(res.error) : toast.success('Saved')
  }

  const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Video URL</label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Min watch seconds</label>
        <input type="number" min={0} value={minWatch} onChange={e => setMinWatch(e.target.value)} className={cn(inputClass, 'w-28')} />
      </div>
      <button onClick={save} disabled={saving} className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
