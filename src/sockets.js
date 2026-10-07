import { getStatus, getQR, getMe } from './whatsapp/index.js'

export default function createSockets(io){
  io.on('connection', (socket) => {
    socket.emit('status', { text: getStatus(), ok: getStatus() === 'Terhubung', me: getMe() })
    if (getQR()) socket.emit('qr', getQR())
  })
}

export function emitStatus(io, status, ok){
  io.emit('status', { text: status, ok, me: getMe() })
}

export function emitQR(io, dataURL){
  io.emit('qr', dataURL)
}
