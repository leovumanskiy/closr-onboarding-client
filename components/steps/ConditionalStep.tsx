'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { StepWithProgress, ConditionalConfig, FormField } from '@/lib/journey/types'
import { submitForm } from '@/lib/journey/formActions'
import { resubmitForm } from '@/lib/journey/editActions'
import { markStepComplete } from '@/lib/journey/actions'
import { cn } from '@/lib/utils'
import { GhlConnectBanner } from '@/components/integrations/GhlConnectBanner'

interface Props {
  step: StepWithProgress
  clientId: string
  moduleSlug: string
  stepSlug: string
  initialSubmission?: Record<string, unknown> | null
}

export function ConditionalStep({ step, clientId, moduleSlug, stepSlug, initialSubmission }: Props) {
  const config = step.config as unknown as ConditionalConfig
  const router = useRouter()
  const isCompleted = step.status === 'completed'

  // Pre-fill from prior submission when revisiting
  const priorAnswer = initialSubmission
    ? (initialSubmission[config.question.field] as boolean | null) ?? null
    : null
  const priorValues = initialSubmission
    ? Object.fromEntries(
        Object.entries(initialSubmission).filter(([k]) => k !== config.question.field)
      ) as Record<string, string | boolean>
    : {}

  const [answer, setAnswer] = useState<boolean | null>(priorAnswer)
  const [values, setValues] = useState<Record<string, string | boolean>>(priorValues)
  const [submitting, setSubmitting] = useState(false)
  const [ghl, setGhl] = useState<{ apiKey: string; locationId: string }>({ apiKey: '', locationId: '' })

  function setValue(name: string, value: string | boolean) {
    setValues(v => ({ ...v, [name]: value }))
  }

  const activeBranch = answer === null ? null
    : config.branches.find(b => {
        const cond = b.when[config.question.field]
        return cond === answer
      }) ?? config.branches[config.branches.length - 1]

  function isValid() {
    if (answer === null) return false
    if (!activeBranch) return false
    if (config.question.field === 'has_ghl' && answer === true) {
      // already saved on a previous visit — allow continuing without re-entering
      if (isCompleted) return true
      return ghl.apiKey.trim().length > 0 && ghl.locationId.trim().length > 0
    }
    return activeBranch.content.fields
      .filter(f => f.required)
      .every(f => {
        const v = values[f.name]
        if (f.type === 'checkbox') return v === true
        return typeof v === 'string' && v.trim().length > 0
      })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid()) return
    setSubmitting(true)

    // Update client has_ghl/has_fb_ads flag via API (runs on first submit and on edits)
    if (config.question.field === 'has_ghl' || config.question.field === 'has_fb_ads') {
      await fetch('/api/clients/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [config.question.field]: answer }),
      })
    }

    const payload = { [config.question.field]: answer, ...values }
    const isGhlYesBranch = config.question.field === 'has_ghl' && answer === true

    // GHL "yes" branch: save credentials to clients table, no form submission record
    if (isGhlYesBranch) {
      if (ghl.apiKey.trim() && ghl.locationId.trim()) {
        const res = await fetch('/api/integrations/ghl/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: ghl.apiKey.trim(), locationId: ghl.locationId.trim() }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast.error(data.error ?? 'Failed to save GHL credentials')
          setSubmitting(false)
          return
        }
      } else if (!isCompleted) {
        toast.error('Enter your GHL API key and Location ID')
        setSubmitting(false)
        return
      }

      if (!isCompleted) {
        const complete = await markStepComplete(step.id)
        if (complete.error) {
          toast.error(complete.error)
          setSubmitting(false)
          return
        }
      }

      toast.success(isCompleted ? 'Changes saved!' : 'GoHighLevel connected!')
      router.push(`/modules/${moduleSlug}`)
      router.refresh()
      return
    }

    if (isCompleted) {
      const result = await resubmitForm({ stepId: step.id, payload, moduleSlug, stepSlug })
      if (result.error) {
        toast.error(result.error)
        setSubmitting(false)
        return
      }
      toast.success('Changes saved!')
      router.push(`/modules/${moduleSlug}`)
      router.refresh()
      return
    }

    const submitted = await submitForm({ stepId: step.id, payload })
    if (submitted.error) {
      toast.error(submitted.error)
      setSubmitting(false)
      return
    }

    const complete = await markStepComplete(step.id)
    if (complete.error) {
      toast.error(complete.error)
      setSubmitting(false)
      return
    }

    toast.success('Step completed!')
    router.push(`/modules/${moduleSlug}`)
    router.refresh()
  }

  const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question */}
      <div className="space-y-2">
        <p className="font-medium text-sm">{config.question.label}</p>
        <div className="flex gap-3">
          {[true, false].map(val => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setAnswer(val)}
              className={cn(
                'flex-1 rounded-lg border py-3 text-sm font-medium transition-colors',
                answer === val
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-muted'
              )}
            >
              {val ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      {/* Branch content */}
      {activeBranch && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold">{activeBranch.content.heading}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{activeBranch.content.description}</p>
          </div>

          {config.question.field === 'has_ghl' && answer === true ? (
            <GhlConnectBanner value={ghl} onChange={setGhl} />
          ) : (
            activeBranch.content.fields.map((field: FormField) => (
              <div key={field.name} className="space-y-1">
                <label className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea rows={3} className={inputClass}
                    value={(values[field.name] as string) ?? ''}
                    onChange={e => setValue(field.name, e.target.value)}
                    required={field.required}
                  />
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={Boolean(values[field.name])}
                      onChange={e => setValue(field.name, e.target.checked)}
                      className="h-4 w-4 rounded accent-primary" />
                    {field.label}
                  </label>
                ) : (
                  <input type={field.type ?? 'text'} className={inputClass}
                    value={(values[field.name] as string) ?? ''}
                    onChange={e => setValue(field.name, e.target.value)}
                    required={field.required}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}

      <div className="pt-2 border-t">
        <button
          type="submit"
          disabled={!isValid() || submitting}
          className={cn(
            'rounded-md px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors',
            (!isValid() || submitting) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {submitting ? 'Saving…' : isCompleted ? 'Save changes' : 'Continue'}
        </button>
      </div>
    </form>
  )
}
