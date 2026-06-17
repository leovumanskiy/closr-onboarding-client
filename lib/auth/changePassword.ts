'use server'

import { requireUser } from './requireUser'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isValidSlackUserId, sendWelcomeSlackDM } from '@/lib/integrations/slack'

const WELCOME_MESSAGE =
  "Welcome aboard! Your account is all set up — hop back into the portal whenever you're ready to kick off your onboarding journey. We're glad to have you with us."

const PRE_VERIFY_WINDOW_MS = 15 * 60 * 1000

function slackErrorMessage(error: string): string {
  return error === 'webhook_not_configured'
    ? 'Slack delivery is not configured on the server. Contact your admin so we can finish setting up your account.'
    : `We couldn't deliver the welcome Slack message (${error}). Double-check your Slack User ID and try again.`
}

export async function verifyAndSendWelcomeSlackDM({
  slackUserId,
}: {
  slackUserId: string
}): Promise<{ error?: string; success?: true; channel?: string; ts?: string }> {
  const session = await requireUser()
  const service = createServiceClient()

  const trimmedSlackId = slackUserId?.trim() ?? ''
  if (!trimmedSlackId) return { error: 'Slack User ID is required.' }
  if (!isValidSlackUserId(trimmedSlackId)) {
    return { error: 'Slack User ID must look like "U0XXXXXXXX" — find it in Slack via your profile → More → Copy member ID.' }
  }

  const { data: user } = await service
    .from('clients')
    .select('email, full_name, business_name, slack_channel_id')
    .eq('id', session.id)
    .single()

  if (!user) return { error: 'User not found.' }

  // Welcome DM is first-onboarding only. A prior successful self_change_password
  // means this client has already gone through the flow once — admin-triggered
  // password resets reuse the same /force-password screen but must not re-fire
  // the n8n welcome workflow.
  const { data: priorChange } = await service
    .from('audit_log')
    .select('id')
    .eq('actor_id', session.id)
    .eq('action', 'self_change_password')
    .limit(1)
    .maybeSingle()

  if (priorChange) {
    return { success: true }
  }

  const slackResult = await sendWelcomeSlackDM({
    clientId: session.id,
    slackUserId: trimmedSlackId,
    slackChannelId: (user as any).slack_channel_id,
    text: WELCOME_MESSAGE,
    email: (user as any).email,
    fullName: (user as any).full_name,
    businessName: (user as any).business_name,
  })

  if (!slackResult.ok) {
    await service.from('audit_log').insert({
      actor_id: session.id,
      action: 'welcome_slack_dm_failed',
      subject_table: 'clients',
      subject_id: session.id,
      meta: {
        slack_user_id: trimmedSlackId,
        slack_dm_error: slackResult.error,
      },
    } as any)

    return { error: slackErrorMessage(slackResult.error) }
  }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'welcome_slack_dm_sent',
    subject_table: 'clients',
    subject_id: session.id,
    meta: {
      slack_user_id: trimmedSlackId,
      slack_dm_channel: slackResult.channel ?? null,
      slack_dm_ts: slackResult.ts ?? null,
    },
  } as any)

  return { success: true, channel: slackResult.channel, ts: slackResult.ts }
}

