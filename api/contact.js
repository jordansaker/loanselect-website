import { Resend } from 'resend';

const FROM = process.env.CONTACT_FROM_EMAIL || 'Loan Select Cairns <onboarding@resend.dev>';
const TO = process.env.CONTACT_TO_EMAIL || 'jordan.saker95@gmail.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const topic = String(body.topic || '').trim();
  const message = String(body.message || '').trim();
  const botcheck = String(body.botcheck || '').trim();

  if (botcheck) return res.status(200).json({ ok: true });

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (name.length > 200 || email.length > 200 || phone.length > 50 || topic.length > 100 || message.length > 5000) {
    return res.status(400).json({ error: 'One or more fields are too long.' });
  }

  const lines = [
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Phone:   ${phone || '—'}`,
    `Topic:   ${topic || '—'}`,
    '',
    'Message:',
    message || '(no message)',
  ];

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return res.status(503).json({ error: 'Mail service is not configured yet. Please call us instead.' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM,
      to: TO,
      reply_to: email,
      subject: `New enquiry from ${name}${topic ? ` — ${topic}` : ''}`,
      text: lines.join('\n'),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend send failed:', err);
    return res.status(500).json({ error: 'Could not send your message. Please call us instead.' });
  }
}
