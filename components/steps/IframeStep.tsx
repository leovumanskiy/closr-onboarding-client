'use client'

import { useState, useEffect } from 'react'
import type { StepWithProgress, IframeConfig } from '@/lib/journey/types'
import { CompleteButton } from './CompleteButton'
import { Copy, ExternalLink } from 'lucide-react'

interface Props {
  step: StepWithProgress
  clientId: string
  moduleSlug: string
}

export function IframeStep({ step, clientId, moduleSlug }: Props) {
  const config = step.config as unknown as IframeConfig
  const isCompleted = step.status === 'completed'
  const [confirmed, setConfirmed] = useState(isCompleted)
  const height = config.height ?? 600

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

  function toEmbedUrl(url: string): string {
    try {
      const u = new URL(url)
      if (u.hostname === 'www.loom.com' || u.hostname === 'loom.com') {
        return url.replace('/share/', '/embed/')
      }
      if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
        const id = u.searchParams.get('v')
        if (id) return `https://www.youtube.com/embed/${id}`
      }
      if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`
      if (u.hostname.endsWith('vimeo.com')) return `https://player.vimeo.com/video${u.pathname}`
    } catch { /* fall through */ }
    return url
  }

  return (
    <div className="space-y-5">
      {config.instructions && (
        <p className="text-sm text-muted-foreground">{config.instructions}</p>
      )}

      {config.make_copy_url && (
        <a
          href={config.make_copy_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Copy className="h-4 w-4" />
          {config.make_copy_label ?? 'Make a Copy'}
        </a>
      )}

      {config.intro_video_url && (
        <div className="space-y-2">
          {config.intro_video_label && (
            <h3 className="text-base font-semibold text-foreground">{config.intro_video_label}</h3>
          )}
          <div className="rounded-xl overflow-hidden border bg-black aspect-video">
            <iframe
              src={toEmbedUrl(config.intro_video_url)}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              title={`${step.title} walkthrough`}
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-background" style={{ minHeight: height }}>
        <iframe
          id={config.url ? config.url.split('?')[0].split('/').filter(Boolean).pop() : undefined}
          src={config.url}
          style={{ width: '100%', minHeight: height, border: 'none', display: 'block', borderRadius: 'inherit' }}
          title={step.title}
          allow="camera; microphone"
          scrolling="no"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-medium">{config.fallback_prompt ?? 'Having trouble with the embed?'}</p>
        <a
          href={config.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity sm:ml-auto"
        >
          <ExternalLink className="h-4 w-4" />
          Open it here
        </a>
      </div>

      {!isCompleted && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="h-4 w-4 rounded accent-primary"
          />
          {config.confirm_label ?? 'I have completed this step'}
        </label>
      )}

      <div className="pt-2 border-t">
        <CompleteButton
          stepId={step.id}
          isCompleted={isCompleted}
          moduleSlug={moduleSlug}
          disabled={!confirmed}
        />
      </div>
    </div>
  )
}
