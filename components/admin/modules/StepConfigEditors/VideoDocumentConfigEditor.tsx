'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateStepConfig } from '@/lib/admin/actions'

interface Props {
  stepId: string
  config: {
    video_url?: string
    min_watch_seconds?: number
    doc_url?: string
    doc_label?: string
    doc_require_ack?: boolean
    instructions?: string
    video_url_2?: string
    doc_url_2?: string
    doc_label_2?: string
    doc_require_ack_2?: boolean
  }
}

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const sectionClass = 'space-y-4 rounded-lg border p-4'

export function VideoDocumentConfigEditor({ stepId, config }: Props) {
  const [form, setForm] = useState({
    video_url: config.video_url ?? '',
    min_watch_seconds: String(config.min_watch_seconds ?? 0),
    doc_url: config.doc_url ?? '',
    doc_label: config.doc_label ?? '',
    doc_require_ack: config.doc_require_ack !== false,
    instructions: config.instructions ?? '',
    video_url_2: config.video_url_2 ?? '',
    doc_url_2: config.doc_url_2 ?? '',
    doc_label_2: config.doc_label_2 ?? '',
    doc_require_ack_2: config.doc_require_ack_2 !== false,
  })
  const [saving, setSaving] = useState(false)

  function set(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    const res = await updateStepConfig({
      stepId,
      config: {
        video_url: form.video_url,
        min_watch_seconds: Number(form.min_watch_seconds),
        doc_url: form.doc_url,
        doc_label: form.doc_label || undefined,
        doc_require_ack: form.doc_require_ack,
        instructions: form.instructions || undefined,
        ...(form.video_url_2 ? {
          video_url_2: form.video_url_2,
          doc_url_2: form.doc_url_2 || undefined,
          doc_label_2: form.doc_label_2 || undefined,
          doc_require_ack_2: form.doc_require_ack_2,
        } : {}),
      },
    })
    setSaving(false)
    if (res.error) { toast.error(res.error); return }
    toast.success('Config saved')
  }

  return (
    <div className="space-y-5">
      <div className={sectionClass}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Part 1</p>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Video URL (Loom / YouTube / Vimeo)</label>
          <input value={form.video_url} onChange={e => set('video_url', e.target.value)} className={inputClass} placeholder="https://loom.com/share/..." />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Min watch time (seconds)</label>
          <input type="number" min={0} value={form.min_watch_seconds} onChange={e => set('min_watch_seconds', e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Document URL</label>
          <input value={form.doc_url} onChange={e => set('doc_url', e.target.value)} className={inputClass} placeholder="/docs/file.pdf or https://..." />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Document label (optional)</label>
          <input value={form.doc_label} onChange={e => set('doc_label', e.target.value)} className={inputClass} placeholder="Leave blank to use step title" />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.doc_require_ack} onChange={e => set('doc_require_ack', e.target.checked)} className="h-4 w-4 rounded" />
          Require document acknowledgement
        </label>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Instructions (optional)</label>
          <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)} className={inputClass} rows={2} />
        </div>
      </div>

      <div className={sectionClass}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Part 2 <span className="normal-case font-normal">(optional — leave blank to hide)</span></p>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Video URL</label>
          <input value={form.video_url_2} onChange={e => set('video_url_2', e.target.value)} className={inputClass} placeholder="https://loom.com/share/..." />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Document URL</label>
          <input value={form.doc_url_2} onChange={e => set('doc_url_2', e.target.value)} className={inputClass} placeholder="/docs/file.pdf or https://..." />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Document label (optional)</label>
          <input value={form.doc_label_2} onChange={e => set('doc_label_2', e.target.value)} className={inputClass} placeholder="Leave blank to use step title" />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.doc_require_ack_2} onChange={e => set('doc_require_ack_2', e.target.checked)} className="h-4 w-4 rounded" />
          Require document acknowledgement
        </label>
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
