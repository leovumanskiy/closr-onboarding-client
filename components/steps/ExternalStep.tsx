import type { StepWithProgress, ExternalConfig } from '@/lib/journey/types'
import { CompleteButton } from './CompleteButton'
import { getGHLData, isGHLConnected } from '@/lib/integrations/ghl'
import { GhlConnectBanner } from '@/components/integrations/GhlConnectBanner'
import { TrendingUp } from 'lucide-react'

interface Props {
  step: StepWithProgress
  clientId: string
  moduleSlug: string
}

export async function ExternalStep({ step, clientId, moduleSlug }: Props) {
  const config = step.config as unknown as ExternalConfig

  // Use the service-role helper that already reads `ghl_access_token`, so the
  // user-scoped grant on `public.clients` doesn't need access to that column.
  const isConnected = await isGHLConnected(clientId)

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <GhlConnectBanner />
      </div>
    )
  }

  const data = await getGHLData(clientId, config.metric)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">{config.label}</p>
            <p className="text-xs text-muted-foreground">Powered by {config.provider.toUpperCase()}</p>
          </div>
        </div>

        {data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold mt-0.5">{String(value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2 border-t">
        <CompleteButton
          stepId={step.id}
          isCompleted={step.status === 'completed'}
          moduleSlug={moduleSlug}
          label="I have reviewed this data"
        />
      </div>
    </div>
  )
}
