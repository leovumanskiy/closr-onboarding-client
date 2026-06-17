import { getClient } from '@/lib/auth/requireUser'
import { getJourneyState } from '@/lib/journey/engine'
import { ModuleCard } from '@/components/journey/ModuleCard'
import { LivePerformanceDashboard } from '@/components/dashboard/LivePerformanceDashboard'
import { redirect } from 'next/navigation'
import { initClientJourney } from '@/lib/journey/engine'
import { ArrowRight, CheckCircle2, Layers, Zap } from 'lucide-react'

export default async function DashboardPage() {
  const client = await getClient()
  if (!client) redirect('/login')

  const journey = await getJourneyState(client.id)

  const needsInit = journey.totalSteps > 0 && journey.modules.every(m => m.progress === 'locked')
  if (needsInit) {
    await initClientJourney(client.id)
    redirect('/dashboard')
  }

  const isComplete = journey.percentComplete === 100

  if (isComplete) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <LivePerformanceDashboard
          clientId={client.id}
          businessName={client.business_name}
        />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">

      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome, {client.business_name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          You&apos;re {journey.percentComplete}% through your onboarding — keep it up.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Modules</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">{journey.modules.filter(m => m.progress !== 'locked').length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">of {journey.modules.length} unlocked</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Steps done</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">{journey.completedSteps}</p>
          <p className="text-xs text-muted-foreground mt-0.5">of {journey.totalSteps} total</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Progress</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">{journey.percentComplete}%</p>
          <div className="mt-2 h-px rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-500"
              style={{ width: `${journey.percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Up next banner */}
      {journey.currentStep && journey.currentModule && (
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-6">
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded-full px-3 py-1 mb-3 uppercase tracking-[0.12em]">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
              Up next
            </span>
            <h2 className="font-display font-bold text-xl tracking-tight text-foreground mb-0.5">{journey.currentStep.title}</h2>
            <p className="text-sm text-muted-foreground mb-5">{journey.currentModule.title}</p>
            <a
              href={`/modules/${journey.currentModule.slug}/${journey.currentStep.slug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {/* Modules grid */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">All Modules</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {journey.modules.map(mod => (
            <ModuleCard
              key={mod.id}
              module={mod}
              isCurrent={mod.id === journey.currentModule?.id}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
