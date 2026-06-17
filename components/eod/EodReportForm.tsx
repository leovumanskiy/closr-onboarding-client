'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'

interface Props {
  initialDate: string
  initialBooked: number | null
  initialShowed: number | null
}

export function EodReportForm({ initialDate, initialBooked, initialShowed }: Props) {
  const router = useRouter()
  const [date, setDate] = useState(initialDate)
  const [booked, setBooked] = useState<string>(initialBooked != null ? String(initialBooked) : '')
  const [showed, setShowed] = useState<string>(initialShowed != null ? String(initialShowed) : '')
  const [submitting, setSubmitting] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const bookedNum = Number(booked)
  const showedNum = Number(showed)
  const invalid =
    booked === '' ||
    showed === '' ||
    !Number.isInteger(bookedNum) ||
    !Number.isInteger(showedNum) ||
    bookedNum < 0 ||
    showedNum < 0 ||
    showedNum > bookedNum

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (invalid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/eod/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_date: date,
          calls_booked: bookedNum,
          calls_showed: showedNum,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Failed to save')
      setSavedAt(Date.now())
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const rate = bookedNum > 0 && Number.isFinite(showedNum) ? Math.round((showedNum / bookedNum) * 1000) / 10 : null

  return (
    <form onSubmit={onSubmit} className="rounded-xl border bg-card p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Log today&apos;s numbers</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          We use these to compute your show rate on the Performance dashboard. Fill the Google Form above as usual, then enter the same two numbers here.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</span>
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Calls booked</span>
          <input
            type="number"
            min={0}
            step={1}
            value={booked}
            onChange={e => setBooked(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Calls showed</span>
          <input
            type="number"
            min={0}
            step={1}
            value={showed}
            onChange={e => setShowed(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {rate != null ? (
            <span>Show rate: <span className="font-semibold text-foreground tabular-nums">{rate}%</span></span>
          ) : (
            <span>Enter both numbers to preview show rate</span>
          )}
        </div>
        <button
          type="submit"
          disabled={invalid || submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : savedAt ? <Check className="h-4 w-4" /> : null}
          {savedAt ? 'Saved' : 'Save report'}
        </button>
      </div>

      {showedNum > bookedNum && booked !== '' && showed !== '' && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Calls showed cannot exceed calls booked.</p>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  )
}
