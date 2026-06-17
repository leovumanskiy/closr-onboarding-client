import { timingSafeEqual } from 'crypto'

// Constant-time comparison of the request Authorization header against
// CRON_SECRET. A plain `===` would short-circuit on the first mismatched byte,
// so the response time leaks how many leading bytes the attacker guessed.
export function isAuthorizedCron(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  if (!authHeader) return false

  const expected = `Bearer ${secret}`
  const a = Buffer.from(authHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
