import { notFound, redirect } from 'next/navigation'
import { getClient } from '@/lib/auth/requireUser'
import { getJourneyState } from '@/lib/journey/engine'
import { startStep } from '@/lib/journey/actions'
import { getLatestFormSubmission, getStepUploads, getStepBooking } from '@/lib/journey/submissions'
import { StepRenderer } from '@/components/steps/StepRenderer'
import { ChevronLeft, Pencil, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ moduleSlug: string; stepSlug: string }>
}

export default async function StepPage({ params }: Props) {
  const { moduleSlug, stepSlug } = await params
  const client = await getClient()
  if (!client) redirect('/login')

  const journey = await getJourneyState(client.id)
  const mod = journey.modules.find(m => m.slug === decodeURIComponent(moduleSlug))
  if (!mod) notFound()

  const step = mod.steps.find(s => s.slug === decodeURIComponent(stepSlug))
  if (!step) notFound()

  if (step.status === 'locked') {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center pt-20">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-xl font-bold mb-2">Step Locked</h1>
        <p className="text-muted-foreground">Complete the previous steps to unlock this one.</p>
        <Link href={`/modules/${moduleSlug}`} className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to module
        </Link>
      </div>
    )
  }

  // Auto-start step when first opened
  if (step.status === 'available') {
    await startStep(step.id)
  }

  const isCompleted = step.status === 'completed'
  const dueAt = step.progress?.due_at
  const now = new Date()
  const dueDate = dueAt ? new Date(dueAt) : null
  const isOverdue = dueDate && !isCompleted && dueDate < now
  const hoursLeft = dueDate && !isCompleted ? (dueDate.getTime() - now.getTime()) / 36e5 : null
  const isApproaching = hoursLeft !== null && hoursLeft > 0 && hoursLeft < 24

  // For completed steps, fetch prior submissions so step components can pre-fill
  const editableTypes = ['form', 'conditional', 'upload', 'booking']
  const [initialSubmission, existingUploads, existingBooking] = await Promise.all([
    isCompleted && (step.type === 'form' || step.type === 'conditional')
      ? getLatestFormSubmission(client.id, step.id)
      : Promise.resolve(null),
    isCompleted && step.type === 'upload'
      ? getStepUploads(client.id, step.id)
      : Promise.resolve([]),
    isCompleted && step.type === 'booking'
      ? getStepBooking(client.id, step.id)
      : Promise.resolve(null),
  ])

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href={`/modules/${moduleSlug}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> {mod.title}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Step {step.order_index}
            </p>
            <h1 className="text-xl font-bold">{step.title}</h1>
          </div>

          {isCompleted && (
            <span className="shrink-0 text-[10px] font-medium text-foreground/60 bg-muted border border-border px-3 py-1 rounded-full uppercase tracking-[0.1em]">
              Completed
            </span>
          )}
        </div>

        {dueDate && !isCompleted && (
          <p className={cn(
            'text-xs mt-2',
            isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
          )}>
            {isOverdue ? '⚠ Overdue · ' : '⏱ Due '}
            {formatDistanceToNow(dueDate, { addSuffix: true })}
          </p>
        )}

        {isCompleted && editableTypes.includes(step.type) && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <Pencil className="h-3 w-3" />
            Your previous answers are loaded — edit and save to update them.
          </p>
        )}
      </div>

      {isApproaching && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Deadline approaching</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
              This step is due {formatDistanceToNow(dueDate!, { addSuffix: true })}. Complete it soon to stay on track.
            </p>
          </div>
        </div>
      )}

      <StepRenderer
        step={step}
        clientId={client.id}
        moduleSlug={moduleSlug}
        stepSlug={stepSlug}
        initialSubmission={initialSubmission}
        existingUploads={existingUploads}
        existingBooking={existingBooking}
      />
    </div>
  )
}
