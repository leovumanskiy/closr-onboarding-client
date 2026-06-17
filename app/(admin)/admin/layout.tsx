import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/requireUser'
import { createServiceClient } from '@/lib/supabase/service'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { AdminSignOutButton } from '@/components/layout/AdminSignOutButton'
import { Wordmark } from '@/components/brand/Wordmark'
import { ThemeToggle } from '@/components/brand/ThemeToggle'
import { Users, Layers } from 'lucide-react'

const navItems = [
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/modules', label: 'Modules', icon: Layers },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()

  const service = createServiceClient()
  const { data: adminUser } = await service
    .from('clients')
    .select('must_change_password')
    .eq('id', session.id)
    .single()

  if ((adminUser as any)?.must_change_password) redirect('/force-password')

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden md:flex w-56 flex-col bg-background border-r border-border shrink-0">
        <div className="px-5 py-5 border-b border-border">
          <Wordmark size="sm" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium mt-1">Admin</p>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] px-2 mb-2">
            Navigation
          </p>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-border">
          <AdminSignOutButton />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.15em]">CLOSR Admin</span>
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
