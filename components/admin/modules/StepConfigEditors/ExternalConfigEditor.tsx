'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateStep } from '@/lib/admin/actions'
import type { ExternalConfig } from '@/lib/journey/types'

const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ExternalConfigEditor({ stepId, config }: { stepId: string; config: ExternalConfig }) {
  const [metric, setMetric] = useState(config?.metric ?? '')
  const [label, setLabel] = useState(config?.label ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await updateStep({ id: stepId, config: { provider: 'ghl', metric, label } })
    setSaving(false)
    res.error ? toast.error(res.error) : toast.success('Saved')
  }

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs text-muted-foreground">Provider: GHL (Go High Level). Set the metric key and display label below.</p>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Metric key</label>
        <input value={metric} onChange={e => setMetric(e.target.value)} placeholder="contacts_count" className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Display label</label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Your GHL Stats" className={inputClass} />
      </div>
      <button onClick={save} disabled={saving} className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
