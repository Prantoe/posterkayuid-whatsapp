import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { sendText, sendDocument, getMe, getStatus } from '../whatsapp/index.js'
import { normalizeNum } from '../utils/normalize.js'

const router = Router()
const upload = multer({ dest: path.join(process.cwd(), 'uploads') })




router.get('/status', (req, res) => {
  res.json({ status: getStatus(), me: getMe() })
})


router.post('/send-message', async (req, res) => {
  try {
    const { group_id, to, message } = req.body || {};
    if  (!message) return res.status(400).json({ ok: false, error: 'group_id, to & message wajib diisi' })
      let chatId;
      if (group_id) {
        chatId = group_id;
      } else if (to) {
        chatId = normalizeNum(to)
        if (!chatId) return res.status(400).json({ ok: false, error: 'invalid_phone' })
      } else {
        return res.status(400).json({ status: 'error', message: 'Harus menyertakan group_id atau to' });
      }
    const r = await sendText(chatId, message)
    res.json({ ok: true, key: r?.key })
  } catch (e){
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

router.post('/send-media', upload.single('file'), async (req, res) => {
  try {
    const { group_id, to, caption } = req.body || {}
    const file = req.file
    if ((!group_id && !to) || !file) return res.status(400).json({ ok: false, error: 'group_id atau to, plus file wajib' })

    const chatId = group_id || normalizeNum(to)
    if (!chatId) return res.status(400).json({ ok: false, error: 'invalid_phone' })

    const buf = fs.readFileSync(file.path)
    const r = await sendDocument(chatId, buf, file.mimetype, file.originalname, caption)

    res.json({ ok: true, key: r?.key })
  } catch (e){
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  } finally {
    if (req.file) fs.rmSync(req.file.path, { force: true })
  }
})


export default router
