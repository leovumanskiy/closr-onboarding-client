import { createServiceClient } from '@/lib/supabase/service'
import { decryptSecret } from '@/lib/crypto/secrets'

// Dual-mode GoHighLevel integration. The same `ghl_access_token` field can hold either:
//   • A v1 Location API Key  → from Settings → Business Profile → API Key
//   • A v2 Private Integration Token (PIT) → from Settings → Integrations → Private Integrations
// We probe both endpoints to figure out which one the token is for, then dispatch
// accordingly. If the token is rejected by both, the dashboard surfaces the rejection
// reason from each so the client knows what to fix.

const GHL_V1 = 'https://rest.gohighlevel.com/v1'
const GHL_V2 = 'https://services.leadconnectorhq.com'
const GHL_V2_VERSION = '2021-07-28'
const WINDOW_DAYS = 30
const ADS_OPTIN_TAG = 'ads opt in'

type Mode = 'v1' | 'v2'

export async function isGHLConnected(clientId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('clients')
    .select('ghl_access_token')
    .eq('id', clientId)
    .single()
  return !!(data as any)?.ghl_access_token
}

interface GhlCreds {
  ghl_access_token: string
  ghl_location_id: string
}

async function getCreds(clientId: string): Promise<GhlCreds | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('clients')
    .select('ghl_access_token, ghl_location_id')
    .eq('id', clientId)
    .single()
  const c = data as any
  if (!c?.ghl_access_token) return null
  const token = decryptSecret(c.ghl_access_token)
  if (!token) return null
  return { ghl_access_token: token, ghl_location_id: c.ghl_location_id ?? '' }
}

function v1Headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

function v2Headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_V2_VERSION,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

function msDaysAgo(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000
}

function isoDaysAgo(days: number) {
  return new Date(msDaysAgo(days)).toISOString()
}

async function rawFetch(url: string, headers: HeadersInit, init: RequestInit & { silent?: boolean } = {}) {
  const { silent, ...fetchInit } = init
  try {
    const res = await fetch(url, {
      ...fetchInit,
      headers: { ...headers, ...(fetchInit.headers ?? {}) },
      next: { revalidate: 300 },
    })
    if (!res.ok) {
      if (!silent) {
        console.warn(`[ghl] ${url} → ${res.status} ${res.statusText}`)
      }
      return null
    }
    return await res.json()
  } catch (err) {
    if (!silent) console.warn(`[ghl] ${url} threw`, err)
    return null
  }
}

export interface ProbeResult {
  ok: boolean
  mode?: Mode
  v1?: { ok: boolean; status?: number; message?: string }
  v2?: { ok: boolean; status?: number; message?: string }
}

async function probeOne(url: string, headers: HeadersInit) {
  try {
    const res = await fetch(url, { headers, cache: 'no-store' })
    if (res.ok) return { ok: true, status: res.status }
    const body = await res.text().catch(() => '')
    return { ok: false, status: res.status, message: body.slice(0, 300) }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) }
  }
}

export async function probeGHL(clientId: string): Promise<ProbeResult> {
  const creds = await getCreds(clientId)
  if (!creds) return { ok: false, message: 'No credentials saved' } as ProbeResult

  const v2Url = creds.ghl_location_id
    ? `${GHL_V2}/contacts/?locationId=${encodeURIComponent(creds.ghl_location_id)}&limit=1`
    : null
  const [v1, v2] = await Promise.all([
    probeOne(`${GHL_V1}/contacts/?limit=1`, v1Headers(creds.ghl_access_token)),
    v2Url
      ? probeOne(v2Url, v2Headers(creds.ghl_access_token))
      : Promise.resolve({ ok: false, message: 'No Location ID saved' }),
  ])

  if (v1.ok) return { ok: true, mode: 'v1', v1, v2 }
  if (v2.ok) return { ok: true, mode: 'v2', v1, v2 }
  return { ok: false, v1, v2 }
}

async function detectMode(creds: GhlCreds): Promise<Mode | null> {
  // Cheap probes against /contacts/ — needs only the contacts.readonly scope.
  // Both probes run silently; we only log if both fail (handled at the call site).
  const v2Url = creds.ghl_location_id
    ? `${GHL_V2}/contacts/?locationId=${encodeURIComponent(creds.ghl_location_id)}&limit=1`
    : null
  const [v1, v2] = await Promise.all([
    rawFetch(`${GHL_V1}/contacts/?limit=1`, v1Headers(creds.ghl_access_token), { silent: true }),
    v2Url ? rawFetch(v2Url, v2Headers(creds.ghl_access_token), { silent: true }) : Promise.resolve(null),
  ])
  if (v2) return 'v2'
  if (v1) return 'v1'
  return null
}

