# Baileys Web QR + REST API + Webhook (Tailwind Dashboard, Secured)

Dashboard modern (Tailwind via CDN) untuk scan QR, status, logout, kirim pesan; plus REST API (Bearer) dan webhook (outgoing + incoming).

## Setup
```bash
npm i
cp .env.example .env
# edit .env
npm start
# buka http://localhost:3000
```
## Security
- **Dashboard Basic Auth**: set di `.env`
  ```
  DASH_USER=admin
  DASH_PASS=rahasia123
  ```
- **API Bearer Token** (untuk `/api/send` & `/api/send-media`)
  ```
  API_TOKEN=supersecret
  ```
  Header: `Authorization: Bearer supersecret`

## REST API
- `GET  /api/status`
- `GET  /api/refresh`
- `POST /api/logout`
- `POST /api/send` (Bearer) — body: `{ jid, text }`
- `POST /api/send-media` (Bearer, multipart) — fields: `jid`, `caption?`, `file`

## Webhook
- **Outgoing**: kirim `POST` ke `WEBHOOK_URL` (jika di-set). Header opsional: `X-Webhook-Secret`.
  - Event: `connection.update`, `messages.upsert`, `messages.update`
- **Incoming (opsional)**: `POST /webhook` — terima event dari external (untuk testing).

## Struktur
```
src/
  server.js
  app.js
  sockets.js
  routes/
    dashboard.js
    api.js
    webhook.js
  utils/
    webhook.js
  whatsapp/
    index.js
    state.js
  public/
    index.html
    client.js
```
