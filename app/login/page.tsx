'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { Wordmark } from '@/components/brand/Wordmark'
import { ThemeToggle } from '@/components/brand/ThemeToggle'
import { createClient } from '@/lib/supabase/client'

function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login') || m.includes('credentials')) return 'Incorrect email or password.'
  if (m.includes('rate') || m.includes('too many')) return 'Too many attempts. Please try again in a moment.'
  return 'Something went wrong. Please try again.'
}

function normalizeCallbackUrl(raw: string | null): string | null {
  if (!raw) return null
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  return null
}

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = normalizeCallbackUrl(searchParams.get('callbackUrl'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const trimmed = email.trim().toLowerCase()
    const supabase = createClient()

    try {
      const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      })

      if (signInErr || !authData?.user) {
        setError(mapAuthError(signInErr?.message ?? ''))
        return
      }

      // Fetch this client's role + must_change_password to pick the destination.
      // RLS allows the user to read their own clients row.
      const { data: client } = await supabase
        .from('clients')
        .select('role, must_change_password')
        .eq('user_id', authData.user.id)
        .single()

      setRedirecting(true)

      const mustChange = (client as any)?.must_change_password
      const role = (client as any)?.role
      const dest = mustChange
        ? '/force-password'
        : callbackUrl ?? (role === 'admin' ? '/admin/clients' : '/dashboard')

      // Hard navigation so the freshly-set Supabase auth cookies are sent
      // with the very first request to `dest`. router.push() can race the
      // cookie write and bounce the user back to /login via middleware.
      window.location.assign(dest)
    } finally {
      setPending(false)
    }
  }

  if (redirecting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-5">
        <Wordmark size="md" />
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-[11px] font-medium text-muted-foreground uppercase tracking-[0.1em]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/20 transition-all"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-[11px] font-medium text-muted-foreground uppercase tracking-[0.1em]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/20 transition-all"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity mt-1"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  )
}

export default function LoginPage() {
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

        <div className="mb-8 text-center">
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
