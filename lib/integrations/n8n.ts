import 'server-only'

/**
 * Shared headers for every outbound n8n webhook call the portal makes.
 *
 * Adds the shared-secret auth header (`X-Closr-Webhook-Secret`) whenever
 * CLOSR_N8N_WEBHOOK_SECRET is set, so all n8n webhooks are authenticated and
 * the n8n side can reject any call that doesn't carry the secret. The value is
 * read from the environment and never hard-coded. When the env var is unset the
 * header is omitted, so this is a no-op until the secret is configured.
 */
export function n8nWebhookHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  const secret = process.env.CLOSR_N8N_WEBHOOK_SECRET
  if (secret) headers['X-Closr-Webhook-Secret'] = secret
  return headers
}
