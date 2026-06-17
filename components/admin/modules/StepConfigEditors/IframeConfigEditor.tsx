'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateStepConfig } from '@/lib/admin/actions'

interface Props {
  stepId: string
  config: {
    url?: string
    height?: number
    instructions?: string
    open_in_new_tab?: boolean
    fallback_prompt?: string
    confirm_label?: string
  }
}

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function IframeConfigEditor({ stepId, config }: Props) {
  const [form, setForm] = useState({
    url: config.url ?? '',
    height: String(config.height ?? 600),
    instructions: config.instructions ?? '',
    fallback_prompt: config.fallback_prompt ?? '',
    confirm_label: config.confirm_label ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    const res = await updateStepConfig({
      stepId,
      config: {
        url: form.url,
        height: Number(form.height) || 600,
        instructions: form.instructions || undefined,
        fallback_prompt: form.fallback_prompt || undefined,
        confirm_label: form.confirm_label || undefined,
      },
    })
    setSaving(false)
    if (res.error) { toast.error(res.error); return }
    toast.success('Config saved')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Form URL (GoHighLevel embed URL)</label>
        <input value={form.url} onChange={e => set('url', e.target.value)} className={inputClass} placeholder="https://app.gohighlevel.com/form/..." />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Frame height (px)</label>
        <input type="number" min={200} value={form.height} onChange={e => set('height', e.target.value)} className={inputClass} />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Instructions shown above frame (optional)</label>
        <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)} className={inputClass} rows={3} />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Fallback prompt next to “Open it here” (optional)</label>
        <input value={form.fallback_prompt} onChange={e => set('fallback_prompt', e.target.value)} className={inputClass} placeholder="Having trouble with the embed?" />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Confirmation checkbox label (optional)</label>
        <input value={form.confirm_label} onChange={e => set('confirm_label', e.target.value)} className={inputClass} placeholder="I have completed this step" />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save config'}
      </button>
    </div>
  )
}
