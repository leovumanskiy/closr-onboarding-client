'use client'

import { useEffect, useState } from 'react'
import type { StepWithProgress } from '@/lib/journey/types'
import { CompleteButton } from './CompleteButton'
import { Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckpointConfig {
  instructions?: string
  cta_label?: string
}

interface Props {
  step: StepWithProgress
  clientId: string
  moduleSlug: string
}

function formatRemaining(ms: number) {
  const abs = Math.abs(ms)
  const days = Math.floor(abs / 86_400_000)
  const hours = Math.floor((abs % 86_400_000) / 3_600_000)
  const mins = Math.floor((abs % 3_600_000) / 60_000)
  const secs = Math.floor((abs % 60_000) / 1000)
  if (days > 0) return `${days}d ${hours}h ${mins}m ${secs}s`
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`
  return `${mins}m ${secs}s`
}

function Countdown({ dueAt }: { dueAt: string }) {
  const target = new Date(dueAt).getTime()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = target - now
  const overdue = diff < 0

  return (
    <div className={cn(
      'rounded-xl border p-5 flex items-center gap-4',
      overdue ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'
    )}>
      <div className={cn(
        'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
        overdue ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
      )}>
        {overdue ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
          {overdue ? 'Overdue by' : 'Time remaining'}
        </p>
        <p className={cn(
          'text-2xl font-bold tabular-nums mt-0.5',
          overdue ? 'text-red-600 dark:text-red-400' : 'text-foreground'
        )}>
          {formatRemaining(diff)}
        </p>
      </div>
    </div>
  )
}

export function CheckpointStep({ step, moduleSlug }: Props) {
  const config = (step.config ?? {}) as CheckpointConfig
  const isCompleted = step.status === 'completed'
  const dueAt = step.progress?.due_at ?? null

  return (
    <div className="space-y-6">
      {config.instructions && (
        <p className="text-sm text-muted-foreground whitespace-pre-line">{config.instructions}</p>
      )}

      {dueAt && !isCompleted && <Countdown dueAt={dueAt} />}

      <div className="pt-2 border-t">
        <CompleteButton
          stepId={step.id}
          isCompleted={isCompleted}
          moduleSlug={moduleSlug}
          label={config.cta_label ?? 'Mark as complete'}
        />
      </div>
    </div>
  )
}