export async function changeOwnPassword({
  currentPassword,
  newPassword,
  slackUserId,
}: {
  currentPassword: string
  newPassword: string
  slackUserId?: string
}): Promise<{ error?: string; success?: true }> {
  const session = await requireUser()
  const service = createServiceClient()

  const { data: user } = await service
    .from('clients')
    .select('email, full_name, business_name, slack_channel_id')
    .eq('id', session.id)
    .single()

  if (!user) return { error: 'User not found.' }

  if (newPassword.length < 8) return { error: 'New password must be at least 8 characters.' }
  if (newPassword === currentPassword) return { error: 'New password must be different from your current password.' }

  // Re-resets (admin-triggered) skip the Slack step entirely. Detect by looking
  // for a prior successful self_change_password — if found, slackUserId is not
  // collected by the form, and the DM/audit pieces below are skipped.
  const { data: priorChange } = await service
    .from('audit_log')
    .select('id')
    .eq('actor_id', session.id)
    .eq('action', 'self_change_password')
    .limit(1)
    .maybeSingle()
  const isFirstOnboarding = !priorChange

  const trimmedSlackId = slackUserId?.trim() ?? ''
  if (isFirstOnboarding) {
    if (!trimmedSlackId) return { error: 'Slack User ID is required.' }
    if (!isValidSlackUserId(trimmedSlackId)) {
      return { error: 'Slack User ID must look like "U0XXXXXXXX" — find it in Slack via your profile → More → Copy member ID.' }
    }
  }

  // Verify current password on a THROWAWAY client. Calling signInWithPassword
  // on the shared `service` client pins the returned access token in its
  // in-memory auth state, which then gets sent as the Authorization header on
  // every subsequent service.from(...) call — downgrading service_role to
  // authenticated and breaking the clients UPDATE below (mig 0016 revoked
  // UPDATE on clients from authenticated).
  {
    const verifier = createServiceClient()
    const { error: verifyErr } = await verifier.auth.signInWithPassword({
      email: (user as any).email,
      password: currentPassword,
    })
    if (verifyErr) return { error: 'Current password is incorrect.' }
  }

  // Look for a recent successful pre-verification (welcome DM already sent
  // during the Slack step). If found, skip the redundant DM call here.
  const sinceIso = new Date(Date.now() - PRE_VERIFY_WINDOW_MS).toISOString()
  const { data: recent } = await service
    .from('audit_log')
    .select('meta')
    .eq('actor_id', session.id)
    .eq('action', 'welcome_slack_dm_sent')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const preVerified =
    !!recent && (recent as any).meta?.slack_user_id === trimmedSlackId

  let slackChannel: string | null = (recent as any)?.meta?.slack_dm_channel ?? null
  let slackTs: string | null = (recent as any)?.meta?.slack_dm_ts ?? null

  if (!preVerified && isFirstOnboarding) {
    // Fallback: caller skipped the pre-verify step. Send the DM inline and
    // gate the password change on delivery, same as the original behaviour.
    const slackResult = await sendWelcomeSlackDM({
      clientId: session.id,
      slackUserId: trimmedSlackId,
      slackChannelId: (user as any).slack_channel_id,
      text: WELCOME_MESSAGE,
      email: (user as any).email,
      fullName: (user as any).full_name,
      businessName: (user as any).business_name,
    })

    if (!slackResult.ok) {
      await service.from('audit_log').insert({
        actor_id: session.id,
        action: 'self_change_password_blocked_slack',
        subject_table: 'clients',
        subject_id: session.id,
        meta: {
          slack_user_id: trimmedSlackId,
          slack_dm_error: slackResult.error,
        },
      } as any)

      return { error: slackErrorMessage(slackResult.error) }
    }

    slackChannel = slackResult.channel ?? null
    slackTs = slackResult.ts ?? null
  }

  // Update the password via Supabase Auth on the user's own session.
  const supabaseUser = await createServerSupabase()
  const { error: pwErr } = await supabaseUser.auth.updateUser({ password: newPassword })
  if (pwErr) {
    console.error('[changeOwnPassword] auth.updateUser failed', {
      clientId: session.id,
      code: (pwErr as any).code,
      status: (pwErr as any).status,
      message: pwErr.message,
    })
    return { error: 'Failed to update password. Please try again.' }
  }

  // Only overwrite slack_user_id on first onboarding (when the user explicitly
  // entered it). Subsequent admin resets don't re-collect it.
  const clientPatch: Record<string, unknown> = {
    must_change_password: false,
    updated_at: new Date().toISOString(),
  }
  if (isFirstOnboarding) clientPatch.slack_user_id = trimmedSlackId

  const { error } = await service
    .from('clients')
    .update(clientPatch as any)
    .eq('id', session.id)

  if (error) {
    console.error('[changeOwnPassword] clients update failed', {
      clientId: session.id,
      message: error.message,
    })
    return { error: 'Failed to update password. Please try again.' }
  }

  await service.from('audit_log').insert({
    actor_id: session.id,
    action: 'self_change_password',
    subject_table: 'clients',
    subject_id: session.id,
    meta: {
      slack_user_id: trimmedSlackId || null,
      slack_dm_ok: isFirstOnboarding,
      slack_dm_channel: slackChannel,
      slack_dm_ts: slackTs,
      pre_verified: preVerified,
      first_onboarding: isFirstOnboarding,
    },
  } as any)

  return { success: true }
}
