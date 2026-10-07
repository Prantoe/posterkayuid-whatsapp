import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import dotenv from 'dotenv'
import app from './app.js'
import createSockets from './sockets.js'
import { startBaileys, bindIO } from './whatsapp/index.js'

dotenv.config()

const PORT = process.env.PORT || 3000

const server = http.createServer(app)
const io = new SocketIOServer(server, { cors: { origin: '*' } })

createSockets(io)
bindIO(io)

server.listen(PORT, async () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
  await startBaileys()
})
