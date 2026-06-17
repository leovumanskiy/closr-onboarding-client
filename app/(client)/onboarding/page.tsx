import { getClient } from '@/lib/auth/requireUser'
import { getJourneyState } from '@/lib/journey/engine'
import { ModuleCard } from '@/components/journey/ModuleCard'
import { redirect } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

export default async function OnboardingPage() {
  const client = await getClient()
  if (!client) redirect('/login')

  const journey = await getJourneyState(client.id)

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-foreground/40 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {journey.percentComplete === 100
              ? 'All modules complete.'
              : `${journey.completedSteps} of ${journey.totalSteps} steps complete.`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {journey.modules.map(mod => (
          <ModuleCard key={mod.id} module={mod} isCurrent={false} />
        ))}
      </div>
    </div>
  )
}
