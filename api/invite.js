export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, role, communityName, inviterName } = req.body
  if (!email || !communityName) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const roleLabel = role === 'admin' ? 'Manager' : 'Staff Member'
  const signupUrl = `https://havencare.app/signup?email=${encodeURIComponent(email)}&community=${encodeURIComponent(communityName)}`
  const inviter = inviterName || 'Your manager'

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

        <!-- Header -->
        <tr>
          <td style="background:#042C53;padding:28px 32px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:10px;">
                  <svg width="26" height="32" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2,28 L2,15 L12,6 L22,15 L22,28 Z" stroke="white" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
                    <rect x="4" y="20" width="5" height="8" fill="white" rx="0.5"/>
                    <rect x="13" y="18" width="5" height="5" stroke="white" stroke-width="1.5" fill="none" rx="0.5"/>
                    <circle cx="12" cy="1.5" r="1.5" fill="#378ADD"/>
                  </svg>
                </td>
                <td>
                  <span style="font-size:22px;font-weight:500;color:#ffffff;letter-spacing:-0.5px;">haven</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#0f172a;">You've been invited!</p>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
              <strong style="color:#0f172a;">${inviter}</strong> has invited you to join
              <strong style="color:#0f172a;"> ${communityName}</strong> on Haven as a
              <strong style="color:#0f172a;"> ${roleLabel}</strong>.
            </p>

            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
              Haven is a senior living management platform that helps your team manage residents,
              medications, incidents, and more — all in one place.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#042C53;border-radius:10px;">
                  <a href="${signupUrl}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Create your account →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">Or copy this link into your browser:</p>
            <p style="margin:0 0 24px;font-size:12px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;word-break:break-all;">${signupUrl}</p>

            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
              Your email address <strong style="color:#64748b;">${email}</strong> has been pre-registered.
              Use it when creating your account.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
              You received this because ${inviter} invited you to Haven.
              If you weren't expecting this, you can safely ignore it.
              <br><a href="https://havencare.app" style="color:#185FA5;text-decoration:none;">havencare.app</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Haven <noreply@havencare.app>',
      to: [email],
      subject: `You've been invited to join ${communityName} on Haven`,
      html,
    }),
  })

  if (!r.ok) {
    const err = await r.text()
    console.error('Resend invite error:', err)
    return res.status(500).json({ error: 'Failed to send invite email' })
  }

  return res.status(200).json({ ok: true })
}
