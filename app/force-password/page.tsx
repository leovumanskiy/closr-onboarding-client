import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/requireUser'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PasswordForm } from './PasswordForm'
import { Wordmark } from '@/components/brand/Wordmark'
import { ThemeToggle } from '@/components/brand/ThemeToggle'

export default async function ForcePasswordPage() {
  const session = await requireUser()

  const supabase = await createClient()
  const { data: user } = await supabase
    .from('clients')
    .select('must_change_password, role')
    .eq('id', session.id)
    .single()

  if (!(user as any)?.must_change_password) {
    redirect(session.role === 'admin' ? '/admin/clients' : '/dashboard')
  }

  // Prior self_change_password = this is an admin-triggered reset, not the
  // initial onboarding. The form skips the Slack step in that case.
  const service = createServiceClient()
  const { data: priorChange } = await service
    .from('audit_log')
    .select('id')
    .eq('actor_id', session.id)
    .eq('action', 'self_change_password')
    .limit(1)
    .maybeSingle()
  const isFirstOnboarding = !priorChange

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: "url('/brand/grain.svg')", backgroundRepeat: 'repeat' }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[400px] bg-foreground/[0.04] rounded-full blur-[130px]" />
      </div>

      <div className="relative w-full max-w-[360px] px-6">
        <div className="flex justify-center mb-12">
          <Wordmark size="lg" />
        </div>

        <PasswordForm isAdmin={session.role === 'admin'} isFirstOnboarding={isFirstOnboarding} />
      </div>
    </div>
  )
}
