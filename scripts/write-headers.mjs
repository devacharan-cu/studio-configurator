// Writes deploy-time security headers (Netlify `_headers`, Vercel `vercel.json`) from the single
// source of truth in vite.config.ts, so dev preview and production can't drift apart.
import { writeFileSync } from 'node:fs'
import { SECURITY_HEADERS } from '../vite.config.ts'

const netlify = ['/*', ...Object.entries(SECURITY_HEADERS).map(([k, v]) => `  ${k}: ${v}`)].join('\n') + '\n'
writeFileSync(new URL('../public/_headers', import.meta.url), netlify)

const vercel = {
  headers: [{ source: '/(.*)', headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value })) }],
}
writeFileSync(new URL('../vercel.json', import.meta.url), JSON.stringify(vercel, null, 2) + '\n')
console.log('wrote public/_headers and vercel.json')
