import type { StepWithProgress, DashboardConfig } from '@/lib/journey/types'
import { CompleteButton } from './CompleteButton'
import { getGHLData, isGHLConnected, probeGHL } from '@/lib/integrations/ghl'
import { GhlConnectBanner } from '@/components/integrations/GhlConnectBanner'
import { TrendingUp, Users, DollarSign, Target, BarChart3, AlertCircle } from 'lucide-react'

interface Props {
  step: StepWithProgress
  clientId: string
  moduleSlug: string
}

const metricIcons: Record<string, React.ReactNode> = {
  leads: <Users className="h-5 w-5" />,
  appointments: <Target className="h-5 w-5" />,
  deals_closed: <TrendingUp className="h-5 w-5" />,
  revenue: <DollarSign className="h-5 w-5" />,
  roas: <BarChart3 className="h-5 w-5" />,
  cpl: <DollarSign className="h-5 w-5" />,
}

export async function DashboardStep({ step, clientId, moduleSlug }: Props) {
  const config = step.config as unknown as DashboardConfig
  const connected = await isGHLConnected(clientId)
  const [data, probe] = connected
    ? await Promise.all([getGHLData(clientId, 'performance'), probeGHL(clientId)])
    : [null, null]
  const metrics = config.metrics ?? []
  const hasAnyMetric = !!data && metrics.some(m => data[m] !== undefined)
  const dimmed = !connected || !hasAnyMetric

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{config.description}</p>

      {!connected && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">GoHighLevel not connected</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect your GHL account below to see real campaign performance. Until then, the metrics will stay blank.
            </p>
          </div>
        </div>
      )}

      {!connected && <GhlConnectBanner />}

      {connected && !hasAnyMetric && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-2">
            {probe && !probe.ok ? (
              <>
                <p className="text-sm font-semibold text-foreground">
                  GoHighLevel rejected the token on both API versions
                </p>
                <p className="text-xs text-muted-foreground">
                  Your token must be <strong>either</strong> a v1 Location API Key (Settings → Business Profile → API Key) <strong>or</strong> a v2 Private Integration Token (Settings → Integrations → Private Integrations) with the right scopes. Right now it&apos;s neither — see the per-API responses below.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 mt-2">
                  <div className="rounded-md border border-border bg-background p-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">v1 (Location API Key)</p>
                    <p className="text-xs text-foreground mt-1">
                      <span className="font-mono">{probe.v1?.status ?? 'error'}</span>
                      {' '}
                      <span className="text-muted-foreground">{probe.v1?.message ?? 'no body'}</span>
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">v2 (Private Integration)</p>
                    <p className="text-xs text-foreground mt-1">
                      <span className="font-mono">{probe.v2?.status ?? 'error'}</span>
                      {' '}
                      <span className="text-muted-foreground">{probe.v2?.message ?? 'no body'}</span>
                    </p>
                  </div>
                </div>
              </>
            ) : probe?.ok ? (
              <>
                <p className="text-sm font-semibold text-foreground">
                  Connected via GHL {probe.mode?.toUpperCase()} — but no metrics returned
                </p>
                <p className="text-xs text-muted-foreground">
                  The token authenticates successfully, but contacts / opportunities / appointments returned nothing for the last 30 days. This usually means there&apos;s genuinely no campaign activity yet.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">No live data available yet</p>
                <p className="text-xs text-muted-foreground">
                  Your GoHighLevel account is connected, but the data endpoints returned nothing for the last 30 days.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metrics.map(metric => (
          <div key={metric} className={`rounded-xl border bg-card p-4 ${dimmed ? 'opacity-40' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-primary">
                {metricIcons[metric] ?? <BarChart3 className="h-5 w-5" />}
              </div>
              <span className="text-xs text-muted-foreground capitalize">{metric.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-2xl font-bold">
              {data?.[metric] !== undefined ? String(data[metric]) : '—'}
            </p>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t">
        <CompleteButton
          stepId={step.id}
          isCompleted={step.status === 'completed'}
          moduleSlug={moduleSlug}
          label="I have reviewed my dashboard"
        />
      </div>
    </div>
  )
}
