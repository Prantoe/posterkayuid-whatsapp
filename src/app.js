import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import basicAuth from 'express-basic-auth'
import crypto from 'crypto'


import dashboardRouter from './routes/dashboard.js'
import apiRouter from './routes/api.js'
import webhookRouter from './routes/webhook.js'
import remindRouter from './routes/api/reminder.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/dashboard', basicAuth({
  users: { [process.env.DASH_USER]: process.env.DASH_PASS },
  challenge: true,
  unauthorizedResponse: 'Unauthorized'
}), dashboardRouter)

app.use('/api', bearerAuth, apiRouter)
app.use('/api/reminder', bearerAuth, remindRouter)
app.use('/', webhookRouter)

const API_TOKEN = process.env.API_TOKEN || ''

function timingSafeEqualStr(a, b){
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function bearerAuth(req, res, next){
  if (!API_TOKEN) return next() 
  const h = req.headers['authorization'] || ''
  const m = /^Bearer\s+(.+)$/.exec(h)
  if (!m) return res.status(401).json({ ok:false, error:'missing bearer token' })
  const token = m[1]
  if (timingSafeEqualStr(token, API_TOKEN)) return next()
  return res.status(401).json({ ok:false, error:'invalid token' })
}

export default app
