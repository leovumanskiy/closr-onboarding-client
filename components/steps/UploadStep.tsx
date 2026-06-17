'use client'

import { useEffect, useState } from 'react'
import type { StepWithProgress, UploadConfig } from '@/lib/journey/types'
import { Loader2 } from 'lucide-react'
import { CompleteButton } from './CompleteButton'

interface Props {
  step: StepWithProgress
  clientId: string
  moduleSlug: string
  stepSlug: string
}

export function UploadStep({ step, moduleSlug }: Props) {
  const config = step.config as unknown as UploadConfig
  const isCompleted = step.status === 'completed'
  const [embedLoaded, setEmbedLoaded] = useState(false)

  useEffect(() => {
    if (!config.embed_script_url) return
    const existing = document.querySelector(`script[src="${config.embed_script_url}"]`)
    if (existing) return
    const script = document.createElement('script')
    script.src = config.embed_script_url
    script.async = true
    document.body.appendChild(script)
    return () => { script.remove() }
  }, [config.embed_script_url])

  const embedHeight = config.embed_height ?? 600
  const embedIframeId = config.embed_url
    ? config.embed_url.split('?')[0].split('/').filter(Boolean).pop()
    : undefined

  return (
    <div className="space-y-5">
      {config.label && <p className="text-sm text-muted-foreground">{config.label}</p>}
      {config.instructions && <p className="text-sm text-muted-foreground">{config.instructions}</p>}

      {config.embed_url && (
        <div className="space-y-2">
          {config.embed_label && (
            <p className="text-sm font-medium">{config.embed_label}</p>
          )}
          <div className="relative rounded-xl border bg-background" style={{ minHeight: embedHeight }}>
            {!embedLoaded && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background z-10 rounded-xl"
                aria-live="polite"
              >
                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                <p className="text-xs text-muted-foreground">Loading form…</p>
              </div>
            )}
            <iframe
              id={embedIframeId}
              src={config.embed_url}
              style={{ width: '100%', minHeight: embedHeight, border: 'none', display: 'block', borderRadius: 'inherit' }}
              title={`${step.title} form`}
              scrolling="no"
              onLoad={() => setEmbedLoaded(true)}
            />
          </div>
        </div>
      )}

      <div className="pt-2 border-t">
        <CompleteButton
          stepId={step.id}
          isCompleted={isCompleted}
          moduleSlug={moduleSlug}
        />
      </div>
    </div>
  )
}
