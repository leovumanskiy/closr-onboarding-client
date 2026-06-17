interface Report {
  report_date: string
  calls_booked: number
  calls_showed: number
}

interface Props {
  reports: Report[]
}

function formatRate(showed: number, booked: number): string {
  if (booked <= 0) return '—'
  return `${Math.round((showed / booked) * 1000) / 10}%`
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function EodRecentTable({ reports }: Props) {
  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No End of Day reports yet. Submit one above to start tracking your show rate.
        </p>
      </div>
    )
  }

  const last7 = reports.slice(0, 7)
  const totalBooked = last7.reduce((s, r) => s + r.calls_booked, 0)
  const totalShowed = last7.reduce((s, r) => s + r.calls_showed, 0)

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last 7 days</p>
          <p className="text-xl font-bold tabular-nums mt-0.5">{formatRate(totalShowed, totalBooked)} show rate</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p><span className="tabular-nums text-foreground font-semibold">{totalShowed}</span> showed</p>
          <p><span className="tabular-nums text-foreground font-semibold">{totalBooked}</span> booked</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b">
              <th className="text-left font-medium px-5 py-2.5">Date</th>
              <th className="text-right font-medium px-5 py-2.5">Booked</th>
              <th className="text-right font-medium px-5 py-2.5">Showed</th>
              <th className="text-right font-medium px-5 py-2.5">Show rate</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.report_date} className="border-b last:border-0">
                <td className="px-5 py-2.5">{formatDate(r.report_date)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{r.calls_booked}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{r.calls_showed}</td>
                <td className="px-5 py-2.5 text-right tabular-nums font-semibold">
                  {formatRate(r.calls_showed, r.calls_booked)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
