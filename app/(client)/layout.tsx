import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { getClient } from '@/lib/auth/requireUser'
import { getJourneyState } from '@/lib/journey/engine'
import { ProgressRail } from '@/components/journey/ProgressRail'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { UserMenu } from '@/components/layout/UserMenu'
import { Wordmark } from '@/components/brand/Wordmark'
import { ThemeToggle } from '@/components/brand/ThemeToggle'
import { CompleteNavLinks } from '@/components/layout/CompleteNavLinks'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const client = await getClient()
  if (!client) redirect('/login')
  if (client.must_change_password) redirect('/force-password')

  const journey = await getJourneyState(client.id)
  const currentSlug = journey.currentModule?.slug
  const isComplete = journey.percentComplete === 100

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-background border-r border-border shrink-0">
        {/* Wordmark */}
        <div className="px-5 py-5 border-b border-border">
          <Link href="/dashboard" className="flex items-center">
            <Wordmark size="sm" />
          </Link>
        </div>

        {isComplete ? (
          /* Post-onboarding nav */
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] px-2 mb-2">
              Navigation
            </p>
            <CompleteNavLinks />
          </div>
        ) : (
          <>
            {/* Overall progress */}
            <div className="px-5 py-4 border-b border-border">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-muted-foreground font-medium uppercase tracking-[0.1em] text-[10px]">Progress</span>
                <span className="text-foreground font-semibold tabular-nums">{journey.percentComplete}%</span>
              </div>
              <div className="h-px rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-500"
                  style={{ width: `${journey.percentComplete}%` }}
                />
              </div>
              <p className="text-muted-foreground text-[11px] mt-1.5">
                {journey.completedSteps} of {journey.totalSteps} steps complete
              </p>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] px-2 mb-2">
                Your Journey
              </p>
              <ProgressRail modules={journey.modules} currentModuleSlug={currentSlug} />
            </div>
          </>
        )}

        {/* User section */}
        <div className="px-3 py-3 border-t border-border">
          <UserMenu email={session.email} businessName={client.business_name} avatarUrl={client.image_url ?? null} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="md:hidden">
            <Link href="/dashboard">
              <Wordmark size="xs" />
            </Link>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell userId={session.id} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
