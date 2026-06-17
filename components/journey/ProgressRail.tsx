import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CheckCircle2, Lock } from 'lucide-react'
import type { ModuleWithSteps } from '@/lib/journey/types'

interface ProgressRailProps {
  modules: ModuleWithSteps[]
  currentModuleSlug?: string
}

export function ProgressRail({ modules, currentModuleSlug }: ProgressRailProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {modules.map((mod, i) => {
        const isCurrent = mod.slug === currentModuleSlug
        const isLocked = mod.progress === 'locked'
        const isDone = mod.progress === 'completed'
        const pct = mod.steps.length > 0
          ? Math.round((mod.completedCount / mod.steps.length) * 100)
          : 0

        const item = (
          <div
            className={cn(
              'flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-150',
              !isCurrent && !isLocked && 'hover:bg-foreground/[0.04]',
              isLocked && 'opacity-35 cursor-not-allowed'
            )}
          >
            {/* Step indicator */}
            <div className="shrink-0 w-7 h-7 flex items-center justify-center">
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 text-foreground" />
              ) : isLocked ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <div className="relative h-7 w-7">
                  <svg viewBox="0 0 28 28" className="h-7 w-7 -rotate-90">
                    <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" />
                    <circle
                      cx="14" cy="14" r="11" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeDasharray={`${(pct / 100) * 69.1} 69.1`}
                      strokeLinecap="round"
                      className="text-foreground transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className={cn(
                'text-sm font-medium truncate leading-tight',
                isCurrent ? 'text-foreground' : 'text-foreground/70'
              )}>
                {mod.title}
              </p>
              {!isLocked && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isDone ? 'Complete' : `${mod.completedCount}/${mod.steps.length} steps`}
                </p>
              )}
            </div>

            {isCurrent && (
              <div className="shrink-0 h-1.5 w-1.5 rounded-full bg-foreground" />
            )}
          </div>
        )

        if (isLocked) return <div key={mod.id}>{item}</div>
        return (
          <Link key={mod.id} href={`/modules/${mod.slug}`}>
            {item}
          </Link>
        )
      })}
    </div>
  )
}
