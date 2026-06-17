import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM ?? 'onboarding@yourdomain.com'

export interface SendEmailArgs {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email mock]', { to, subject })
    return { success: true }
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from: FROM, to, subject, html })
    return { success: true }
  } catch (err) {
    console.error('[Email] send error', err)
    return { error: String(err) }
  }
}
