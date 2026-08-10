import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export interface SessionUser {
  id: string
  email: string
  role: 'client' | 'admin'
  fullName: string | null
  /** Cohort the client is assigned to. Null until the programs backfill runs. */
  programId: string | null
}

// React `cache()` memoizes per request, so multiple getSession() calls in the
// same render (layout + page + server actions) only hit Supabase once.
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: client } = await (supabase as any)
    .from('clients')
    .select('id, email, role, full_name, program_id')
    .eq('user_id', user.id)
    .single()

  if (!client) return null

  return {
    id: client.id,
    email: client.email,
    role: client.role as 'client' | 'admin',
    fullName: client.full_name ?? null,
    programId: client.program_id ?? null,
  }
})
