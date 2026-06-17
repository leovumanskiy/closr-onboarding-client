'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Zap, ChevronDown, ChevronUp, CheckCircle2, RefreshCw, LogOut, X, ZoomIn } from 'lucide-react'

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const STEPS = [
  {
    step: '1',
    heading: 'Open Settings',
    body: 'In GoHighLevel, make sure you are inside a sub-account (not the agency view), then click Settings in the left sidebar.',
    image: '/ghl-guide/step1-settings.jpeg',
  },
  {
    step: '2',
    heading: 'Go to Private Integrations',
    body: 'Navigate to Settings → Private Integrations, then click "Create new integration".',
    image: '/ghl-guide/step2-private-integrations.jpeg',
  },
  {
    step: '3',
    heading: 'Enable the required scopes',
    body: 'Give the integration a name (e.g. "Client Portal"). Under Scopes, turn on: Contacts (Read), Opportunities (Read), and Conversations (Read).',
    image: null,
  },
  {
    step: '4',
    heading: 'Copy your API key',
    body: 'After saving, GHL will show the generated API key once — copy it now. If you missed it, delete and recreate the integration.',
    image: null,
  },
  {
    step: '5',
    heading: 'Find your Location ID',
    body: 'Go to Settings → Business Profile. Your Location ID is shown near the top of the page — click the copy icon next to it.',
    image: '/ghl-guide/step5-location-id.jpeg',
  },
]

interface Props {
  isConnected: boolean
  locationId?: string | null
}

export function GhlSettings({ isConnected, locationId }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [newLocationId, setNewLocationId] = useState(locationId ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/ghl/disconnect', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to disconnect')
        return
      }
      toast.success('GoHighLevel disconnected')
      setEditing(false)
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey.trim() || !newLocationId.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/integrations/ghl/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, locationId: newLocationId }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to save')
        return
      }
      toast.success('GoHighLevel connection updated!')
      setEditing(false)
      setApiKey('')
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">GoHighLevel</p>
            {isConnected ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                Connected
                {locationId && <span className="font-mono">· {locationId}</span>}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">Not connected</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(e => !e)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {isConnected ? 'Reconnect' : 'Connect'}
          </button>
          {isConnected && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 border border-destructive/40 hover:border-destructive/60 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="h-3.5 w-3.5" />
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="space-y-4 border-t pt-4">
          <button
            type="button"
            onClick={() => setGuideOpen(o => !o)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border-2 border-primary/40 bg-primary/10 px-4 py-3 text-base font-bold text-primary hover:bg-primary/15 hover:border-primary/60 transition-colors"
          >
            <span>How do I find these? Click here for step-by-step guide</span>
            {guideOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {guideOpen && (
            <ol className="space-y-3 border rounded-lg bg-muted/30 p-4">
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt={heading} className="w-full h-auto object-contain" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                        </div>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="ghl-settings-api-key" className="text-xs font-medium text-foreground">
                Private Integration API Key
              </label>
              <input
                id="ghl-settings-api-key"
                type="password"
                placeholder="ey…"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="ghl-settings-location-id" className="text-xs font-medium text-foreground">
                Sub-Account Location ID
              </label>
              <input
                id="ghl-settings-location-id"
                type="text"
                placeholder="abc123XYZ…"
                value={newLocationId}
                onChange={e => setNewLocationId(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting || !apiKey.trim() || !newLocationId.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setApiKey(''); setNewLocationId(locationId ?? '') }}
                className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="w-full h-auto rounded-xl border border-border shadow-2xl"
          />
          <p className="text-center text-xs text-white/70 mt-2">{lightbox.alt}</p>
        </div>
      </div>
    )}
    </>
  )
}
