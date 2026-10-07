export async function sendWebhook(event, payload = {}){
  const url = process.env.WEBHOOK_URL
  if (!url) return { ok: false, skipped: true }

  const body = JSON.stringify({ event, payload, ts: Date.now() })
  const headers = { 'Content-Type': 'application/json' }
  if (process.env.WEBHOOK_SECRET) headers['X-Webhook-Secret'] = process.env.WEBHOOK_SECRET

  try {
    const r = await fetch(url, { method: 'POST', headers, body })
    const text = await r.text()
    return { ok: r.ok, status: r.status, body: text }
  } catch (e){
    return { ok: false, error: String(e?.message || e) }
  }
}
