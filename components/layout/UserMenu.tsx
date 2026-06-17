'use client'

import { useState } from 'react'
import { LogOut, User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface UserMenuProps {
  email: string
  businessName: string
  avatarUrl?: string | null
}

export function UserMenu({ email, businessName, avatarUrl }: UserMenuProps) {
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await createClient().auth.signOut()
    window.location.replace('/login')
  }

  const initials = businessName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-foreground/[0.05] transition-colors group">
      <div className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 overflow-hidden">
        {avatarUrl
          ? <Image src={avatarUrl} alt={businessName} width={32} height={32} className="object-cover w-full h-full" unoptimized />
          : <span className="text-foreground text-xs font-bold">{initials}</span>
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate leading-tight">{businessName}</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Link
          href="/profile"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors"
          title="Profile"
        >
          <User className="h-3.5 w-3.5" />
        </Link>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
