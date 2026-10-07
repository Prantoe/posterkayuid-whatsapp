import fs from 'fs'
export function ensureAuthDir(dir){
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}
