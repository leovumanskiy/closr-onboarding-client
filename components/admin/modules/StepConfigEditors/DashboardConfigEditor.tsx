'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateStep } from '@/lib/admin/actions'
import type { DashboardConfig } from '@/lib/journey/types'

const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function DashboardConfigEditor({ stepId, config }: { stepId: string; config: DashboardConfig }) {
  const [source, setSource] = useState<'ghl' | 'mock'>(config?.source ?? 'mock')
  const [metrics, setMetrics] = useState((config?.metrics ?? []).join(', '))
  const [description, setDescription] = useState(config?.description ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const metricsArr = metrics.split(',').map(s => s.trim()).filter(Boolean)
    const res = await updateStep({ id: stepId, config: { source, metrics: metricsArr, description } })
    setSaving(false)
    res.error ? toast.error(res.error) : toast.success('Saved')
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Data source</label>
        <select value={source} onChange={e => setSource(e.target.value as 'ghl' | 'mock')} className={inputClass}>
          <option value="mock">Mock data</option>
          <option value="ghl">GHL (Go High Level)</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Metrics (comma-separated keys)</label>
        <input value={metrics} onChange={e => setMetrics(e.target.value)} placeholder="leads, calls, revenue" className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputClass} />
      </div>
      <button onClick={save} disabled={saving} className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
