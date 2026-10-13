import { describe, expect, it } from 'vitest'
import { GROUPS } from '../../src/domain/catalog'
import {
  defaultConfiguration,
  differingGroups,
  parseShareParams,
  sanitizeConfiguration,
  toSearchParams,
  toShareUrl,
} from '../../src/domain/configuration'
import { GROUP_IDS, type Configuration } from '../../src/domain/types'

const alt: Configuration = {
  templateId: 'garden-room',
  sofa: 'curve-velvet-midnight',
  coffeeTable: 'ribbon-round',
  flooring: 'limestone',
  wallFinish: 'ink-blue',
  rug: 'charcoal-herringbone',
}

describe('share URLs', () => {
  it('round-trips every option in every group', () => {
    for (const group of GROUP_IDS) {
      for (const option of GROUPS[group].options) {
        const config = { ...defaultConfiguration(), [group]: option.id }
        const url = toShareUrl(config, 'https://example.test/app?old=1#frag')
        const parsed = parseShareParams(new URL(url).search)
        expect(parsed).toEqual({ status: 'ok', config })
      }
    }
  })

  it('produces readable, URL-safe parameters', () => {
    expect(toSearchParams(alt).toString()).toBe(
      'v=1&room=garden-room&sofa=curve-velvet-midnight&table=ribbon-round&floor=limestone&wall=ink-blue&rug=charcoal-herringbone',
    )
  })

  it('returns none when the URL has no configuration', () => {
    expect(parseShareParams('')).toEqual({ status: 'none' })
    expect(parseShareParams('?utm_source=x')).toEqual({ status: 'none' })
  })

  it('keeps valid fields and reports unknown ones', () => {
    const r = parseShareParams('?v=1&room=garden-room&sofa=curve-velvet-midnight&table=nope&floor=limestone&wall=ink-blue&rug=charcoal-herringbone')
    expect(r.status).toBe('partial')
    if (r.status !== 'partial') return
    expect(r.config.sofa).toBe('curve-velvet-midnight')
    expect(r.config.coffeeTable).toBe(defaultConfiguration().coffeeTable)
    expect(r.issues).toEqual([{ group: 'coffeeTable', reason: 'unknown' }])
  })

  it('treats missing fields as partial', () => {
    const r = parseShareParams('?room=garden-room&sofa=arlo-corner-boucle')
    expect(r.status).toBe('partial')
    if (r.status === 'partial') expect(r.config.sofa).toBe('arlo-corner-boucle')
  })

  it('rejects links for unknown templates or versions', () => {
    expect(parseShareParams('?v=1&room=kitchen&sofa=arlo-linen').status).toBe('invalid')
    expect(parseShareParams('?v=9&room=garden-room&sofa=arlo-linen').status).toBe('invalid')
  })

  it('rejects injection-shaped and duplicated values', () => {
    const r = parseShareParams('?room=garden-room&sofa=%3Cscript%3Ealert(1)%3C%2Fscript%3E&rug=a&rug=b')
    expect(r.status).toBe('invalid')
    const r2 = parseShareParams('?room=garden-room&sofa=arlo-linen&rug=jute-round&rug=no-rug')
    expect(r2.status).toBe('partial')
    if (r2.status === 'partial') expect(r2.issues).toContainEqual({ group: 'rug', reason: 'malformed' })
  })

  it('refuses oversized query strings', () => {
    expect(parseShareParams('?room=garden-room&sofa=' + 'a'.repeat(5000)).status).toBe('invalid')
  })

  it('does not accept inherited object keys as options', () => {
    expect(parseShareParams('?room=garden-room&sofa=constructor&table=__proto__').status).toBe('invalid')
  })
})

describe('sanitizeConfiguration', () => {
  it('accepts a valid configuration unchanged', () => {
    expect(sanitizeConfiguration(alt)).toEqual({ config: alt, issues: [] })
  })
  it('falls back per field without discarding the rest', () => {
    const { config, issues } = sanitizeConfiguration({ ...alt, rug: 42, sofa: 'gone' })
    expect(config.flooring).toBe('limestone')
    expect(config.rug).toBe(defaultConfiguration().rug)
    expect(issues.map((i) => i.group).sort()).toEqual(['rug', 'sofa'])
  })
  it('handles non-objects', () => {
    for (const bad of [null, 'x', 3, [], undefined]) expect(sanitizeConfiguration(bad).config).toEqual(defaultConfiguration())
  })
})

describe('differingGroups', () => {
  it('lists exactly the groups that differ', () => {
    expect(differingGroups(defaultConfiguration(), defaultConfiguration())).toEqual([])
    expect(differingGroups(defaultConfiguration(), alt)).toEqual(GROUP_IDS.filter((g) => defaultConfiguration()[g] !== alt[g]))
  })
})
