import { notFound, redirect } from 'next/navigation'
import { getClient } from '@/lib/auth/requireUser'
import { getJourneyState } from '@/lib/journey/engine'
import { StepCard } from '@/components/journey/StepCard'
import { ModuleCompleteConfetti } from '@/components/journey/ModuleCompleteConfetti'
import { ChevronLeft, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ moduleSlug: string }>
}

export default async function ModulePage({ params }: Props) {
  const { moduleSlug } = await params
  const client = await getClient()
  if (!client) redirect('/login')

  const journey = await getJourneyState(client.id)
  const mod = journey.modules.find(m => m.slug === decodeURIComponent(moduleSlug))
  if (!mod) notFound()

  const isJourneyComplete = journey.percentComplete === 100
  const isModuleComplete = mod.progress === 'completed'
  const backHref = isJourneyComplete ? '/onboarding' : '/dashboard'

  if (mod.progress === 'locked') {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center pt-20">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-xl font-bold mb-2">Module Locked</h1>
        <p className="text-muted-foreground">Complete all previous modules to unlock {mod.title}.</p>
        <Link href={backHref} className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  const currentStepSlug = journey.currentModule?.id === mod.id
    ? journey.currentStep?.slug
    : undefined

  // Find next module
  const nextModule = isModuleComplete
    ? journey.modules.find(m => m.order_index === mod.order_index + 1 && m.progress !== 'locked')
    : null

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {isModuleComplete && <ModuleCompleteConfetti moduleId={mod.id} />}

      <div>
        <Link href={backHref} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> {isJourneyComplete ? 'Onboarding' : 'Dashboard'}
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Module {mod.order_index}
          </span>
        </div>
        <h1 className="text-2xl font-bold">{mod.title}</h1>
        {mod.description && <p className="text-muted-foreground mt-1">{mod.description}</p>}
      </div>

      {/* Module complete banner */}
      {isModuleComplete && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                Module complete — great work! 🎉
              </p>
              <p className="text-sm text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                You&apos;ve finished every step in {mod.title}.
              </p>
              {nextModule && (
                <Link
                  href={`/modules/${nextModule.slug}`}
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  Continue to {nextModule.title}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {!nextModule && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  Back to dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {mod.steps.map(step => (
          <StepCard
            key={step.id}
            step={step}
            moduleSlug={moduleSlug}
            isActive={step.slug === currentStepSlug}
          />
        ))}
      </div>
    </div>
  )
}
