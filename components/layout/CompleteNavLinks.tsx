'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, CheckCircle2, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CompleteNavLinks() {
  const pathname = usePathname()

  return (
    <>
      <Link
        href="/dashboard"
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/dashboard'
            ? 'bg-foreground/[0.07] text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
        )}
      >
        <BarChart3 className="h-4 w-4 shrink-0" />
        Performance
      </Link>
      <Link
        href="/end-of-day"
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/end-of-day'
            ? 'bg-foreground/[0.07] text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
        )}
      >
        <ClipboardList className={cn('h-4 w-4 shrink-0', pathname !== '/end-of-day' && 'text-foreground/40')} />
        End of Day
      </Link>
      <Link
        href="/onboarding"
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/onboarding'
            ? 'bg-foreground/[0.07] text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
        )}
      >
        <CheckCircle2 className={cn('h-4 w-4 shrink-0', pathname !== '/onboarding' && 'text-foreground/40')} />
        Onboarding complete
      </Link>
    </>
  )
}
