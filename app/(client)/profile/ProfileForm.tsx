'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateProfile } from '@/lib/profile/actions'
import { Save, Loader2, User } from 'lucide-react'
import Image from 'next/image'

interface Props {
  initial: {
    fullName: string
    businessName: string
    businessWebsite: string
    niche: string
    startDate: string
    slackChannelId: string
    slackUserId: string
  }
  currentAvatarUrl: string | null
}

const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring'

export function ProfileForm({ initial, currentAvatarUrl }: Props) {
  const [form, setForm] = useState(initial)
  const [imageUrl, setImageUrl] = useState(currentAvatarUrl ?? '')
  const [saving, setSaving] = useState(false)

  function setField(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.businessName.trim()) {
      toast.error('Business name is required.')
      return
    }
    setSaving(true)
    const result = await updateProfile({ ...form, imageUrl: imageUrl.trim() || undefined })
    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('Profile saved.')
  }

  const previewUrl = imageUrl.trim() || null

  return (
    <div className="space-y-6">
      {/* Avatar preview */}
      <div className="rounded-xl border bg-card p-5 flex items-center gap-5">
        <div className="relative h-16 w-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
          {previewUrl ? (
            <Image src={previewUrl} alt="Profile" fill className="object-cover" unoptimized />
          ) : (
            <User className="h-7 w-7 text-primary/50" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium mb-1">Profile Image URL</p>
          <input
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className={inputCls}
          />
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold text-sm mb-4">Business Details</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => setField('fullName', e.target.value)}
                placeholder="John Smith"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Business Name *</label>
              <input
                type="text"
                value={form.businessName}
                onChange={e => setField('businessName', e.target.value)}
                required
                placeholder="Acme Inc."
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Business Website</label>
              <input
                type="text"
                value={form.businessWebsite}
                onChange={e => setField('businessWebsite', e.target.value)}
                placeholder="e.g. example.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Niche</label>
              <input
                type="text"
                value={form.niche}
                onChange={e => setField('niche', e.target.value)}
                placeholder="e.g. E-commerce, SaaS"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setField('startDate', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="pt-4 mt-2 border-t">
            <h3 className="text-sm font-semibold mb-1">Slack</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Add your Slack IDs so we can ping you in your private channel when a module completes or a step is overdue.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Slack Channel ID</label>
                <input
                  type="text"
                  value={form.slackChannelId}
                  onChange={e => setField('slackChannelId', e.target.value)}
                  placeholder="C0123456789"
                  className={inputCls}
                />
                <p className="text-[11px] text-muted-foreground mt-1">In Slack: open your channel → click name → ID at the bottom of About.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Slack User ID</label>
                <input
                  type="text"
                  value={form.slackUserId}
                  onChange={e => setField('slackUserId', e.target.value)}
                  placeholder="U0123456789"
                  className={inputCls}
                />
                <p className="text-[11px] text-muted-foreground mt-1">In Slack: open your profile → ⋮ menu → Copy member ID.</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}
