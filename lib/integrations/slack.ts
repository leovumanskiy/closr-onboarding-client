import 'server-only'
import { n8nWebhookHeaders } from './n8n'

export type SlackDMResult =
  | { ok: true; channel?: string; ts?: string; raw?: unknown }
  | { ok: false; error: string; raw?: unknown }

const SLACK_USER_ID_RE = /^[UW][A-Z0-9]{8,}$/

export function isValidSlackUserId(value: string): boolean {
  return SLACK_USER_ID_RE.test(value.trim())
}

/**
 * Trigger an n8n webhook that fans out to Slack and returns the Slack API
 * response. The n8n workflow is expected to:
 *   1. Call slack chat.postMessage (or equivalent) using slack_user_id as the channel
 *   2. "Respond to Webhook" with the Slack API JSON, e.g. { ok, channel, ts, error }
 *
 * If n8n is not configured or Slack does not confirm delivery, we fail closed
 * and the caller should block.
 */
export async function sendWelcomeSlackDM(params: {
  clientId: string
  slackUserId: string
  slackChannelId?: string | null
  text: string
  email?: string | null
  fullName?: string | null
  businessName?: string | null
}): Promise<SlackDMResult> {
  const url = process.env.N8N_WEBHOOK_WELCOME
  if (!url) {
    console.error('[slack/n8n] N8N_WEBHOOK_WELCOME not configured')
    return { ok: false, error: 'webhook_not_configured' }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: n8nWebhookHeaders(),
      body: JSON.stringify({
        event: 'welcome',
        client_id: params.clientId,
        slack_user_id: params.slackUserId,
        slack_channel_id: params.slackChannelId ?? null,
        email: params.email ?? null,
        full_name: params.fullName ?? null,
        business_name: params.businessName ?? null,
        text: params.text,
      }),
    })

    const bodyText = await res.text()
    let parsed: any = null
    try {
      parsed = bodyText ? JSON.parse(bodyText) : null
    } catch {
      parsed = bodyText
    }

    if (!res.ok) {
      console.error('[slack/n8n] webhook returned non-2xx', { status: res.status })
      return { ok: false, error: `webhook_http_${res.status}`, raw: parsed }
    }

    // n8n's "Respond to Webhook" node should pass through the Slack API
    // response. Slack returns { ok: true|false, channel, ts, error }.
    // Some workflows wrap it under { slack: {...} } or { result: {...} } —
    // accept either shape.
    const slack = parsed?.slack ?? parsed?.result ?? parsed
    const slackOk = slack && typeof slack === 'object' && slack.ok === true

    if (!slackOk) {
      const slackError =
        (slack && typeof slack === 'object' && (slack.error ?? slack.message)) ||
        'slack_delivery_unconfirmed'
      console.error('[slack/n8n] Slack delivery not confirmed', { error: String(slackError) })
      return { ok: false, error: String(slackError), raw: parsed }
    }

    console.log('[slack/n8n] welcome DM delivered', {
      user: params.slackUserId,
      channel: slack.channel,
      ts: slack.ts,
    })
    return { ok: true, channel: slack.channel, ts: slack.ts, raw: parsed }
  } catch (e: any) {
    console.error('[slack/n8n] webhook fetch threw', e)
    return { ok: false, error: e?.message ?? 'fetch_failed' }
  }
}
