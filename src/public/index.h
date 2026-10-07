<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Baileys Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-slate-950 text-slate-100">
    <div class="max-w-6xl mx-auto p-6">
      <header class="flex items-center justify-between mb-6">
        <h1 class="text-2xl md:text-3xl font-bold">Baileys WebSocket Dashboard</h1>
        <div class="flex items-center gap-2">
          <span id="badge" class="px-3 py-1 rounded-full text-sm border border-slate-700">memulai…</span>
          <button id="btnRefresh" class="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500">Refresh QR</button>
          <button id="btnLogout" class="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600">Logout</button>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 class="font-semibold mb-3">Scan QR</h2>
          <div id="qrBox" class="w-72 h-72 bg-slate-800 border border-dashed border-slate-700 rounded-xl flex items-center justify-center">
            <span class="text-slate-400 text-sm">QR akan muncul di sini…</span>
          </div>
          <p id="me" class="text-slate-400 mt-4 text-sm"></p>
        </section>

        <section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 class="font-semibold mb-3">Kirim Pesan</h2>
          <div class="space-y-3">
            <input id="apiToken" placeholder="API Bearer Token (opsional)" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
            <input id="jid" placeholder="jid (contoh: 62812xxxxxxx@s.whatsapp.net)" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
            <input id="text" placeholder="pesan teks" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
            <div class="flex items-center gap-2">
              <button id="btnSend" class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500">Kirim Teks</button>
              <label class="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer">
                <input type="file" id="file" class="hidden" />
                <span>Pilih File</span>
              </label>
              <input id="caption" placeholder="caption (opsional)" class="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              <button id="btnSendMedia" class="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500">Kirim Media</button>
            </div>
            <pre id="sendResult" class="text-xs text-slate-400 whitespace-pre-wrap"></pre>
          </div>
        </section>
      </div>

      <section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 mt-6">
        <h2 class="font-semibold mb-3">REST API</h2>
        <pre class="text-slate-400 text-sm whitespace-pre-wrap">GET  /api/status
GET  /api/refresh
POST /api/logout
POST /api/send       (Authorization: Bearer &lt;token&gt;)
POST /api/send-media (Authorization: Bearer &lt;token&gt;)</pre>
      </section>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <!-- <script src="/client.js"></script> -->
     <script>
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

     </script>
  </body>
</html>
