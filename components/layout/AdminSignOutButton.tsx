'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function AdminSignOutButton() {
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await createClient().auth.signOut()
    window.location.replace('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  )
}
