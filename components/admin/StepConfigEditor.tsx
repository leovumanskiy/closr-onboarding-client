'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateStepConfig } from '@/lib/admin/actions'
import { Check, ExternalLink, FilePen, Loader2, Video, FileText, X } from 'lucide-react'

interface VideoConfig {
  url: string
  min_watch_seconds?: number
}

interface DocumentConfig {
  url: string
  require_ack: boolean
  cta_label?: string
  instructions?: string
}

interface Props {
  stepId: string
  type: 'video' | 'document'
  config: VideoConfig | DocumentConfig | null
}

export function StepConfigEditor({ stepId, type, config }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [url, setUrl] = useState<string>((config as any)?.url ?? '')
  const [requireAck, setRequireAck] = useState<boolean>(
    type === 'document' ? ((config as DocumentConfig)?.require_ack ?? true) : false
  )
  const [instructions, setInstructions] = useState<string>(
    type === 'document' ? ((config as DocumentConfig)?.instructions ?? '') : ''
  )
  const [minWatch, setMinWatch] = useState<string>(
    type === 'video' ? String((config as VideoConfig)?.min_watch_seconds ?? '') : ''
  )

  const hasUrl = !!url

  async function handleSave() {
    if (!url.trim()) {
      toast.error('URL is required')
      return
    }
    setSaving(true)
    try {
      const newConfig: Record<string, unknown> = type === 'video'
        ? {
            url: url.trim(),
            ...(minWatch ? { min_watch_seconds: Number(minWatch) } : {}),
          }
        : {
            url: url.trim(),
            require_ack: requireAck,
            ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
          }

      const result = await updateStepConfig({ stepId, config: newConfig })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Step updated')
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setUrl((config as any)?.url ?? '')
    setRequireAck(type === 'document' ? ((config as DocumentConfig)?.require_ack ?? true) : false)
    setInstructions(type === 'document' ? ((config as DocumentConfig)?.instructions ?? '') : '')
    setMinWatch(type === 'video' ? String((config as VideoConfig)?.min_watch_seconds ?? '') : '')
    setEditing(false)
  }

  const Icon = type === 'video' ? Video : FileText

  if (!editing) {
    return (
      <div className="flex items-center gap-2 mt-1.5">
        {hasUrl ? (
          <>
            <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground truncate max-w-[220px]" title={url}>
              {url}
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </>
        ) : (
          <>
            <Icon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-xs text-muted-foreground/50 italic">No {type === 'video' ? 'video' : 'document'} URL set</span>
          </>
        )}
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-md px-2 py-0.5 transition-colors"
        >
          <FilePen className="h-3 w-3" />
          {hasUrl ? 'Edit' : 'Set'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">
          {type === 'video' ? 'Video URL' : 'Document URL (PDF or link)'}
        </label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder={type === 'video' ? 'https://youtube.com/embed/...' : 'https://...'}
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        {type === 'video' && (
          <p className="text-[11px] text-muted-foreground">
            Use an embed URL (YouTube: youtube.com/embed/ID, Vimeo: player.vimeo.com/video/ID)
          </p>
        )}
      </div>

      {type === 'video' && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Min. watch time (seconds, optional)</label>
          <input
            type="number"
            value={minWatch}
            onChange={e => setMinWatch(e.target.value)}
            placeholder="e.g. 60"
            min={0}
            className="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {type === 'document' && (
        <>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Instructions (optional)</label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="What should the client do with this document?"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requireAck}
              onChange={e => setRequireAck(e.target.checked)}
              className="rounded border-input accent-primary"
            />
            <span className="text-xs text-foreground">Require client to acknowledge they&apos;ve read it</span>
          </label>
        </>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  )
}
