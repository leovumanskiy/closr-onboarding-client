'use client'

import { useState, type CSSProperties, type IframeHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props extends Omit<IframeHTMLAttributes<HTMLIFrameElement>, 'onLoad'> {
  containerClassName?: string
  containerStyle?: CSSProperties
  loadingLabel?: string
  rounded?: boolean
}

export function IframeWithLoader({
  containerClassName,
  containerStyle,
  loadingLabel = 'Loading…',
  rounded = true,
  className,
  style,
  ...iframeProps
}: Props) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className={cn('relative', rounded && 'rounded-xl overflow-hidden', containerClassName)}
      style={containerStyle}
    >
      {!loaded && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm z-10"
          aria-live="polite"
        >
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          <p className="text-xs text-muted-foreground">{loadingLabel}</p>
        </div>
      )}
      <iframe
        {...iframeProps}
        className={className}
        style={style}
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}
