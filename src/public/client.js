const badge = document.getElementById('badge')
const qrBox = document.getElementById('qrBox')
const me = document.getElementById('me')
const ioClient = io()

function setBadge(txt, ok){
  badge.textContent = txt
  badge.className = 'px-3 py-1 rounded-full text-sm border ' + (ok ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300' : 'bg-amber-900/20 border-amber-700 text-amber-300')
}

ioClient.on('status', (s) => {
  setBadge(s.text, s.ok)
  if (s.me) me.textContent = 'Logged in as: ' + s.me
})

ioClient.on('qr', (dataURL) => {
  if(!dataURL){ qrBox.innerHTML = '<span class="text-slate-400 text-sm">Tidak ada QR (mungkin sudah login)</span>'; return }
  qrBox.innerHTML = ''
  const img = new Image()
  img.src = dataURL
  img.alt = 'QR'
  img.className = 'rounded-xl'
  qrBox.appendChild(img)
})

document.getElementById('btnRefresh').onclick = () => fetch('/api/refresh')
document.getElementById('btnLogout').onclick = async () => {
  const r = await fetch('/api/logout', { method: 'POST' })
  const t = await r.text(); alert(t)
  location.reload()
}

document.getElementById('btnSend').onclick = async () => {
  const jid = document.getElementById('jid').value.trim()
  const text = document.getElementById('text').value.trim()
  const token = document.getElementById('apiToken').value.trim()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const r = await fetch('/api/send', { method:'POST', headers, body: JSON.stringify({ jid, text }) })
  const j = await r.json()
  document.getElementById('sendResult').textContent = JSON.stringify(j, null, 2)
}

document.getElementById('btnSendMedia').onclick = async () => {
  const jid = document.getElementById('jid').value.trim()
  const caption = document.getElementById('caption').value.trim()
  const file = document.getElementById('file').files[0]
  const token = document.getElementById('apiToken').value.trim()
  const fd = new FormData()
  fd.append('jid', jid)
  fd.append('caption', caption)
  if (file) fd.append('file', file)
  const headers = {}
  if (token) headers['Authorization'] = 'Bearer ' + token
  const r = await fetch('/api/send-media', { method:'POST', headers, body: fd })
  const j = await r.json()
  document.getElementById('sendResult').textContent = JSON.stringify(j, null, 2)
}