function extractContactId(o: Record<string, unknown>): string | null {
  const direct = (o as any).contactId ?? (o as any).contact_id
  if (typeof direct === 'string' && direct) return direct
  const nested = (o as any).contact
  if (nested && typeof nested === 'object') {
    const id = (nested as any).id
    if (typeof id === 'string' && id) return id
  }
  return null
}

// ─── v1 fetchers ────────────────────────────────────────────────────────────

async function v1AdsContactIds(creds: GhlCreds): Promise<Set<string> | null> {
  // v1 /contacts/ has no tag filter — paginate and collect IDs of contacts
  // carrying the ADS_OPTIN_TAG. Safety-capped at 50 pages (5000 contacts).
  const ids = new Set<string>()
  let nextPath: string | null = `/contacts/?limit=100`
  let safety = 0
  let anySucceeded = false
  while (nextPath && safety < 50) {
    const data: any = await rawFetch(`${GHL_V1}${nextPath}`, v1Headers(creds.ghl_access_token))
    if (!data) return anySucceeded ? ids : null
    anySucceeded = true
    const contacts: Array<Record<string, unknown>> = data?.contacts ?? []
    for (const c of contacts) {
      const tags = Array.isArray((c as any).tags) ? (c as any).tags : []
      const id = (c as any).id
      if (id && tags.some((t: unknown) => String(t).toLowerCase() === ADS_OPTIN_TAG)) {
        ids.add(String(id))
      }
    }
    const next = data?.meta?.nextPageUrl
    nextPath = typeof next === 'string' ? next.replace(GHL_V1, '') : null
    safety++
  }
  return ids
}

async function v1Opportunities(
  creds: GhlCreds,
  adsIds: Set<string>,
): Promise<{ wonCount: number; revenue: number } | null> {
  const pipesData = await rawFetch(`${GHL_V1}/pipelines/`, v1Headers(creds.ghl_access_token))
  const pipelines: Array<{ id: string }> = pipesData?.pipelines ?? []
  if (!pipesData) return null
  if (pipelines.length === 0) return { wonCount: 0, revenue: 0 }

  let wonCount = 0
  let revenue = 0

  for (const pipe of pipelines) {
    let nextPath: string | null = `/pipelines/${pipe.id}/opportunities/?limit=100`
    let safety = 0
    while (nextPath && safety < 40) {
      const data: any = await rawFetch(`${GHL_V1}${nextPath}`, v1Headers(creds.ghl_access_token))
      if (!data) break
      const opps: Array<Record<string, unknown>> = data?.opportunities ?? []
      for (const o of opps) {
        if (String((o as any).status ?? '').toLowerCase() !== 'won') continue
        const cid = extractContactId(o)
        if (!cid || !adsIds.has(cid)) continue
        wonCount++
        const v = (o as any).monetaryValue ?? (o as any).value ?? 0
        const num = typeof v === 'number' ? v : parseFloat(String(v))
        if (Number.isFinite(num)) revenue += num
      }
      const next = data?.meta?.nextPageUrl
      nextPath = typeof next === 'string' ? next.replace(GHL_V1, '') : null
      safety++
    }
  }
  return { wonCount, revenue }
}

async function v1AppointmentsCount(creds: GhlCreds, adsIds: Set<string>): Promise<number | null> {
  // GHL v1 /appointments requires startDate + endDate in epoch ms. Use a wide
  // window so this is effectively all-time.
  const startDate = Date.now() - 5 * 365 * 24 * 60 * 60 * 1000
  const endDate = Date.now() + 365 * 24 * 60 * 60 * 1000
  const url = `${GHL_V1}/appointments/?startDate=${startDate}&endDate=${endDate}`
  const data = await rawFetch(url, v1Headers(creds.ghl_access_token))
  const events = data?.appointments
  if (!Array.isArray(events)) return null
  let count = 0
  for (const e of events) {
    const cid = extractContactId(e as Record<string, unknown>)
    if (cid && adsIds.has(cid)) count++
  }
  return count
}

// ─── v2 fetchers ────────────────────────────────────────────────────────────

