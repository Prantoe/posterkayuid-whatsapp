import { Router } from 'express'

const router = Router()

router.post('/webhook', async (req, res) => {
  const secret = req.headers['x-webhook-secret']
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET){
    return res.status(401).json({ ok: false, error: 'invalid secret' })
  }
  // console.log('[incoming webhook]', JSON.stringify(req.body))
  res.json({ ok: true })
})

export default router
