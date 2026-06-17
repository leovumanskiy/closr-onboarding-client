import { redirect } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { getClient } from '@/lib/auth/requireUser'
import { getJourneyState } from '@/lib/journey/engine'
import { createClient } from '@/lib/supabase/server'
import { EodReportForm } from '@/components/eod/EodReportForm'
import { EodRecentTable } from '@/components/eod/EodRecentTable'

const EOD_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfzX9rp0lmyZ7stmYS5dg5LUvJVtG64gMZplC6nvasoysSdEA/viewform?embedded=true'
const EOD_FORM_OPEN_URL = 'https://forms.gle/G8ezHJaLRSaWbSr89'

export default async function EndOfDayPage() {
  const client = await getClient()
  if (!client) redirect('/login')

  const journey = await getJourneyState(client.id)
  if (journey.percentComplete !== 100) redirect('/dashboard')

  const supabase = await createClient()
  const { data: reports } = await (supabase as any)
    .from('client_eod_reports')
    .select('report_date, calls_booked, calls_showed')
    .eq('client_id', client.id)
    .order('report_date', { ascending: false })
    .limit(14)

  const today = new Date().toISOString().slice(0, 10)
  const todayReport = (reports ?? []).find((r: any) => r.report_date === today) ?? null

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">End of Day Report</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Submit your daily numbers. Show rate is computed from the values you log here and appears on your Performance dashboard.
        </p>
      </div>

      {/* Google Form embed */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">End Of Day Form</h2>
        <div className="rounded-xl border bg-background overflow-hidden" style={{ minHeight: 800 }}>
          <iframe
            src={EOD_FORM_URL}
            style={{ width: '100%', minHeight: 800, border: 'none', display: 'block' }}
            title="End of Day form"
          />
        </div>
        <a
          href={EOD_FORM_OPEN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open form in new tab
        </a>
      </div>

      {/* In-app form for show-rate tracking */}
      <EodReportForm
        initialDate={today}
        initialBooked={todayReport?.calls_booked ?? null}
        initialShowed={todayReport?.calls_showed ?? null}
      />

      {/* Recent reports */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Recent reports</h2>
        <EodRecentTable reports={reports ?? []} />
      </div>
    </div>
  )
}
