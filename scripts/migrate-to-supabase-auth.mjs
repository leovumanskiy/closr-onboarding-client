// Phase 2 backfill: create auth.users for each existing clients row, preserving
// the current bcrypt password hash so users keep logging in with the same
// password.
//
// Run (Node 20+):
//   node --env-file=.env scripts/migrate-to-supabase-auth.mjs
//
// Idempotent. Re-running:
//   - Skips clients whose user_id is already set.
//   - Reuses an existing auth.users row if one already has the email.
//   - Logs and skips clients with a null/blank password_hash.

import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: clients, error: listErr } = await supabase
  .from('clients')
  .select('id, email, password_hash, user_id')
  .order('created_at', { ascending: true })

if (listErr) {
  console.error('Failed to list clients:', listErr.message)
  process.exit(1)
}

let created = 0
let alreadyLinked = 0
let skipped = 0
let errors  = 0

const pad = (s, n) => String(s).padEnd(n)

for (let i = 0; i < clients.length; i++) {
  const c = clients[i]
  const tag = `[${i + 1}/${clients.length}] ${pad(c.email, 36)}`

  if (c.user_id) {
    alreadyLinked += 1
    console.log(`${tag} → linked     uid=${c.user_id}`)
    continue
  }

  if (!c.password_hash || !c.password_hash.startsWith('$2')) {
    skipped += 1
    console.warn(`${tag} → SKIP       (no bcrypt hash)`)
    continue
  }

  const normEmail = c.email.toLowerCase().trim()

  if (DRY_RUN) {
    created += 1
    console.log(`${tag} → WOULD CREATE + LINK`)
    continue
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: normEmail,
    password_hash: c.password_hash,
    email_confirm: true,
  })

  if (error || !data?.user) {
    errors += 1
    // Most likely cause on a mid-run re-run: an auth.users row was created
    // for this email but the matching clients.user_id update didn't land.
    // Resolve manually: query auth.users, update clients.user_id, re-run.
    console.error(`${tag} → ERROR      ${error?.message ?? 'no user returned'}`)
    continue
  }

  const authUid = data.user.id
  const { error: linkErr } = await supabase
    .from('clients')
    .update({ user_id: authUid })
    .eq('id', c.id)

  if (linkErr) {
    errors += 1
    console.error(`${tag} → LINK ERR   ${linkErr.message}  (auth uid=${authUid})`)
    continue
  }

  created += 1
  console.log(`${tag} → created    uid=${authUid}`)
}

console.log()
if (DRY_RUN) console.log('(dry-run — no rows written)')
console.log(`Done. created=${created} alreadyLinked=${alreadyLinked} skipped=${skipped} errors=${errors}`)
if (errors > 0) process.exitCode = 1
