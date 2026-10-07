import pino from 'pino'
import qrcode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  DisconnectReason
} from '@whiskeysockets/baileys'
import { ensureAuthDir } from './state.js'
import { emitQR, emitStatus } from '../sockets.js'
import { sendWebhook } from '../utils/webhook.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const logger = pino({ level: 'info' })

const AUTH_DIR = process.env.AUTH_DIR || path.join(process.cwd(), 'auth')

let sock = null
let meJid = null
let lastQR = null
let statusText = 'disconnected'
let starting = false
let ioRef = null

export function bindIO(io){ ioRef = io }

function setStatus(text, ok = false){
  statusText = text
  if (ioRef) emitStatus(ioRef, text, ok)
}

export function getStatus(){ return statusText }
export function getQR(){ return lastQR }
export function getMe(){ return meJid }
export function getSock(){ return sock }

async function renderQRToDataURL(qr){
  try {
    return await qrcode.toDataURL(qr, { errorCorrectionLevel: 'L', margin: 1, width: 320 })
  } catch { return null }
}

export async function startBaileys(forceNew = false){
  if (starting) return
  starting = true
  try {
    ensureAuthDir(AUTH_DIR)
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version } = await fetchLatestBaileysVersion()

    if (forceNew && sock){
      try { await sock.logout() } catch {}
      sock = null
      meJid = null
    }

    sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      mobile: false,
      browser: Browsers.appropriate('Desktop'),
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (u) => {
      const { connection, lastDisconnect, qr } = u

      if (qr){
        lastQR = await renderQRToDataURL(qr)
        if (ioRef) emitQR(ioRef, lastQR)
        setStatus('QR siap dipindai', false)
        await sendWebhook('connection.update', { state: 'qr', me: meJid })
      }

      if (connection === 'open'){
        meJid = sock.user?.id
        lastQR = null
        if (ioRef) emitQR(ioRef, null)
        setStatus('Terhubung', true)
        await sendWebhook('connection.update', { state: 'open', me: meJid })
      }

      if (connection === 'close'){
        const code = lastDisconnect?.error?.output?.statusCode
        lastQR = null
        if (ioRef) emitQR(ioRef, null)
        if (code === DisconnectReason.loggedOut){
          setStatus('Logout dari perangkat. Perlu scan ulang.', false)
          await sendWebhook('connection.update', { state: 'logged_out' })
        } else {
          setStatus('Terputus. Mencoba sambung ulang…', false)
          await sendWebhook('connection.update', { state: 'reconnect' })
          setTimeout(() => startBaileys(), 1500)
        }
      }
    })

    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages?.[0]
      if (!msg) return
      await sendWebhook('messages.upsert', { type: m.type, message: sanitizeMessage(msg) })
    })

    sock.ev.on('messages.update', async (updates) => {
      await sendWebhook('messages.update', { updates })
    })

  } catch (e){
    logger.error({ err: e }, 'startBaileys failed')
  } finally {
    starting = false
  }
}

export async function refreshBaileys(){
  if (sock?.ev){
    try { await sock.logout() } catch {}
  }
  // hapus folder auth
  fs.rmSync(AUTH_DIR, { recursive: true, force: true })
  await startBaileys(true)
}

export async function logoutBaileys(){
  if (sock?.ev){
    await sock.logout()
  }
  meJid = null
  setStatus('Logged out. Silakan scan ulang.', false)
}

export async function sendText(jid, text){
  if (!sock) throw new Error('Not connected')
  return await sock.sendMessage(jid, { text })
}

export async function sendDocument(jid, buffer, mimetype, filename, caption){
  if (!sock) throw new Error('Not connected')
  return await sock.sendMessage(jid, { caption, document: buffer, mimetype, fileName: filename })
}

function sanitizeMessage(msg){
  return {
    key: msg.key,
    message: msg.message ? Object.keys(msg.message) : undefined,
    pushName: msg.pushName,
    messageTimestamp: msg.messageTimestamp,
    participant: msg.participant,
  }
}
