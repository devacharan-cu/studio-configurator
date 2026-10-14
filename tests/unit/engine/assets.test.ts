import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ASSETS, assetThumb, CATEGORY_LABELS, getAsset } from '../../../src/engine/assets/catalog'
import { EXTERIOR_FINISHES, FLOOR_FINISHES, WALL_FINISHES } from '../../../src/engine/assets/finishes'
import { addItem, duplicateItem, moveItem, setItemVariant } from '../../../src/engine/commands/elements'
import { itemCorners, roomInnerPolygon, setFacade } from '../../../src/engine/commands/structure'
import { pointInPolygon } from '../../../src/engine/geometry/polygon'
import { parseProject, serializeProject } from '../../../src/engine/model/project'
import { buildColliders } from '../../../src/engine/walk'
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
    expect(w >= 0.01 && w < 4.5 && d >= 0.01 && d < 4.5 && h > 0.005 && h < 3, `${w}×${d}×${h} m`).toBe(true)
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

describe('placement: walls, ceilings and tabletops', () => {
  const base = blankWithRooms([0, 0, 5, 4])
  const level = levelOf(base)
  const t = Object.values(base.walls)[0].thickness / 2

  it('a mirror placed near a wall hangs flat on it, facing into the room, at its mounting height', () => {
    const p = ok(addItem(base, { asset: 'mirror-ornate', level, x: 2.5, y: 0.6, rotation: 1.3 }))
    const m = Object.values(p.items)[0]
    const a = getAsset('mirror-ornate')!
    expect(m.y).toBeCloseTo(t + a.footprint.d / 2 + 0.004, 6) // against the north wall's inner face
    expect(Math.cos(m.rotation)).toBeCloseTo(1, 6) // front faces south, into the room
    expect(m.z).toBe(a.wallHeight)
  })

  it('a vase dropped on a table stands on the tabletop, travels with the table, and drops to the floor elsewhere', () => {
    let p = ok(addItem(base, { asset: 'table-writing', level, x: 2.5, y: 2 }))
    const table = Object.keys(p.items)[0]
    p = ok(addItem(p, { asset: 'vase-white', level, x: 2.6, y: 2.1 }))
    const vase = Object.keys(p.items).find((k) => k !== table)!
    expect(p.items[vase].z).toBeCloseTo(getAsset('table-writing')!.surface!, 6)
    const moved = ok(moveItem(p, { item: table, x: 3.0, y: 2.5 }))
    expect(moved.items[vase].x).toBeCloseTo(3.1, 6)
    expect(moved.items[vase].z).toBeCloseTo(getAsset('table-writing')!.surface!, 6)
    const floor = ok(moveItem(p, { item: vase, x: 0.8, y: 0.8 }))
    expect(floor.items[vase].z).toBeUndefined()
  })

  it('ceiling fittings, wall items and things on tables are not walkthrough obstacles', () => {
    let p = ok(addItem(base, { asset: 'fan-ceiling', level, x: 2.5, y: 2 }))
    p = ok(addItem(p, { asset: 'art-photo-landscape', level, x: 0.3, y: 2 }))
    expect(buildColliders(p, level).boxes).toHaveLength(0)
    p = ok(addItem(p, { asset: 'chest-apothecary', level, x: 2.5, y: 3 }))
    expect(buildColliders(p, level).boxes).toHaveLength(1)
  })

  it('the library has at least 60 distinct third-party models, each with a licence record', () => {
    const files = new Set(ASSETS.filter((a) => a.kind === 'gltf').map((a) => a.url))
    expect(files.size).toBeGreaterThanOrEqual(60)
    for (const a of ASSETS.filter((x) => x.kind === 'gltf')) expect(a.license.source, a.id).toMatch(/^https:\/\/(polyhaven\.com|github\.com)\//)
  })
})

describe('finish library', () => {
  it('every floor, wall and facade finish has its texture set on disk, and ids are unique', () => {
    const all = [...FLOOR_FINISHES, ...WALL_FINISHES, ...EXTERIOR_FINISHES]
    expect(new Set(all.map((f) => f.id)).size).toBe(all.length)
    expect(FLOOR_FINISHES.length).toBeGreaterThanOrEqual(15)
    expect(WALL_FINISHES.length).toBeGreaterThanOrEqual(9)
    for (const f of all) for (const m of ['color', 'normal', 'rough']) expect(existsSync(`public/assets/textures/${f.texture}/${m}.webp`), `${f.id} ${m}`).toBe(true)
  })

  it('the facade is a validated, undoable project setting that survives save/load', () => {
    const p = blankWithRooms([0, 0, 4, 3])
    expect(err(setFacade(p, { finish: 'neon-pink' }))).toBe('finish')
    const q = ok(setFacade(p, { finish: 'facade-brick' }))
    expect(q.facade).toBe('facade-brick')
    const back = parseProject(serializeProject(q))
    expect(back.ok && back.project.facade).toBe('facade-brick')
  })
})
