import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeReference, validateBrief, type BriefInput } from '../../src/domain/brief'
import { GROUPS, TEMPLATE } from '../../src/domain/catalog'
import { isValidOption } from '../../src/domain/configuration'
import { GROUP_IDS } from '../../src/domain/types'

const ok: BriefInput = { name: 'Ada Lovelace', email: 'ada@example.com', phone: '', preferredContact: 'email', notes: '' }

describe('validateBrief', () => {
  it('accepts a minimal valid brief and normalises it', () => {
    const r = validateBrief({ ...ok, name: '  Ada   Lovelace ', email: ' ADA@Example.com ' })
    expect(r).toEqual({ ok: true, value: { ...ok, email: 'ada@example.com' } })
  })
  it('requires name and a plausible email', () => {
    const r = validateBrief({ ...ok, name: ' ', email: 'not-an-email' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['email', 'name'])
  })
  it('requires a phone number when phone is the preferred contact', () => {
    const r = validateBrief({ ...ok, preferredContact: 'phone' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.phone).toBeTruthy()
    expect(validateBrief({ ...ok, preferredContact: 'phone', phone: '+44 (0)20 7946 0000' }).ok).toBe(true)
  })
  it('rejects malformed phone numbers and over-long notes', () => {
    const r = validateBrief({ ...ok, phone: 'call me', notes: 'x'.repeat(1001) })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['notes', 'phone'])
  })
  it('strips control characters but keeps line breaks in notes', () => {
    const r = validateBrief({ ...ok, name: 'Ada\u0000 Lovelace', notes: 'line one\r\nline two\u0007' })
    expect(r.ok && r.value.name).toBe('Ada Lovelace')
    expect(r.ok && r.value.notes).toBe('line one\nline two')
  })
  it('creates unpredictable references', () => {
    const refs = new Set(Array.from({ length: 50 }, () => makeReference(new Date('2026-10-13'))))
    expect(refs.size).toBe(50)
    for (const r of refs) expect(r).toMatch(/^FH-2026-[0-9A-F]{6}$/)
  })
})

describe('catalogue integrity', () => {
  const publicDir = fileURLToPath(new URL('../../public', import.meta.url))

  it('has unique, URL-safe option ids per group and valid defaults', () => {
    for (const g of GROUP_IDS) {
      const ids = GROUPS[g].options.map((o) => o.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,48}$/)
      expect(isValidOption(g, TEMPLATE.defaults[g])).toBe(true)
      expect(GROUPS[g].options.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('references only asset files that exist', () => {
    const files = new Set<string>()
    const surface = (s: unknown) => {
      if (s && typeof s === 'object' && 'texture' in s) {
        const t = (s as { texture: string }).texture
        for (const m of ['color', 'normal', 'rough']) files.add(`assets/textures/${t}/${m}.webp`)
      }
    }
    for (const g of GROUP_IDS) {
      for (const o of GROUPS[g].options) {
        const spec = o.spec as Record<string, unknown>
        if (typeof spec.url === 'string') files.add(spec.url.replace(/^\//, ''))
        surface(spec.surface)
        surface(spec.fabric)
        surface(spec.fluted)
        if (o.swatch.kind === 'texture') files.add(`assets/textures/${o.swatch.texture}/color.webp`)
        if (g === 'sofa' || g === 'coffeeTable') files.add(`assets/thumbs/${o.id}.webp`)
      }
    }
    const missing = [...files].filter((f) => !existsSync(join(publicDir, f)))
    expect(missing).toEqual([])
  })
})

describe('storage', () => {
  beforeEach(() => {
    const mem = new Map<string, string>()
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    }
  })

  it('drops corrupted or tampered saved designs on load', async () => {
    const { loadSavedDesigns } = await import('../../src/lib/storage')
    localStorage.setItem(
      'fernhall.roomset.v1.saved',
      JSON.stringify([
        { id: 'd-abc123', name: 'Good', savedAt: '2026-10-13T10:00:00Z', config: { templateId: 'garden-room', ...TEMPLATE.defaults } },
        { id: 'd-bad1', name: 'Tampered', savedAt: 'x', config: { templateId: 'garden-room', ...TEMPLATE.defaults, sofa: '<img onerror=1>' } },
        { id: '../../etc', name: 'Bad id', config: {} },
        'nonsense',
      ]),
    )
    const designs = loadSavedDesigns()
    expect(designs.map((d) => d.name)).toEqual(['Good'])
  })

  it('survives invalid JSON and unavailable storage', async () => {
    const { loadSavedDesigns, storeSavedDesigns } = await import('../../src/lib/storage')
    localStorage.setItem('fernhall.roomset.v1.saved', '{not json')
    expect(loadSavedDesigns()).toEqual([])
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceeded')
      },
    }
    expect(loadSavedDesigns()).toEqual([])
    expect(storeSavedDesigns([])).toBe(false)
  })
})
