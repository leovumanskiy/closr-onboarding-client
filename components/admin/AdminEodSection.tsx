import { createServiceClient } from '@/lib/supabase/service'
import { Percent } from 'lucide-react'
import { EodRecentTable } from '@/components/eod/EodRecentTable'

interface Props {
  clientId: string
}

export async function AdminEodSection({ clientId }: Props) {
  const supabase = createServiceClient()
  const { data: rows } = await (supabase as any)
    .from('client_eod_reports')
    .select('report_date, calls_booked, calls_showed')
    .eq('client_id', clientId)
    .order('report_date', { ascending: false })

  type Row = { report_date: string; calls_booked: number; calls_showed: number }
  const reports: Row[] = rows ?? []

  const since7 = new Date()
  since7.setDate(since7.getDate() - 6)
  const since7Iso = since7.toISOString().slice(0, 10)
  const last7 = reports.filter(r => r.report_date >= since7Iso)

  function aggregate(arr: Row[]) {
    const booked = arr.reduce((s, r) => s + (r.calls_booked || 0), 0)
    const showed = arr.reduce((s, r) => s + (r.calls_showed || 0), 0)
    return {
      booked,
      showed,
      rate: booked > 0 ? Math.round((showed / booked) * 1000) / 10 : null,
    }
  }

  const last7Stats = aggregate(last7)
  const allTimeStats = aggregate(reports)
  const hasAny = reports.length > 0

  return (
    <section>
      <h2 className="text-base font-semibold mb-3">End of Day Reports</h2>

      <div className="rounded-xl border bg-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Percent className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Show rate
          </span>
        </div>
        {hasAny ? (
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
          <p className="text-sm text-muted-foreground">No End of Day reports submitted yet.</p>
        )}
      </div>

      {hasAny && <EodRecentTable reports={reports.slice(0, 14)} />}
    </section>
  )
}
