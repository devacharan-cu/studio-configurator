import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ASSETS, assetThumb, CATEGORY_LABELS, getAsset } from '../../../src/engine/assets/catalog'
import { addItem, duplicateItem, setItemVariant } from '../../../src/engine/commands/elements'
import { itemCorners, roomInnerPolygon } from '../../../src/engine/commands/structure'
import { pointInPolygon } from '../../../src/engine/geometry/polygon'
import { parseProject, serializeProject } from '../../../src/engine/model/project'
import { blankWithRooms, err, levelOf, ok } from './helpers'

/* The catalogue is data: every entry must be loadable, measured, licensed and pictured. */

const pub = (url: string) => `public${url}`

describe('asset catalogue', () => {
  it('has unique ids and known categories', () => {
    expect(new Set(ASSETS.map((a) => a.id)).size).toBe(ASSETS.length)
    for (const a of ASSETS) expect(CATEGORY_LABELS[a.category], a.id).toBeTruthy()
  })

  it.each(ASSETS.map((a) => [a.id, a] as const))('%s is complete: file, size, licence, thumbnail', (_id, a) => {
    if (a.kind === 'gltf') {
      expect(a.url, 'model url').toMatch(/^\/assets\/models\/[\w-]+\.glb$/)
      expect(existsSync(pub(a.url!)), `${a.url} exists`).toBe(true)
      // a binary glTF starts with the magic "glTF"
      expect(readFileSync(pub(a.url!)).subarray(0, 4).toString('latin1')).toBe('glTF')
      expect(a.license.source, 'source URL').toMatch(/^https:\/\//)
    }
    const { w, d, h } = a.footprint
    expect(w > 0.02 && w < 4.5 && d > 0.02 && d < 4.5 && h > 0.005 && h < 3, `${w}×${d}×${h} m`).toBe(true)
    expect(['CC0-1.0', 'CC-BY-4.0', 'project']).toContain(a.license.spdx)
    expect(a.license.attribution.length).toBeGreaterThan(3)
    expect(existsSync(pub(assetThumb(a))), 'thumbnail').toBe(true)
    if (a.variants) expect(new Set(a.variants.map((v) => v.id)).size).toBe(a.variants.length)
  })
})

describe('item commands', () => {
  const base = blankWithRooms([0, 0, 5, 4])
  const level = levelOf(base)
  const p = ok(addItem(base, { asset: 'chair-dining', level, x: 2.5, y: 2 }))
  const id = Object.keys(p.items)[0]

  it('duplicate copies asset, rotation and finish beside the original, inside the room', () => {
    const withFinish = ok(addItem(base, { asset: 'sofa-arlo', level, x: 2.5, y: 2, rotation: 0.5 }))
    const sofa = Object.keys(withFinish.items)[0]
    const q = ok(setItemVariant(withFinish, { item: sofa, variant: 'sage' }))
    const r = duplicateItem(q, { item: sofa })
    const q2 = ok(r)
    const copy = q2.items[r.ok ? r.created[0] : '']
    expect(copy).toMatchObject({ asset: 'sofa-arlo', rotation: 0.5, variant: 'sage' })
    expect(Math.hypot(copy.x - 2.5, copy.y - 2)).toBeGreaterThan(0.29)
    const room = Object.values(q2.rooms)[0]
    for (const c of itemCorners(copy)) expect(pointInPolygon(c, roomInnerPolygon(q2, room.id))).toBe(true)
  })

  it('duplicating next to a wall goes the other way instead of into the wall', () => {
    const near = ok(addItem(base, { asset: 'chair-dining', level, x: 4.5, y: 2 }))
    const it0 = Object.keys(near.items)[0]
    const r = duplicateItem(near, { item: it0 })
    const copy = ok(r).items[r.ok ? r.created[0] : '']
    expect(copy.x).toBeLessThan(4.5)
  })

  it('finishes are validated against the asset and survive save/load', () => {
    expect(err(setItemVariant(p, { item: id, variant: 'sage' }))).toBe('variant') // the dining chair has no finishes
    const sofaP = ok(addItem(base, { asset: 'sofa-arlo', level, x: 2, y: 2 }))
    const sofa = Object.keys(sofaP.items)[0]
    const q = ok(setItemVariant(sofaP, { item: sofa, variant: 'charcoal' }))
    const back = parseProject(serializeProject(q))
    expect(back.ok && back.project.items[sofa].variant).toBe('charcoal')
    expect(getAsset('sofa-arlo')!.variants!.length).toBeGreaterThan(2)
  })
})
