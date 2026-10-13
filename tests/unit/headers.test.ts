import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SECURITY_HEADERS } from '../../vite.config'

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

describe('deploy security headers', () => {
  it('vercel.json matches the source of truth (run `npm run headers` after editing vite.config.ts)', () => {
    const vercel = JSON.parse(read('vercel.json'))
    const served = Object.fromEntries(vercel.headers[0].headers.map((h: { key: string; value: string }) => [h.key, h.value]))
    expect(served).toEqual(SECURITY_HEADERS)
  })
  it('public/_headers matches the source of truth', () => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) expect(read('public/_headers')).toContain(`${k}: ${v}`)
  })
  it('CSP forbids third-party origins, framing and plugins', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy']
    expect(csp).not.toMatch(/https?:/)
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).not.toContain("'unsafe-eval'")
  })
})
