import 'dotenv/config'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import app from './app.js'
import createSockets from './sockets.js'
import { startBaileys, bindIO } from './whatsapp/index.js'

const PORT = process.env.PORT || 3000

// Baileys kadang lempar Boom dari socket yang udah ditutup (mis. abis conflict);
// jangan sampai bunuh proses, reconnect ditangani di whatsapp/index.js
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err?.message || err)
})
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err?.message || err)
})

const server = http.createServer(app)
const io = new SocketIOServer(server, { cors: { origin: '*' } })

createSockets(io)
bindIO(io)

server.listen(PORT, async () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
  await startBaileys()
})
