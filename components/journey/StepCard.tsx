import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, Lock, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { StepWithProgress } from '@/lib/journey/types'

interface StepCardProps {
  step: StepWithProgress
  moduleSlug: string
  isActive?: boolean
}

export function StepCard({ step, moduleSlug, isActive }: StepCardProps) {
  const isLocked = step.status === 'locked'
  const isDone = step.status === 'completed'
  const isAvailable = step.status === 'available'
  const isInProgress = step.status === 'in_progress'

  const dueAt = step.progress?.due_at
  const dueMs = dueAt ? new Date(dueAt).getTime() - Date.now() : null
  const isOverdue = !isDone && dueMs !== null && dueMs < 0
  const isApproaching = !isDone && !isOverdue && dueMs !== null && dueMs < 24 * 60 * 60 * 1000

  const card = (
    <div className={cn(
      'flex items-center gap-4 rounded-lg border bg-card px-4 py-3 transition-all duration-150',
      (isAvailable || isInProgress || isDone) && 'hover:bg-foreground/[0.03] cursor-pointer',
      isActive && 'border-foreground',
      isLocked && 'opacity-40 cursor-not-allowed',
      // Colour-coded borders
      isDone && 'border-emerald-500/30',
      isOverdue && 'border-red-500/30',
      isApproaching && 'border-amber-400/30',
    )}>
      <div className="shrink-0">
        {isDone ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : isLocked ? (
          <Lock className="h-4 w-4 text-muted-foreground" />
        ) : isInProgress ? (
          <Play className={cn(
            'h-4 w-4 fill-current',
            isOverdue ? 'text-red-500' : isApproaching ? 'text-amber-500' : 'text-muted-foreground'
          )} />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium',
          isDone && 'text-muted-foreground',
          isOverdue && 'text-red-600 dark:text-red-400',
        )}>
          {step.title}
        </p>
        {dueAt && !isDone && (
          <p className={cn(
            'text-xs mt-0.5',
            isOverdue ? 'text-red-500' : isApproaching ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
          )}>
            <Clock className="inline h-3 w-3 mr-1" />
            {isOverdue ? 'Overdue · ' : 'Due '}
            {formatDistanceToNow(new Date(dueAt), { addSuffix: true })}
          </p>
        )}
        {isDone && step.progress?.completed_at && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
            Completed {formatDistanceToNow(new Date(step.progress.completed_at), { addSuffix: true })}
          </p>
        )}
      </div>

      {isOverdue ? (
        <span className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-medium uppercase tracking-[0.1em] shrink-0">
          Overdue
        </span>
      ) : isApproaching ? (
        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium uppercase tracking-[0.1em] shrink-0">
          Due soon
        </span>
      ) : null}
    </div>
  )

  if (isLocked) return card
  return <Link href={`/modules/${moduleSlug}/${step.slug}`}>{card}</Link>
}

function Circle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
    </svg>
  )
}
