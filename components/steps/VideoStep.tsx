'use client'

import { useState } from 'react'
import type { StepWithProgress } from '@/lib/journey/types'
import type { VideoConfig } from '@/lib/journey/types'
import { CompleteButton } from './CompleteButton'
import { IframeWithLoader } from './IframeWithLoader'
import { cn } from '@/lib/utils'

interface Props {
  step: StepWithProgress
  clientId: string
  moduleSlug: string
}

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url)
    // Loom: /share/<id> → /embed/<id>
    if (u.hostname === 'www.loom.com' || u.hostname === 'loom.com') {
      return url.replace('/share/', '/embed/')
    }
    // YouTube: watch?v=<id> → /embed/<id>
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      const id = u.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`
    }
    // Vimeo: /123456 → /video/123456
    if (u.hostname === 'vimeo.com' || u.hostname === 'www.vimeo.com') {
      return `https://player.vimeo.com/video${u.pathname}`
    }
  } catch {
    // fall through
  }
  return url
}

export function VideoStep({ step, clientId, moduleSlug }: Props) {
  const config = step.config as unknown as VideoConfig
  const [watched, setWatched] = useState(step.status === 'completed')
  const isCompleted = step.status === 'completed'
  const embedUrl = toEmbedUrl(config.url)

  return (
    <div className="space-y-6">
      <IframeWithLoader
        containerClassName="border bg-black aspect-video"
        loadingLabel="Loading video…"
        src={embedUrl}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
        title={step.title}
      />

      {!isCompleted && !watched && (
        <p className="text-sm text-muted-foreground">
          Watch the video above, then mark this step complete.
        </p>
      )}

      {!isCompleted && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={watched}
              onChange={e => setWatched(e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            I have watched the video
          </label>
        </div>
      )}

      <div className="pt-2 border-t">
        <CompleteButton
          stepId={step.id}
          isCompleted={isCompleted}
          moduleSlug={moduleSlug}
          disabled={!watched && !isCompleted}
        />
      </div>
    </div>
  )
}
