// One-time backfill: encrypt existing plaintext GHL tokens at rest.
//
// Prerequisite: SECRETS_ENC_KEY must be set to its FINAL production value
// first (changing it later makes these unreadable).
//
// Run (Node 20+):
//   node --env-file=.env scripts/backfill-encrypt-ghl.mjs
//
// Idempotent: rows already prefixed `enc:v1:` are skipped.

import { createClient } from '@supabase/supabase-js'
import { createCipheriv, randomBytes, scryptSync } from 'crypto'

const PREFIX = 'enc:v1:'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const encKey = process.env.SECRETS_ENC_KEY

if (!url || !serviceKey || !encKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SECRETS_ENC_KEY')
  process.exit(1)
}

const key = scryptSync(encKey, 'closr-secrets-v1', 32)

function encryptSecret(plaintext) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

const supabase = createClient(url, serviceKey)

const { data, error } = await supabase
  .from('clients')
  .select('id, ghl_access_token, ghl_refresh_token')
  .not('ghl_access_token', 'is', null)

if (error) { console.error(error); process.exit(1) }

let updated = 0
for (const row of data) {
  const patch = {}
  if (row.ghl_access_token && !row.ghl_access_token.startsWith(PREFIX)) {
    patch.ghl_access_token = encryptSecret(row.ghl_access_token)
  }
  if (row.ghl_refresh_token && !row.ghl_refresh_token.startsWith(PREFIX)) {
    patch.ghl_refresh_token = encryptSecret(row.ghl_refresh_token)
  }
  if (Object.keys(patch).length === 0) continue
  const { error: upErr } = await supabase.from('clients').update(patch).eq('id', row.id)
  if (upErr) { console.error(`Failed for ${row.id}:`, upErr); continue }
  updated++
}

console.log(`Encrypted tokens for ${updated} client row(s).`)
