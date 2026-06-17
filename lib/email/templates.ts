const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function base(title: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#111111;max-width:560px;margin:0 auto;padding:32px 16px;background:#ffffff">
<div style="padding:0">
<img src="${APP_URL}/brand/closr-light.png" alt="CLOSR" style="height:20px;margin-bottom:36px;display:block" onerror="this.style.display='none'"/>
${body}
<hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0"/>
<p style="color:#999999;font-size:13px;margin:0">You're receiving this because you're enrolled in our onboarding program.</p>
</div></body></html>`
}

export function stepReminderEmail(opts: {
  clientName: string
  stepTitle: string
  moduleTitle: string
  dueAt: Date
  link: string
}) {
  return base(
    `Action required: ${opts.stepTitle}`,
    `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;letter-spacing:-0.02em">Action required</h2>
    <p style="color:#555555;margin:0 0 16px">Hi ${opts.clientName},</p>
    <p style="margin:0 0 16px">You have a pending step in your onboarding journey:</p>
    <div style="background:#fafafa;border:1px solid #e5e5e5;border-left:3px solid #111111;border-radius:8px;padding:16px;margin:0 0 16px">
      <p style="margin:0 0 4px;font-weight:600;font-size:15px">${opts.stepTitle}</p>
      <p style="margin:0;color:#888888;font-size:14px">${opts.moduleTitle}</p>
    </div>
    <p style="color:#cc3333;font-size:14px;margin:0 0 16px">Due: ${opts.dueAt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    <a href="${opts.link}" style="display:inline-block;background:#111111;color:#f5f2ec;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Complete Now &rarr;
    </a>`
  )
}

export function welcomeEmail(opts: { clientName: string; email: string; link: string }) {
  return base(
    'Welcome to CLOSR',
    `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;letter-spacing:-0.02em">Welcome, ${opts.clientName}.</h2>
    <p style="color:#555555;margin:0 0 20px">Your account is ready. Complete your onboarding journey to get started.</p>
    <a href="${opts.link}" style="display:inline-block;background:#111111;color:#f5f2ec;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Start Your Journey &rarr;
    </a>`
  )
}

export function stuckAlertEmail(opts: { clientName: string; stepTitle: string; hoursStuck: number }) {
  return base(
    `${opts.clientName} needs attention`,
    `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;letter-spacing:-0.02em">Client needs attention</h2>
    <p style="color:#555555;margin:0 0 20px"><strong>${opts.clientName}</strong> has been stuck on <strong>${opts.stepTitle}</strong> for ${opts.hoursStuck} hours.</p>
    <a href="${APP_URL}/admin/clients" style="display:inline-block;background:#111111;color:#f5f2ec;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      View in Admin &rarr;
    </a>`
  )
}
