import crypto from 'crypto'

const DASH_USER = process.env.DASH_USER || ''
const DASH_PASS = process.env.DASH_PASS || ''

function timingSafeEqualStr(a, b) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function basicAuth(req, res, next) {
  if (!DASH_USER || !DASH_PASS) return next()
  const h = req.headers['authorization'] || ''
  const m = /^Basic\s+(.+)$/.exec(h)
  if (!m) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Dashboard"')
    return res.status(401).send('Authentication required')
  }
  try {
    const decoded = Buffer.from(m[1], 'base64').toString('utf8')
    const i = decoded.indexOf(':')
    const user = decoded.slice(0, i)
    const pass = decoded.slice(i + 1)
    if (timingSafeEqualStr(user, DASH_USER) && timingSafeEqualStr(pass, DASH_PASS)) return next()
  } catch {}
  res.setHeader('WWW-Authenticate', 'Basic realm="Dashboard"')
  return res.status(401).send('Invalid credentials')
}

export default basicAuth
