'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateStep } from '@/lib/admin/actions'
import type { BookingConfig } from '@/lib/journey/types'

const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function BookingConfigEditor({ stepId, config }: { stepId: string; config: BookingConfig }) {
  const [calendarUrl, setCalendarUrl] = useState(config?.calendar_url ?? '')
  const [callType, setCallType] = useState(config?.call_type ?? 'onboarding')
  const [durationMin, setDurationMin] = useState(String(config?.duration_min ?? 30))
  const [description, setDescription] = useState(config?.description ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await updateStep({
      id: stepId,
      config: { calendar_url: calendarUrl, call_type: callType, duration_min: Number(durationMin), description },
    })
    setSaving(false)
    res.error ? toast.error(res.error) : toast.success('Saved')
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Calendar / Calendly URL</label>
        <input value={calendarUrl} onChange={e => setCalendarUrl(e.target.value)} placeholder="https://calendly.com/..." className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Call type</label>
          <input value={callType} onChange={e => setCallType(e.target.value)} placeholder="onboarding" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Duration (minutes)</label>
          <input type="number" min={5} value={durationMin} onChange={e => setDurationMin(e.target.value)} className={inputClass} />
        </div>
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
