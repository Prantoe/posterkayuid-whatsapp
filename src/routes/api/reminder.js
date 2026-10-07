import { Router } from 'express'
import { sendText, isConnected, isOnWhatsApp } from '../../whatsapp/index.js'
import { normalizeNum } from '../../utils/normalize.js'
import { sendWebhook } from '../../utils/webhook.js'
import { getMsg, setMsg } from '../../utils/store.js'
import { z } from 'zod'
import PQueue from 'p-queue'

const router = Router()

// 1 pesan per ~2-5 detik (jitter) biar gak keliatan bot -> kurangi risiko banned
const MIN_DELAY_MS = parseInt(process.env.SEND_MIN_DELAY_MS || '2000', 10)
const MAX_DELAY_MS = parseInt(process.env.SEND_MAX_DELAY_MS || '5000', 10)
const MAX_ATTEMPTS = parseInt(process.env.SEND_MAX_ATTEMPTS || '3', 10)
const RETRY_BASE_MS = 5000

const q = new PQueue({ concurrency: 1 })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const jitter = () => MIN_DELAY_MS + Math.random() * Math.max(0, MAX_DELAY_MS - MIN_DELAY_MS)

const MessageSchema = z.object({
  to: z.string().min(5),
  text: z.string().min(1),
  idempotency_key: z.string().min(8),
  meta: z.record(z.string(), z.unknown()).optional(),
})

const BodySchema = z.object({
  campaign_id: z.string().optional(),
  messages: z.array(MessageSchema).min(1),
})

async function deliver(msg, campaign_id) {
  const key = msg.idempotency_key
  let lastErr = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    setMsg(key, { status: 'sending', attempts: attempt })
    try {
      if (!isConnected()) throw new Error('not_connected')

      if (!(await isOnWhatsApp(msg.to))) {
        // permanen, gak usah retry
        return finish(msg, campaign_id, 'failed', 'not_on_whatsapp')
      }

      const r = await sendText(msg.to, msg.text)
      return finish(msg, campaign_id, 'sent', null, r?.key?.id)
    } catch (err) {
      lastErr = err?.message || String(err)
      console.error('[WA SEND FAIL]', { to: msg.to, attempt, err: lastErr })
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_BASE_MS * 2 ** (attempt - 1))
    }
  }
  return finish(msg, campaign_id, 'failed', lastErr)
}

async function finish(msg, campaign_id, status, error, wa_message_id) {
  const key = msg.idempotency_key
  setMsg(key, { status, error, wa_message_id })
  await sendWebhook(status === 'sent' ? 'message.sent' : 'message.failed', {
    idempotency_key: key,
    campaign_id,
    to: msg.to,
    error,
    wa_message_id,
    meta: msg.meta,
  })
}

router.post('/wa', async (req, res) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({
      error: 'invalid_body',
      details: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    })
  }

  if (!isConnected()) {
    return res.status(503).json({ error: 'wa_not_connected' })
  }

  const { campaign_id } = parsed.data
  const seenKeys = new Set()
  const accepted = []
  const rejected = []

  for (const m of parsed.data.messages) {
    const key = m.idempotency_key
    if (seenKeys.has(key)) {
      rejected.push({ idempotency_key: key, reason: 'duplicate_in_request' })
      continue
    }
    seenKeys.add(key)

    // queued/sent = udah ditangani; failed boleh dikirim ulang dengan key yang sama
    const prev = getMsg(key)
    if (prev && (prev.status === 'queued' || prev.status === 'sending' || prev.status === 'sent')) {
      rejected.push({ idempotency_key: key, reason: 'duplicated_by_idempotency_cache', status: prev.status })
      continue
    }

    const jid = normalizeNum(m.to)
    if (!jid) {
      rejected.push({ idempotency_key: key, reason: 'invalid_phone' })
      continue
    }

    accepted.push({ ...m, to: jid })
  }

  if (accepted.length === 0) {
    return res.status(400).json({ error: 'no_valid_message', rejected_count: rejected.length, rejected })
  }

  const batchId = `${campaign_id || 'default'}-${Date.now()}`

  for (const msg of accepted) {
    // di-set sebelum masuk queue biar retry cepat dari kasir gak dobel
    setMsg(msg.idempotency_key, { status: 'queued', to: msg.to, campaign_id, attempts: 0 })
    q.add(async () => {
      try {
        await deliver(msg, campaign_id)
      } finally {
        await sleep(jitter())
      }
    })
  }

  return res.status(202).json({
    ok: true,
    batch_id: batchId,
    accepted_count: accepted.length,
    rejected_count: rejected.length,
    rejected,
    queue: { size: q.size, pending: q.pending },
  })
})

// polling alternatif kalau kasir gak mau pakai webhook
router.get('/status/:key', (req, res) => {
  const m = getMsg(req.params.key)
  if (!m) return res.status(404).json({ error: 'not_found' })
  res.json(m)
})

export default router
