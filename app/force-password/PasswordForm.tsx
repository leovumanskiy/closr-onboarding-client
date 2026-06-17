'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Hash, Loader2, ShieldAlert } from 'lucide-react'
import { changeOwnPassword, verifyAndSendWelcomeSlackDM } from '@/lib/auth/changePassword'
import { Wordmark } from '@/components/brand/Wordmark'

const SLACK_USER_ID_RE = /^[UW][A-Z0-9]{8,}$/

type Step = 'slack' | 'password' | 'redirecting'

type SlackVerifyState =
  | { status: 'idle' }
  | { status: 'pending'; slackUserId: string }
  | { status: 'success'; slackUserId: string }
  | { status: 'error'; slackUserId: string; message: string }

export function PasswordForm({ isAdmin, isFirstOnboarding }: { isAdmin: boolean; isFirstOnboarding: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(isFirstOnboarding ? 'slack' : 'password')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [slackUserId, setSlackUserId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [slackVerify, setSlackVerify] = useState<SlackVerifyState>({ status: 'idle' })

  async function handleSlackContinue(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = slackUserId.trim()
    if (!trimmed) {
      setError('Slack User ID is required.')
      return
    }
    if (!SLACK_USER_ID_RE.test(trimmed)) {
      setError('Slack User ID must look like "U0XXXXXXXX" — find it in Slack via your profile → More → Copy member ID.')
      return
    }

    setStep('password')
    setSlackVerify({ status: 'pending', slackUserId: trimmed })

    try {
      const result = await verifyAndSendWelcomeSlackDM({ slackUserId: trimmed })
      setSlackVerify(prev => {
        if (prev.status !== 'pending' || prev.slackUserId !== trimmed) return prev
        if (result.error) {
          return { status: 'error', slackUserId: trimmed, message: result.error }
        }
        return { status: 'success', slackUserId: trimmed }
      })
    } catch {
      setSlackVerify(prev => {
        if (prev.status !== 'pending' || prev.slackUserId !== trimmed) return prev
        return {
          status: 'error',
          slackUserId: trimmed,
          message: 'Could not reach the server. Please try again.',
        }
      })
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (next !== confirm) {
      setError('New passwords do not match.')
      return
    }

    setPending(true)
    try {
      const result = await changeOwnPassword({
        currentPassword: current,
        newPassword: next,
        slackUserId: isFirstOnboarding ? slackUserId.trim() : undefined,
      })
      if (result.error) {
        setError(result.error)
        setPending(false)
        return
      }
      setStep('redirecting')
      router.replace(isAdmin ? '/admin/clients' : '/dashboard')
    } catch (err) {
      setPending(false)
      throw err
    }
  }

  if (step === 'redirecting') {
    return <RedirectingScreen />
  }

  const inputCls =
    'w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/20 transition-all'

  return (
    <div className="space-y-4">
      <StepHeader step={step} />
      {isFirstOnboarding && <StepIndicator step={step} />}

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {step === 'slack' && (
        <form onSubmit={handleSlackContinue} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="slackUserId" className="block text-sm font-bold text-foreground">
              Slack User ID <span className="text-destructive">*</span>
            </label>
            <input
              id="slackUserId"
              type="text"
              required
              autoFocus
              aria-required="true"
              value={slackUserId}
              onChange={e => setSlackUserId(e.target.value)}
              className={inputCls}
              placeholder="U01ABCDEFGH"
              pattern="[UW][A-Z0-9]{8,}"
              title='Slack member ID, e.g. "U01ABCDEFGH"'
            />
          </div>

          <div className="rounded-lg border-2 border-violet-500/40 bg-violet-500/10 p-4">
            <p className="text-xs font-bold text-violet-700 dark:text-violet-300 mb-3 uppercase tracking-wide">How to find your Slack User ID</p>
            <ol className="space-y-2.5 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold">1</span>
                <span>In Slack, click your <strong>profile picture</strong> in the top-right corner, then choose <strong>Profile</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold">2</span>
                <span>On your profile panel, click the <strong>⋮ More</strong> button (three dots).</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold">3</span>
                <span>Click <strong>Copy member ID</strong> (starts with <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">U</code>) and paste it above.</span>
              </li>
            </ol>
            <p className="mt-3 pt-3 border-t border-violet-500/20 text-xs text-muted-foreground">
              We&apos;ll DM you a welcome message — you&apos;ll only get into the portal once it&apos;s delivered.
            </p>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity mt-1"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <SlackVerifyBanner state={slackVerify} />

          <div className="space-y-1.5">
            <label htmlFor="current" className="block text-[11px] font-medium text-muted-foreground uppercase tracking-[0.1em]">
              Current password
            </label>
            <input
              id="current"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="next" className="block text-[11px] font-medium text-muted-foreground uppercase tracking-[0.1em]">
              New password
            </label>
            <input
              id="next"
              type="password"
              required
              autoComplete="new-password"
              value={next}
              onChange={e => setNext(e.target.value)}
              className={inputCls}
              placeholder="Min. 8 characters"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm" className="block text-[11px] font-medium text-muted-foreground uppercase tracking-[0.1em]">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className={inputCls}
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
                Updating password…
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Set new password
              </>
            )}
          </button>

          {!pending && isFirstOnboarding && (
            <button
              type="button"
              onClick={() => {
                setStep('slack')
                setError(null)
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Slack
            </button>
          )}
        </form>
      )}
    </div>
  )
}

function StepIndicator({ step }: { step: Exclude<Step, 'redirecting'> }) {
  const steps: Array<{ key: Exclude<Step, 'redirecting'>; label: string }> = [
    { key: 'slack', label: 'Slack' },
    { key: 'password', label: 'Password' },
  ]
  const activeIndex = steps.findIndex(s => s.key === step)

  return (
    <div className="flex items-center justify-center gap-2 pb-2">
      {steps.map((s, i) => {
        const isDone = i < activeIndex
        const isActive = i === activeIndex
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                isActive
                  ? 'text-foreground'
                  : isDone
                  ? 'text-foreground/60'
                  : 'text-muted-foreground/40'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-medium transition-colors ${
                  isDone
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                    : isActive
                    ? 'border-foreground/30 bg-foreground/5'
                    : 'border-border'
                }`}
              >
                {isDone ? <CheckCircle className="h-3 w-3" /> : i + 1}
              </span>
              <span className="font-medium">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <span className={`h-px w-6 ${isDone ? 'bg-emerald-500/40' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SlackVerifyBanner({ state }: { state: SlackVerifyState }) {
  if (state.status !== 'error') return null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>Issue with connecting to Slack, check your user ID again.</span>
    </div>
  )
}

function StepHeader({ step }: { step: Exclude<Step, 'redirecting'> }) {
  const isSlack = step === 'slack'
  const Icon = isSlack ? Hash : ShieldAlert
  const title = isSlack ? 'Connect your Slack' : 'Set your password'
  const subtitle = isSlack
    ? "We'll send you a welcome DM to confirm your Slack ID before you continue."
    : 'You need to choose a new password before continuing.'

  return (
    <div className="text-center pb-2">
      <div className="flex justify-center mb-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function RedirectingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-5">
      <Wordmark size="md" />
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  )
}
