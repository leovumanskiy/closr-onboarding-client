import Link from 'next/link'
import { getGHLData, isGHLConnected } from '@/lib/integrations/ghl'
import { GhlConnectBanner } from '@/components/integrations/GhlConnectBanner'
import { createClient } from '@/lib/supabase/server'
import { TrendingUp, Users, DollarSign, Target, BarChart3, AlertCircle, Percent, ArrowRight } from 'lucide-react'

interface Props {
  clientId: string
  businessName: string
}

const METRICS = [
  { key: 'leads', label: 'Leads', icon: <Users className="h-5 w-5" /> },
  { key: 'appointments', label: 'Appointments', icon: <Target className="h-5 w-5" /> },
  { key: 'deals_closed', label: 'Deals Closed', icon: <TrendingUp className="h-5 w-5" /> },
  { key: 'revenue', label: 'Revenue', icon: <DollarSign className="h-5 w-5" /> },
  { key: 'roas', label: 'ROAS', icon: <BarChart3 className="h-5 w-5" /> },
  { key: 'cpl', label: 'CPL', icon: <DollarSign className="h-5 w-5" /> },
]

export async function LivePerformanceDashboard({ clientId, businessName }: Props) {
  const connected = await isGHLConnected(clientId)
  const data = connected ? await getGHLData(clientId, 'performance') : null
  const hasAnyMetric = !!data && METRICS.some(m => data[m.key] !== undefined)
  const dimmed = !connected || !hasAnyMetric

  // Show rate from End of Day reports — pull all rows, slice last 7 days client-side.
  const supabase = await createClient()
  const { data: eodRows } = await (supabase as any)
    .from('client_eod_reports')
    .select('report_date, calls_booked, calls_showed')
    .eq('client_id', clientId)
    .order('report_date', { ascending: false })

  type EodRow = { report_date: string; calls_booked: number; calls_showed: number }
  const eodReports: EodRow[] = eodRows ?? []

  const since7 = new Date()
  since7.setDate(since7.getDate() - 6)
  const since7Iso = since7.toISOString().slice(0, 10)
  const last7 = eodReports.filter(r => r.report_date >= since7Iso)

  function aggregate(rows: EodRow[]) {
    const booked = rows.reduce((s, r) => s + (r.calls_booked || 0), 0)
    const showed = rows.reduce((s, r) => s + (r.calls_showed || 0), 0)
    return {
      booked,
      showed,
      rate: booked > 0 ? Math.round((showed / booked) * 1000) / 10 : null,
    }
  }

  const last7Stats = aggregate(last7)
  const allTimeStats = aggregate(eodReports)
  const hasAnyEod = eodReports.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {businessName}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your live campaign performance data.
        </p>
      </div>

      {!connected && <GhlConnectBanner />}

      {connected && !hasAnyMetric && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">No live data available yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your GoHighLevel account is connected, but we couldn&apos;t pull performance metrics. This usually means there&apos;s no campaign activity yet, or the API key/Location ID needs reviewing. Once your campaigns are live, real numbers will appear here automatically.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {METRICS.map(({ key, label, icon }) => (
          <div
            key={key}
            className={`rounded-xl border bg-card p-5 transition-opacity ${dimmed ? 'opacity-40' : ''}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="text-primary">{icon}</div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </span>
            </div>
            <p className="text-3xl font-bold tabular-nums">
              {data?.[key] !== undefined ? String(data[key]) : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Show rate from End of Day reports */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="text-primary"><Percent className="h-5 w-5" /></div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Show rate
            </span>
          </div>
          <Link
            href="/end-of-day"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log today
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {hasAnyEod ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Last 7 days</p>
              <p className="mt-2 text-3xl font-bold tabular-nums">
                {last7Stats.rate != null ? `${last7Stats.rate}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums mt-1">
                {last7Stats.showed} of {last7Stats.booked} calls showed
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">All time</p>
              <p className="mt-2 text-3xl font-bold tabular-nums">
                {allTimeStats.rate != null ? `${allTimeStats.rate}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums mt-1">
                {allTimeStats.showed} of {allTimeStats.booked} calls showed
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Submit your first End of Day report to see your show rate.
          </p>
        )}
      </div>
    </div>
  )
}
