import { Router } from 'express'
import { sendText } from '../../whatsapp/index.js'
import { normalizeNum } from '../../utils/normalize.js'
import { z } from 'zod'
import PQueue from 'p-queue'

const router = Router()

const MAX_PER_SECOND = parseInt(process.env.RATE_MAX_PER_SEC || '8', 10)
const CONCURRENCY    = parseInt(process.env.RATE_CONCURRENCY || '1', 10)
const q = new PQueue({
  interval: 1000,
  intervalCap: MAX_PER_SECOND,
  concurrency: CONCURRENCY
})

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

const sentCache = new Map()
const IDEMP_TTL_MS = 24 * 60 * 60 * 1000
function sweepIdempotency() {
  const now = Date.now()
  for (const [k, ts] of sentCache.entries()) {
    if (now - ts > IDEMP_TTL_MS) sentCache.delete(k)
  }
}
setInterval(sweepIdempotency, 60_000).unref()


router.post('/wa', async (req, res) => {
 
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({
      error: 'invalid_body',
      details: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    })
  }

  const { campaign_id } = parsed.data
  const incoming = parsed.data.messages

  const seenKeys = new Set()
  const accepted = []
  const rejected = []

  for (const m of incoming) {
    if (seenKeys.has(m.idempotency_key)) {
      rejected.push({ reason: 'duplicate_in_request', m })
      continue
    }
    seenKeys.add(m.idempotency_key)

    if (sentCache.has(m.idempotency_key)) {
      rejected.push({ reason: 'duplicated_by_idempotency_cache', m })
      continue
    }

    const jid = normalizeNum(m.to)
    if (!jid) {
      rejected.push({ reason: 'invalid_phone', m })
      continue
    }

    accepted.push({ ...m, to: jid })
  }

  if (accepted.length === 0) {
    return res.status(400).json({ error: 'no_valid_message', rejected_count: rejected.length })
  }

  const enqueuedAt = Date.now()
  const batchId = `${campaign_id || 'default'}-${enqueuedAt}`

  for (const msg of accepted) {
    q.add(async () => {
        // console.log('Sending message', msg.to,'\n\n', msg.text)
      try {
        await sendText(msg.to, msg.text)
        sentCache.set(msg.idempotency_key, Date.now())
      } catch (err) {
        console.error('[WA SEND FAIL]', {
          to: msg.to,
          err: err?.message || String(err),
        })
      }
    })
  }

  return res.status(202).json({
    ok: true,
    batch_id: batchId,
    accepted_count: accepted.length,
    rejected_count: rejected.length,
    queue: {
      size: q.size,
      pending: q.pending,
      rate: { per_second: MAX_PER_SECOND, concurrency: CONCURRENCY },
    },
  })
})


export default router
