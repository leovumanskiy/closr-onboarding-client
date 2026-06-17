'use client'

import { useState } from 'react'
import type { StepWithProgress, DocumentConfig } from '@/lib/journey/types'
import { CompleteButton } from './CompleteButton'
import { IframeWithLoader } from './IframeWithLoader'
import { FileText, ExternalLink } from 'lucide-react'
import { toDocPreviewUrl } from '@/lib/docPreview'

interface Props {
  step: StepWithProgress
  clientId: string
  moduleSlug: string
}

export function DocumentStep({ step, clientId, moduleSlug }: Props) {
  const config = step.config as unknown as DocumentConfig
  const [acknowledged, setAcknowledged] = useState(step.status === 'completed')
  const isCompleted = step.status === 'completed'
  const previewUrl = config.disable_preview ? null : toDocPreviewUrl(config.url)
  const previewHeight = config.preview_height ?? 720

  return (
    <div className="space-y-6">
      {config.instructions && (
        <p className="text-sm text-muted-foreground">{config.instructions}</p>
      )}

      {previewUrl && (
        <IframeWithLoader
          containerClassName="border bg-background"
          containerStyle={{ minHeight: previewHeight }}
          loadingLabel="Loading document…"
          src={previewUrl}
          style={{ width: '100%', height: previewHeight, border: 'none', display: 'block' }}
          title={step.title}
          allow="autoplay"
        />
      )}

      <a
        href={config.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow group"
      >
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{step.title}</p>
          <p className="text-xs text-muted-foreground">Click to open document</p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </a>

      {config.require_ack && !isCompleted && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={e => setAcknowledged(e.target.checked)}
            className="h-4 w-4 rounded accent-primary"
          />
          {config.cta_label ?? 'I have read and understood this document'}
        </label>
      )}

      <div className="pt-2 border-t">
        <CompleteButton
          stepId={step.id}
          isCompleted={isCompleted}
          moduleSlug={moduleSlug}
          disabled={config.require_ack && !acknowledged}
        />
      </div>
    </div>
  )
}
