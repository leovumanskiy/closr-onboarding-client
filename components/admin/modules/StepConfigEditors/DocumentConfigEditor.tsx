'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateStep } from '@/lib/admin/actions'
import type { DocumentConfig } from '@/lib/journey/types'

const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function DocumentConfigEditor({ stepId, config }: { stepId: string; config: DocumentConfig }) {
  const [url, setUrl] = useState(config?.url ?? '')
  const [requireAck, setRequireAck] = useState(config?.require_ack ?? true)
  const [ctaLabel, setCtaLabel] = useState(config?.cta_label ?? '')
  const [instructions, setInstructions] = useState(config?.instructions ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await updateStep({ id: stepId, config: { url, require_ack: requireAck, cta_label: ctaLabel, instructions } })
    setSaving(false)
    res.error ? toast.error(res.error) : toast.success('Saved')
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Document URL</label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Instructions</label>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">CTA button label</label>
        <input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="Download" className={inputClass} />
      </div>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={requireAck} onChange={e => setRequireAck(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
        Require acknowledgement before completing
      </label>
      <button onClick={save} disabled={saving} className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
