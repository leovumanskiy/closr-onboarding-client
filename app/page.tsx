import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { Wordmark } from '@/components/brand/Wordmark'
import { ArrowRight } from 'lucide-react'

export default async function RootPage() {
  const session = await getSession()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: "url('/brand/grain.svg')", backgroundRepeat: 'repeat' }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[640px] h-[400px] bg-foreground/[0.05] rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 text-center flex flex-col items-center gap-10 px-6">
        <Wordmark size="xl" />
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-medium">
          Onboarding, closed.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-7 py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          Sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