async function v2AdsContactIds(creds: GhlCreds): Promise<Set<string> | null> {
  // POST /contacts/search with a tag filter to collect IDs of all contacts
  // carrying the ADS_OPTIN_TAG. The Set is reused to filter opportunities
  // and appointments. Safety-capped at 50 pages (5000 contacts).
  const ids = new Set<string>()
  let page = 1
  let anySucceeded = false
  while (page <= 50) {
    const body = JSON.stringify({
      locationId: creds.ghl_location_id,
      pageLimit: 100,
      page,
      filters: [{ field: 'tags', operator: 'contains', value: ADS_OPTIN_TAG }],
    })
    const data = await rawFetch(
      `${GHL_V2}/contacts/search`,
      v2Headers(creds.ghl_access_token),
      { method: 'POST', body },
    )
    if (!data) return anySucceeded ? ids : null
    anySucceeded = true
    const contacts: Array<Record<string, unknown>> = data?.contacts ?? []
    if (contacts.length === 0) break
    for (const c of contacts) {
      const id = (c as any).id
      if (id) ids.add(String(id))
    }
    if (contacts.length < 100) break
    page++
  }
  return ids
}

async function v2Opportunities(
  creds: GhlCreds,
  adsIds: Set<string>,
): Promise<{ wonCount: number; revenue: number } | null> {
  // All-time count of won opportunities (filtered to ads-tagged contacts)
  // and their summed monetary value.
  let wonCount = 0
  let revenue = 0
  let page = 1
  let anySucceeded = false
  while (page <= 20) {
    const url = `${GHL_V2}/opportunities/search?location_id=${encodeURIComponent(creds.ghl_location_id)}&status=won&limit=100&page=${page}`
    const data = await rawFetch(url, v2Headers(creds.ghl_access_token))
    if (!data) return anySucceeded ? { wonCount, revenue } : null
    anySucceeded = true
    const opps: Array<Record<string, unknown>> = data?.opportunities ?? []
    if (opps.length === 0) break
    for (const o of opps) {
      const cid = extractContactId(o)
      if (!cid || !adsIds.has(cid)) continue
      wonCount++
      const v = (o as any).monetaryValue ?? (o as any).value ?? 0
      const num = typeof v === 'number' ? v : parseFloat(String(v))
      if (Number.isFinite(num)) revenue += num
    }
    if (opps.length < 100) break
    page++
  }
  return { wonCount, revenue }
}

async function v2AppointmentsCount(creds: GhlCreds, adsIds: Set<string>): Promise<number | null> {
  const calsRes = await rawFetch(
    `${GHL_V2}/calendars/?locationId=${encodeURIComponent(creds.ghl_location_id)}`,
    v2Headers(creds.ghl_access_token),
  )
  const calendars: Array<{ id: string }> = calsRes?.calendars ?? []
  if (!calsRes || calendars.length === 0) return null

  // All-time appointment count — use a 5-year window which is effectively unlimited
  // for any normal client. (GHL requires a startTime/endTime window; there is no
  // unbounded option.)
  const startTime = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString()
  const endTime = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  let total = 0
  for (const cal of calendars) {
    const url = `${GHL_V2}/calendars/events?locationId=${encodeURIComponent(creds.ghl_location_id)}&calendarId=${encodeURIComponent(cal.id)}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
    const data = await rawFetch(url, v2Headers(creds.ghl_access_token))
    const events: Array<Record<string, unknown>> = data?.events ?? []
    for (const e of events) {
      const cid = extractContactId(e)
      if (cid && adsIds.has(cid)) total++
    }
  }
  return total
}

function formatUSD(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export async function getGHLData(
  clientId: string,
  metric: string
): Promise<Record<string, unknown> | null> {
  if (metric !== 'performance') return null
  const creds = await getCreds(clientId)
  if (!creds) return null

  const mode = await detectMode(creds)
  if (!mode) return null

  // Fetch the ads-tagged contact ID set once, then use it to filter leads,
  // opportunities, and appointments — every metric is scoped to ads contacts.
  const adsIds = mode === 'v1' ? await v1AdsContactIds(creds) : await v2AdsContactIds(creds)
  if (!adsIds) return null

  const leads = adsIds.size
  const [opps, appointments] = mode === 'v1'
    ? await Promise.all([v1Opportunities(creds, adsIds), v1AppointmentsCount(creds, adsIds)])
    : await Promise.all([v2Opportunities(creds, adsIds), v2AppointmentsCount(creds, adsIds)])

  const result: Record<string, unknown> = {}
  if (leads !== null) result.leads = leads
  if (appointments !== null) result.appointments = appointments
  if (opps) {
    result.deals_closed = opps.wonCount
    result.revenue = formatUSD(opps.revenue)
  }
  // ROAS / CPL require ad-spend data which GHL doesn't expose. Left undefined on
  // purpose so the dashboard renders a "—" until a Meta Ads integration or a
  // manual_ad_spend field is wired in.

  return Object.keys(result).length > 0 ? result : null
}
