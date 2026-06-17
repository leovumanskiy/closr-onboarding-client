'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { markStepComplete } from '@/lib/journey/actions'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompleteButtonProps {
  stepId: string
  isCompleted: boolean
  moduleSlug: string
  label?: string
  disabled?: boolean
}

export function CompleteButton({ stepId, isCompleted, moduleSlug, label, disabled }: CompleteButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleComplete() {
    if (isCompleted || loading) return
    setLoading(true)
    const result = await markStepComplete(stepId)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    if (result.moduleComplete) {
      if (result.nextModuleSlug) {
        toast.success('Module complete! Moving to the next one…')
        router.push(`/modules/${result.nextModuleSlug}`)
      } else {
        toast.success('Onboarding complete!')
        router.push('/dashboard')
      }
    } else {
      toast.success('Step completed!')
      router.push(`/modules/${moduleSlug}`)
    }

    router.refresh()
    setLoading(false)
  }

  if (isCompleted) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-foreground/60 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Completed
        </div>
        <button
          onClick={() => router.push(`/modules/${moduleSlug}`)}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium border border-border hover:bg-muted transition-colors"
        >
          ← Back
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleComplete}
      disabled={loading || disabled}
      className={cn(
        'flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity',
        (loading || disabled) && 'opacity-50 cursor-not-allowed'
      )}
    >
      {loading ? 'Saving…' : (label ?? 'Mark as complete')}
    </button>
  )
}
