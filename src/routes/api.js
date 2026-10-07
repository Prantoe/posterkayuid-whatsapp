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
    if (!group_id || !to || !file) return res.status(400).json({ ok: false, error: 'group_id, to & file wajib' })

    const buf = fs.readFileSync(file.path)
    const mime = file.mimetype
    const filename = file.originalname

    const r = await sendDocument(normalizeNum(to), buf, mime, filename, caption)
    fs.rmSync(file.path, { force: true })

    res.json({ ok: true, key: r?.key })
  } catch (e){
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})


export default router
