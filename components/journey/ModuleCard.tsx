import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CheckCircle2, ChevronRight, Lock, AlertTriangle, Clock } from 'lucide-react'
import type { ModuleWithSteps } from '@/lib/journey/types'

interface ModuleCardProps {
  module: ModuleWithSteps
  isCurrent?: boolean
}

export function ModuleCard({ module: mod, isCurrent }: ModuleCardProps) {
  const isLocked = mod.progress === 'locked'
  const isDone = mod.progress === 'completed'
  const pct = mod.steps.length > 0
    ? Math.round((mod.completedCount / mod.steps.length) * 100)
    : 0

  const nowMs = Date.now()
  const TWENTY_FOUR_H = 24 * 60 * 60 * 1000
  const isOverdue = !isDone && mod.steps.some(
    s => s.status !== 'completed' && s.progress?.due_at && new Date(s.progress.due_at).getTime() < nowMs
  )
  const isApproaching = !isDone && !isOverdue && mod.steps.some(s => {
    if (s.status === 'completed' || !s.progress?.due_at) return false
    const diff = new Date(s.progress.due_at).getTime() - nowMs
    return diff >= 0 && diff < TWENTY_FOUR_H
  })

  const card = (
    <div className={cn(
      'group relative rounded-xl border bg-card p-5 transition-all duration-150',
      !isLocked && 'hover:bg-foreground/[0.03] cursor-pointer',
      isLocked && 'opacity-40 cursor-not-allowed',
      // Colour-coded border by status
      isDone && 'border-emerald-500/40',
      isOverdue && 'border-red-500/40',
      !isOverdue && isApproaching && 'border-amber-400/40',
      !isDone && !isOverdue && !isApproaching && isCurrent && !isLocked && 'border-foreground/40',
      !isDone && !isOverdue && !isApproaching && !isCurrent && !isLocked && 'border-border',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">
              Module {mod.order_index}
            </span>

            {/* Status badge */}
            {isDone && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                <CheckCircle2 className="h-3 w-3" /> Complete
              </span>
            )}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                <AlertTriangle className="h-3 w-3" /> Overdue
              </span>
            )}
            {!isOverdue && isApproaching && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                <Clock className="h-3 w-3" /> Due soon
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}
            {isCurrent && !isDone && !isOverdue && !isApproaching && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground bg-foreground/10 border border-foreground/20 rounded-full px-2 py-0.5">
                <Clock className="h-3 w-3" /> In Progress
              </span>
            )}
          </div>
          <h3 className="font-display font-bold text-[15px] leading-snug tracking-tight text-foreground">{mod.title}</h3>
          {mod.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{mod.description}</p>
          )}
        </div>
        {!isLocked && (
          <ChevronRight className={cn(
            'h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform',
            !isLocked && 'group-hover:translate-x-0.5'
          )} />
        )}
      </div>

      {!isLocked && (
        <div className="mt-4 pt-4 border-t border-border/60">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-1.5">
            <span>{mod.completedCount} of {mod.steps.length} steps</span>
            <span className="font-medium tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isDone ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : isApproaching ? 'bg-amber-400' : 'bg-foreground/40'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )

  if (isLocked) return card
  return <Link href={`/modules/${mod.slug}`}>{card}</Link>
}
