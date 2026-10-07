function normalizeNum(num) {
  let n = String(num || '').replace(/\D/g, '')
  if (n.startsWith('0')) n = '62' + n.slice(1)
  if (n.length < 8 || n.length > 15) return null
  return `${n}@s.whatsapp.net`
}

function toWaUrl(num) {
  let n = String(num).replace(/\D/g, '')
  if (n.startsWith('0')) n = '62' + n.slice(1)
  return `wa.me/${n}`
}

export { normalizeNum, toWaUrl }
