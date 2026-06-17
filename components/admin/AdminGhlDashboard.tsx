import { getGHLData, isGHLConnected } from '@/lib/integrations/ghl'
import { TrendingUp, Users, DollarSign, Target, BarChart3, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  clientId: string
}

const METRICS = [
  { key: 'leads', label: 'Leads', icon: <Users className="h-5 w-5" /> },
  { key: 'appointments', label: 'Appointments', icon: <Target className="h-5 w-5" /> },
  { key: 'deals_closed', label: 'Deals Closed', icon: <TrendingUp className="h-5 w-5" /> },
  { key: 'revenue', label: 'Revenue', icon: <DollarSign className="h-5 w-5" /> },
  { key: 'roas', label: 'ROAS', icon: <BarChart3 className="h-5 w-5" /> },
  { key: 'cpl', label: 'CPL', icon: <DollarSign className="h-5 w-5" /> },
]

export async function AdminGhlDashboard({ clientId }: Props) {
  const connected = await isGHLConnected(clientId)
  const data = connected ? await getGHLData(clientId, 'performance') : null
  const hasAnyMetric = !!data && METRICS.some(m => (data as any)[m.key] !== undefined)
  const dimmed = !connected || !hasAnyMetric

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Live Performance (GoHighLevel)</h2>
        </div>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium border',
          connected
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-muted text-muted-foreground border-border'
        )}>
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      {!connected && (
        <p className="text-xs text-muted-foreground">
          Client hasn&apos;t connected their GoHighLevel sub-account yet.
        </p>
      )}

      {connected && !hasAnyMetric && (
        <p className="text-xs text-muted-foreground">
          No performance data available — campaigns may not be live yet.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {METRICS.map(({ key, label, icon }) => (
          <div
            key={key}
            className={cn(
              'rounded-xl border bg-card p-4 transition-opacity',
              dimmed && 'opacity-40'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="text-primary">{icon}</div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {data && (data as any)[key] !== undefined ? String((data as any)[key]) : '—'}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
