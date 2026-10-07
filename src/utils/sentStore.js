import fs from 'fs'
import path from 'path'
import { BufferJSON } from '@whiskeysockets/baileys'

// Baileys butuh isi pesan asli buat jawab retry receipt (getMessage).
// Disimpan ke disk biar tahan restart; Buffer (mediaKey dll) lewat BufferJSON.
const DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const FILE = path.join(DIR, 'sent-messages.json')
const TTL_MS = 24 * 60 * 60 * 1000

let map = new Map()
try {
  map = new Map(JSON.parse(fs.readFileSync(FILE, 'utf8'), BufferJSON.reviver))
} catch {}

let timer = null
function persist() {
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    try {
      fs.mkdirSync(DIR, { recursive: true })
      fs.writeFileSync(FILE + '.tmp', JSON.stringify([...map], BufferJSON.replacer))
      fs.renameSync(FILE + '.tmp', FILE)
    } catch (e) {
      console.error('[sentStore] persist failed', e?.message || e)
    }
  }, 500)
}

export function rememberSent(sent) {
  const id = sent?.key?.id
  if (!id || !sent.message) return
  map.set(id, { message: sent.message, ts: Date.now() })
  persist()
}

export function getSentMessage(id) {
  return map.get(id)?.message
}

setInterval(() => {
  const now = Date.now()
  for (const [id, v] of map) {
    if (now - v.ts > TTL_MS) map.delete(id)
  }
  persist()
}, 10 * 60_000).unref()
