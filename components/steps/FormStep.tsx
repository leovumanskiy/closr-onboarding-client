'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { StepWithProgress, FormConfig, FormField } from '@/lib/journey/types'
import { markStepComplete } from '@/lib/journey/actions'
import { submitForm } from '@/lib/journey/formActions'
import { resubmitForm } from '@/lib/journey/editActions'
import { cn } from '@/lib/utils'

interface Props {
  step: StepWithProgress
  clientId: string
  moduleSlug: string
  stepSlug: string
  initialValues?: Record<string, string | boolean> | null
}

export function FormStep({ step, clientId, moduleSlug, stepSlug, initialValues }: Props) {
  const config = step.config as unknown as FormConfig
  const router = useRouter()
  const isCompleted = step.status === 'completed'
  const [values, setValues] = useState<Record<string, string | boolean>>(
    (initialValues as Record<string, string | boolean>) ?? {}
  )
  const [submitting, setSubmitting] = useState(false)

  function setValue(name: string, value: string | boolean) {
    setValues(v => ({ ...v, [name]: value }))
  }

  function isValid() {
    return (config.fields ?? [])
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

    if (isCompleted) {
      const result = await resubmitForm({ stepId: step.id, payload: values, moduleSlug, stepSlug })
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

    const result = await submitForm({ stepId: step.id, payload: values })
    if (result.error) {
      toast.error(result.error)
      setSubmitting(false)
      return
    }

    const complete = await markStepComplete(step.id)
    if (complete.error) {
      toast.error(complete.error)
      setSubmitting(false)
      return
    }

    toast.success('Form submitted!')
    router.push(`/modules/${moduleSlug}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {config.instructions && (
        <p className="text-sm text-muted-foreground">{config.instructions}</p>
      )}

      {(config.fields ?? []).map(field => (
        <FieldInput key={field.name} field={field} value={values[field.name]} onChange={setValue} />
      ))}

      <div className="pt-2 border-t">
        <button
          type="submit"
          disabled={submitting || !isValid()}
          className={cn(
            'rounded-md px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors',
            (submitting || !isValid()) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {submitting ? 'Saving…' : isCompleted ? 'Save changes' : 'Submit'}
        </button>
      </div>
    </form>
  )
}

function FieldInput({
  field, value, onChange
}: {
  field: FormField
  value: string | boolean | undefined
  onChange: (name: string, v: string | boolean) => void
}) {
  const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          value={(value as string) ?? ''}
          onChange={e => onChange(field.name, e.target.value)}
          required={field.required}
          rows={4}
          className={inputClass}
          placeholder={field.placeholder}
        />
      ) : field.type === 'select' ? (
        <select
          value={(value as string) ?? ''}
          onChange={e => onChange(field.name, e.target.value)}
          required={field.required}
          className={inputClass}
        >
          <option value="">Select…</option>
          {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : field.type === 'checkbox' ? (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onChange(field.name, e.target.checked)}
            className="h-4 w-4 rounded accent-primary"
          />
          {field.placeholder ?? field.label}
        </label>
      ) : (
        <input
          type={field.type}
          value={(value as string) ?? ''}
          onChange={e => onChange(field.name, e.target.value)}
          required={field.required}
          className={inputClass}
          placeholder={field.placeholder}
          {...(field.type === 'number' ? { min: 1 } : {})}
          style={field.type === 'number' ? { MozAppearance: 'textfield' } as React.CSSProperties : undefined}
        />
      )}
    </div>
  )
}
