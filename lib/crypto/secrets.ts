import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// Symmetric encryption for secrets stored at rest (e.g. third-party API tokens
// in the `clients` table). AES-256-GCM with a key derived from SECRETS_ENC_KEY.
//
// Stored format: `enc:v1:<iv b64>:<authTag b64>:<ciphertext b64>`
// Values without the `enc:v1:` prefix are treated as legacy plaintext and
// returned as-is by decryptSecret(), so existing rows keep working until the
// next time they are re-saved (which writes them back encrypted).

const PREFIX = 'enc:v1:'
const ALGO = 'aes-256-gcm'

let cachedKey: Buffer | null = null

function key(): Buffer {
  if (cachedKey) return cachedKey
  const raw = process.env.SECRETS_ENC_KEY
  if (!raw) {
    throw new Error('SECRETS_ENC_KEY is not set — cannot encrypt/decrypt secrets')
  }
  // Derive a fixed 32-byte key so any sufficiently random env string works.
  cachedKey = scryptSync(raw, 'closr-secrets-v1', 32)
  return cachedKey
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith(PREFIX)) return value // legacy plaintext passthrough
  const [ivB64, tagB64, ctB64] = value.slice(PREFIX.length).split(':')
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error('Malformed encrypted secret')
  }
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ])
  return pt.toString('utf8')
}
