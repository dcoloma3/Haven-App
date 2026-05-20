export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { firstName, lastName, email, facility, message } = req.body
  if (!email || !message) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Haven Website <noreply@havencare.app>',
      to: ['support@havencare.app'],
      reply_to: email,
      subject: `New inquiry — ${firstName} ${lastName}${facility ? ` · ${facility}` : ''}`,
      text: `From: ${firstName} ${lastName} <${email}>\nFacility: ${facility || '—'}\n\n${message}`,
    }),
  })

  if (!r.ok) {
    const err = await r.text()
    console.error('Resend error:', err)
    return res.status(500).json({ error: 'Failed to send message' })
  }

  return res.status(200).json({ ok: true })
}
