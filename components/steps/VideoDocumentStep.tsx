'use client'

import { useState } from 'react'
import type { StepWithProgress, VideoDocumentConfig } from '@/lib/journey/types'
import { CompleteButton } from './CompleteButton'
import { IframeWithLoader } from './IframeWithLoader'
import { FileText, ExternalLink } from 'lucide-react'
import { toDocPreviewUrl } from '@/lib/docPreview'

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
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`
    }
    if (u.hostname === 'vimeo.com' || u.hostname === 'www.vimeo.com') {
      return `https://player.vimeo.com/video${u.pathname}`
    }
  } catch {
    // fall through
  }
  return url
}

interface Props {
  step: StepWithProgress
  clientId: string
  moduleSlug: string
}

interface PairProps {
  videoUrl: string
  docUrl: string
  docLabel?: string
  requireAck: boolean
  isCompleted: boolean
  watched: boolean
  acknowledged: boolean
  onWatched: (v: boolean) => void
  onAcknowledged: (v: boolean) => void
  title: string
  headingLabel?: string
}

function VideoDocumentPair({
  videoUrl, docUrl, docLabel, requireAck, isCompleted,
  watched, acknowledged, onWatched, onAcknowledged, title, headingLabel,
}: PairProps) {
  return (
    <div className="space-y-4">
      {headingLabel && (
        <h3 className="text-base font-semibold text-foreground">{headingLabel}</h3>
      )}

      <IframeWithLoader
        containerClassName="border bg-black aspect-video"
        loadingLabel="Loading video…"
        src={toEmbedUrl(videoUrl)}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
        title={title}
      />

      {!isCompleted && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={watched}
            onChange={e => onWatched(e.target.checked)}
            className="h-4 w-4 rounded accent-primary"
          />
          I have watched the video
        </label>
      )}

      {docUrl && toDocPreviewUrl(docUrl) && (
        <IframeWithLoader
          containerClassName="border bg-background"
          containerStyle={{ minHeight: 600 }}
          loadingLabel="Loading document…"
          src={toDocPreviewUrl(docUrl)!}
          style={{ width: '100%', height: 600, border: 'none', display: 'block' }}
          title={docLabel ?? title}
          allow="autoplay"
        />
      )}

      {docUrl && (
        <a
          href={docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow group"
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{docLabel ?? title}</p>
            <p className="text-xs text-muted-foreground">Click to open document</p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </a>
      )}

      {docUrl && requireAck && !isCompleted && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={e => onAcknowledged(e.target.checked)}
            className="h-4 w-4 rounded accent-primary"
          />
          I have read and understood this document
        </label>
      )}
    </div>
  )
}

export function VideoDocumentStep({ step, clientId, moduleSlug }: Props) {
  const config = step.config as unknown as VideoDocumentConfig
  const isCompleted = step.status === 'completed'

  const [watched1, setWatched1] = useState(isCompleted)
  const [ack1, setAck1] = useState(isCompleted)
  const [watched2, setWatched2] = useState(isCompleted)
  const [ack2, setAck2] = useState(isCompleted)

  const hasPair2 = !!config.video_url_2
  const hasDoc1 = !!config.doc_url
  const hasDoc2 = !!config.doc_url_2
  const requireAck1 = hasDoc1 && config.doc_require_ack !== false
  const requireAck2 = hasDoc2 && config.doc_require_ack_2 !== false

  const canComplete =
    watched1 && (!requireAck1 || ack1) &&
    (!hasPair2 || (watched2 && (!requireAck2 || ack2)))

  return (
    <div className="space-y-6">
      {config.instructions && (
        <p className="text-sm text-muted-foreground">{config.instructions}</p>
      )}

      <VideoDocumentPair
        videoUrl={config.video_url}
        docUrl={config.doc_url}
        docLabel={config.doc_label}
        requireAck={requireAck1}
        isCompleted={isCompleted}
        watched={watched1}
        acknowledged={ack1}
        onWatched={setWatched1}
        onAcknowledged={setAck1}
        title={step.title}
        headingLabel={hasPair2 ? (config.heading ?? 'Video 1') : config.heading}
      />

      {hasPair2 && (
        <>
          <div className="border-t" />
          <VideoDocumentPair
            videoUrl={config.video_url_2!}
            docUrl={config.doc_url_2 ?? ''}
            docLabel={config.doc_label_2}
            requireAck={requireAck2}
            isCompleted={isCompleted}
            watched={watched2}
            acknowledged={ack2}
            onWatched={setWatched2}
            onAcknowledged={setAck2}
            title={step.title}
            headingLabel={config.heading_2 ?? 'Video 2'}
          />
        </>
      )}

      <div className="pt-2 border-t">
        <CompleteButton
          stepId={step.id}
          isCompleted={isCompleted}
          moduleSlug={moduleSlug}
          disabled={!canComplete}
        />
      </div>
    </div>
  )
}
