'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Zap, ChevronDown, ChevronUp, X, ZoomIn } from 'lucide-react'
import Image from 'next/image'

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const STEPS = [
  {
    step: '1',
    heading: 'Open the sub-account',
    body: 'Log into GoHighLevel and switch into the sub-account you want connected (not the agency view).',
    image: '/ghl-guide/step1-settings.jpeg',
  },
  {
    step: '2',
    heading: 'Settings → Business Profile',
    body: 'In the sidebar, click Settings, then choose Business Profile (not Private Integrations).',
    image: '/ghl-guide/step2-private-integrations.jpeg',
  },
  {
    step: '3',
    heading: 'Scroll to the API Key section',
    body: 'On the Business Profile page, scroll down to "API Key". This is the legacy Location API Key — it auto-grants access to contacts, pipelines, and appointments without scope configuration.',
    image: null,
  },
  {
    step: '4',
    heading: 'Copy the API Key',
    body: 'Click the copy icon next to the long token. If no key is shown, click "Generate" first.',
    image: null,
  },
  {
    step: '5',
    heading: 'Find your Location ID',
    body: 'On the same Business Profile page, the Location ID is near the top. It also appears in the URL bar while inside the sub-account.',
    image: '/ghl-guide/step5-location-id.jpeg',
  },
  {
    step: '6',
    heading: 'Paste both values below and hit Save',
    body: 'Enter the API Key and Location ID in the fields below to connect your GHL sub-account.',
    image: null,
  },
]

interface Props {
  /** Controlled value — when provided, the banner becomes controlled and the internal Save button is hidden */
  value?: { apiKey: string; locationId: string }
  onChange?: (next: { apiKey: string; locationId: string }) => void
}

export function GhlConnectBanner({ value, onChange }: Props = {}) {
  const router = useRouter()
  const isControlled = value !== undefined && onChange !== undefined
  const [internalApiKey, setInternalApiKey] = useState('')
  const [internalLocationId, setInternalLocationId] = useState('')
  const apiKey = isControlled ? value!.apiKey : internalApiKey
  const locationId = isControlled ? value!.locationId : internalLocationId
  const setApiKey = (v: string) => isControlled ? onChange!({ apiKey: v, locationId }) : setInternalApiKey(v)
  const setLocationId = (v: string) => isControlled ? onChange!({ apiKey, locationId: v }) : setInternalLocationId(v)
  const [submitting, setSubmitting] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey.trim() || !locationId.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/integrations/ghl/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, locationId }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to save')
        return
      }
      toast.success('GoHighLevel connected!')
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Connect GoHighLevel</p>
            <p className="text-xs text-muted-foreground">
              Paste your GHL API key and Location ID to unlock live performance data.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGuideOpen(o => !o)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border-2 border-primary/40 bg-primary/10 px-4 py-3 text-base font-bold text-primary hover:bg-primary/15 hover:border-primary/60 transition-colors"
        >
          <span>How do I find these? Click here for step-by-step guide</span>
          {guideOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>

        {guideOpen && (
          <ol className="space-y-4 border rounded-lg bg-muted/30 p-4">
            {STEPS.map(({ step, heading, body, image }) => (
              <li key={step} className="flex gap-3 items-start">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold mt-0.5">
                  {step}
                </span>
                <div className="flex flex-1 min-w-0 gap-3 items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{heading}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
                  </div>
                  {image && (
                    <button
                      type="button"
                      onClick={() => setLightbox({ src: image, alt: heading })}
                      className="group relative shrink-0 w-36 rounded-md overflow-hidden border border-border hover:border-primary/50 transition-colors"
                    >
                      <Image
                        src={image}
                        alt={heading}
                        width={288}
                        height={192}
                        className="w-full h-auto object-contain"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                      </div>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {isControlled ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="ghl-api-key" className="text-xs font-medium text-foreground">
                Private Integration API Key
              </label>
              <input
                id="ghl-api-key"
                type="password"
                placeholder="ey…"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="ghl-location-id" className="text-xs font-medium text-foreground">
                Sub-Account Location ID
              </label>
              <input
                id="ghl-location-id"
                type="text"
                placeholder="abc123XYZ…"
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="ghl-api-key" className="text-xs font-medium text-foreground">
                Private Integration API Key
              </label>
              <input
                id="ghl-api-key"
                type="password"
                placeholder="ey…"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="ghl-location-id" className="text-xs font-medium text-foreground">
                Sub-Account Location ID
              </label>
              <input
                id="ghl-location-id"
                type="text"
                placeholder="abc123XYZ…"
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !apiKey.trim() || !locationId.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background border border-border shadow-md hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <Image
              src={lightbox.src}
              alt={lightbox.alt}
              width={1200}
              height={800}
              className="w-full h-auto rounded-xl border border-border shadow-2xl"
              priority
            />
            <p className="text-center text-xs text-white/70 mt-2">{lightbox.alt}</p>
          </div>
        </div>
      )}
    </>
  )
}
