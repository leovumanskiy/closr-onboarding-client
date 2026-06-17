'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateClientDetails, updateClientPassword } from '@/lib/admin/actions'
import { Save, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react'

interface Props {
  clientId: string
  initial: {
    businessName: string
    fullName: string
    email: string
    businessWebsite: string
    niche: string
    startDate: string
    status: string
    slackChannelId: string
    slackUserId: string
  }
}

const statusOptions = ['active', 'paused', 'completed', 'churned'] as const

export function ClientEditPanel({ clientId, initial }: Props) {
  const [details, setDetails] = useState(initial)
  const [savingDetails, setSavingDetails] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  function setField(field: keyof typeof details, value: string) {
    setDetails(d => ({ ...d, [field]: value }))
  }

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault()
    if (!details.businessName.trim() || !details.email.trim()) {
      toast.error('Business name and email are required.')
      return
    }
    setSavingDetails(true)
    const result = await updateClientDetails({ clientId, ...details })
    setSavingDetails(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('Client details updated.')
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    setSavingPassword(true)
    const result = await updateClientPassword({ clientId, newPassword })
    setSavingPassword(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('Password updated.')
    setNewPassword('')
  }

  const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Details form */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold text-sm mb-4">Account Details</h3>
        <form onSubmit={handleSaveDetails} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Business Name *</label>
            <input
              type="text"
              value={details.businessName}
              onChange={e => setField('businessName', e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name</label>
            <input
              type="text"
              value={details.fullName}
              onChange={e => setField('fullName', e.target.value)}
              placeholder="e.g. John Smith"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email *</label>
            <input
              type="email"
              value={details.email}
              onChange={e => setField('email', e.target.value)}
              required
              placeholder="client@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Business Website</label>
            <input
              type="text"
              value={details.businessWebsite}
              onChange={e => setField('businessWebsite', e.target.value)}
              placeholder="e.g. example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Niche</label>
            <input
              type="text"
              value={details.niche}
              onChange={e => setField('niche', e.target.value)}
              placeholder="e.g. E-commerce, SaaS"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
            <input
              type="date"
              value={details.startDate}
              onChange={e => setField('startDate', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
            <select
              value={details.status}
              onChange={e => setField('status', e.target.value)}
              className={inputCls}
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Slack Channel ID</label>
            <input
              type="text"
              value={details.slackChannelId}
              onChange={e => setField('slackChannelId', e.target.value)}
              placeholder="C0123456789"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Slack User ID</label>
            <input
              type="text"
              value={details.slackUserId}
              onChange={e => setField('slackUserId', e.target.value)}
              placeholder="U0123456789"
              className={inputCls}
            />
            <p className="text-[11px] text-muted-foreground mt-1">Slack profile → ⋮ → Copy member ID. Pinged on module complete + overdue.</p>
          </div>
          <button
            type="submit"
            disabled={savingDetails}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors mt-1"
          >
            {savingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Details
          </button>
        </form>
      </div>

      {/* Password form */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold text-sm mb-1">Reset Password</h3>
        <p className="text-xs text-muted-foreground mb-4">Set a new password for this client. They will need to use it on next login.</p>
        <form onSubmit={handleSavePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                className={inputCls + ' pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={savingPassword || newPassword.length < 8}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-card border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40 transition-colors"
          >
            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  )
}
