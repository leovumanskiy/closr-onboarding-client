'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { StepWithProgress, BookingConfig } from '@/lib/journey/types'
import type { ExistingBooking } from '@/lib/journey/submissions'
import { markStepComplete } from '@/lib/journey/actions'
import { Calendar, CheckCircle2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  step: StepWithProgress
  clientId: string
  moduleSlug: string
  existingBooking?: ExistingBooking | null
}

export function BookingStep({ step, clientId, moduleSlug, existingBooking }: Props) {
  const config = step.config as unknown as BookingConfig
  const router = useRouter()
  const isCompleted = step.status === 'completed'
  const [booked, setBooked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [date, setDate] = useState('')

  const configUrl = config.calendar_url && config.calendar_url !== '${CALENDLY_URL}' ? config.calendar_url : ''
  const calendarUrl = configUrl || process.env.NEXT_PUBLIC_CALENDLY_URL || config.calendar_url

  async function handleConfirm() {
    if (!booked) return
    setSubmitting(true)

    // Save booking record
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepId: step.id, scheduledFor: date || null, callType: config.call_type }),
    })

    if (!res.ok) {
      toast.error('Failed to save booking')
      setSubmitting(false)
      return
    }

    const result = await markStepComplete(step.id)
    if (result.error) {
      toast.error(result.error)
      setSubmitting(false)
      return
    }

    toast.success('Call booked!')
    router.push(`/modules/${moduleSlug}`)
    router.refresh()
  }

  if (isCompleted) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-5 flex items-start gap-4">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Call booked</p>
            {existingBooking?.scheduled_for ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Scheduled {formatDistanceToNow(new Date(existingBooking.scheduled_for), { addSuffix: true })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Booked {existingBooking?.created_at
                  ? formatDistanceToNow(new Date(existingBooking.created_at), { addSuffix: true })
                  : ''}
              </p>
            )}
          </div>
        </div>

        {calendarUrl && calendarUrl !== '${CALENDLY_URL}' && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Reschedule or book again
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {config.description && (
        <p className="text-sm text-muted-foreground">{config.description}</p>
      )}

      {/* Calendar embed placeholder */}
      {calendarUrl && calendarUrl !== '${CALENDLY_URL}' ? (
        <div className="space-y-3">
          <div className="rounded-xl border overflow-hidden h-[760px] max-h-[80vh]">
            <iframe
              src={calendarUrl}
              className="w-full h-full block"
              title="Book a call"
              loading="lazy"
            />
          </div>
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Having trouble? Open the calendar in a new tab
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : (
        <div className="rounded-xl border bg-muted/30 p-8 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Calendar booking</p>
          <p className="text-xs text-muted-foreground mb-4">
            Set CALENDLY_URL in environment to embed your booking widget.
          </p>
          <div className="space-y-1">
            <p className="text-xs font-medium text-left">Date & time (optional)</p>
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={booked}
          onChange={e => setBooked(e.target.checked)}
          className="h-4 w-4 rounded accent-primary"
        />
        I have booked my {config.duration_min}-minute {config.call_type.replace('_', ' ')} call
      </label>

      <div className="pt-2 border-t">
        <button
          onClick={handleConfirm}
          disabled={!booked || submitting}
          className={cn(
            'rounded-lg px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 transition-opacity',
            (!booked || submitting) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {submitting ? 'Saving…' : 'Confirm booking'}
        </button>
      </div>
    </div>
  )
}
