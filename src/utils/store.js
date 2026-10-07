import fs from 'fs'
import path from 'path'

const DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const FILE = path.join(DIR, 'messages.json')
const TTL_MS = 24 * 60 * 60 * 1000

let map = new Map()
try {
  map = new Map(Object.entries(JSON.parse(fs.readFileSync(FILE, 'utf8'))))
} catch {}

// pesan yang lagi in-flight pas proses mati gak bakal kekirim -> bisa di-retry kasir
for (const [k, v] of map) {
  if (v.status === 'queued' || v.status === 'sending') {
    map.set(k, { ...v, status: 'failed', error: 'interrupted_by_restart' })
  }
}

let timer = null
function persist() {
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    try {
      fs.mkdirSync(DIR, { recursive: true })
      fs.writeFileSync(FILE + '.tmp', JSON.stringify(Object.fromEntries(map)))
      fs.renameSync(FILE + '.tmp', FILE)
    } catch (e) {
      console.error('[store] persist failed', e?.message || e)
    }
  }, 500)
}

export function getMsg(key) {
  return map.get(key)
}

export function setMsg(key, patch) {
  map.set(key, { ...map.get(key), ...patch, updated_at: Date.now() })
  persist()
}

setInterval(() => {
  const now = Date.now()
  for (const [k, v] of map) {
    if (now - (v.updated_at || 0) > TTL_MS) map.delete(k)
  }
  persist()
}, 60_000).unref()
