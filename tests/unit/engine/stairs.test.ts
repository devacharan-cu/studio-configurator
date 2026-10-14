import { describe, expect, it } from 'vitest'
import type { CommandResult } from '../../../src/engine/commands/draft'
import { addItem } from '../../../src/engine/commands/elements'
import { addStair, addStairAnywhere, deleteLevel, deleteStair, renameLevel, updateStair } from '../../../src/engine/commands/stairs'
import { compactHome } from '../../../src/engine/templates'
import { stairIssues } from '../../../src/engine/model/validate'
import { addLevel, createRoom } from '../../../src/engine/commands/structure'
import { emptyProject, parseProject, serializeProject } from '../../../src/engine/model/project'
import { sortedLevels } from '../../../src/engine/model/query'
import { stairGeometry } from '../../../src/engine/model/stairs'
import type { Project } from '../../../src/engine/model/types'
import { buildColliders, furnishedLevels, walkFloor, walkStep, type WalkPos } from '../../../src/engine/walk'

const ok = (r: CommandResult): Project => {
  if (!r.ok) throw new Error(r.error.message)
  return r.project
}
const box = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]

/** Two storeys over the same 8 × 6 m footprint, no stairs yet. */
function twoStorey(upper = box(0, 0, 8, 6)) {
  let p = emptyProject('Two storeys')
  const ground = Object.keys(p.levels)[0]
  p = ok(createRoom(p, { level: ground, points: box(0, 0, 8, 6), name: 'Hall', type: 'hall', thickness: 0.25 }))
  p = ok(addLevel(p, {}))
  const first = sortedLevels(p)[1].id
  p = ok(createRoom(p, { level: first, points: upper, name: 'Landing', type: 'hall', thickness: 0.25 }))
  return { p, ground, first }
}

/** A flight along y = 1, climbing east from x ≈ 1. */
const withStair = () => {
  const t = twoStorey()
  const p = ok(addStair(t.p, { level: t.ground, x: 3.4, y: 1.1 }))
  return { ...t, p, stair: Object.values(p.stairs!)[0] }
}

describe('levels', () => {
  it('a new floor sits one storey plus the slab above the one below, with a proper name', () => {
    const { p } = twoStorey()
    const [g, f] = sortedLevels(p)
    expect(f.name).toBe('First floor')
    expect(f.elevation).toBeCloseTo(g.elevation + g.height + 0.3)
  })

  it('only the top floor can be removed, and never the last one', () => {
    const { p, ground, first } = withStair()
    expect(deleteLevel(p, { level: ground }).ok).toBe(false)
    const q = ok(deleteLevel(p, { level: first }))
    expect(Object.keys(q.levels)).toEqual([ground])
    // everything on it and the stairs leading to it go too
    expect(Object.values(q.rooms).every((r) => r.level === ground)).toBe(true)
    expect(q.stairs).toBeUndefined()
    expect(deleteLevel(q, { level: ground }).ok).toBe(false)
  })

  it('renames a floor', () => {
    const { p, first } = twoStorey()
    expect(ok(renameLevel(p, { level: first, name: ' Upper floor ' })).levels[first].name).toBe('Upper floor')
    expect(renameLevel(p, { level: first, name: '  ' }).ok).toBe(false)
  })
})

describe('stairs', () => {
  it('derives risers and going from the storey height and its length', () => {
    const { p, stair } = withStair()
    const g = stairGeometry(p, stair)
    expect(g.rise).toBeCloseTo(3.0)
    expect(g.risers).toBe(17)
    expect(g.riser).toBeGreaterThan(0.16)
    expect(g.riser).toBeLessThan(0.19)
    expect(g.going).toBeGreaterThanOrEqual(0.25)
    expect(g.going).toBeLessThanOrEqual(0.3)
  })

  it('saves and restores exactly; single-storey projects keep no stairs key', () => {
    const { p } = withStair()
    const back = parseProject(serializeProject(p))
    expect(back.ok && back.project).toEqual(p)
    const none = ok(deleteStair(p, { stair: Object.keys(p.stairs!)[0] }))
    expect('stairs' in none).toBe(false)
  })

  it('refuses stairs with no floor above, too steep, too narrow or too shallow', () => {
    const { p, ground, first, stair } = withStair()
    expect(addStair(p, { level: first, x: 3, y: 3 }).ok).toBe(false)
    const steep = updateStair(p, { stair: stair.id, length: 2.5 })
    expect(!steep.ok && steep.error.message).toMatch(/too steep/)
    expect(updateStair(p, { stair: stair.id, width: 0.6 }).ok).toBe(false)
    expect(updateStair(p, { stair: stair.id, length: 6.8, x: 4 }).ok).toBe(false)
    expect(addStair(p, { level: ground, x: 3.4, y: 1.4 }).ok).toBe(false) // overlaps the first flight
  })

  it('must stand in one room below and arrive inside one room above, with space at both ends', () => {
    const { p, stair } = withStair()
    // through the wall at the end of the house
    expect(updateStair(p, { stair: stair.id, x: 5.5 }).ok).toBe(false)
    // no room to step on at the foot
    expect(updateStair(p, { stair: stair.id, x: 2.4 }).ok).toBe(false)
    // the upper floor is smaller: the flight would arrive in mid-air
    const small = twoStorey(box(0, 0, 5, 6))
    expect(addStair(small.p, { level: small.ground, x: 3.4, y: 1.1 }).ok).toBe(false)
  })

  it('flights between three floors stack side by side, never inside the stairwell below', () => {
    const { p, first } = withStair()
    let q = ok(addLevel(p, {}))
    const second = sortedLevels(q)[2].id
    q = ok(createRoom(q, { level: second, points: box(0, 0, 8, 6), name: 'Top landing', type: 'hall', thickness: 0.25 }))
    // straight above the first flight: refused
    const stacked = addStair(q, { level: first, x: 3.4, y: 1.1 })
    expect(!stacked.ok && stacked.error.message).toMatch(/beside/)
    // beside it, climbing the other way: fine, and walkable from the ground to the top
    q = ok(addStair(q, { level: first, x: 3.4, y: 2.3, rotation: Math.PI }))
    const cache = new Map<string, ReturnType<typeof buildColliders>>()
    const col = (l: string) => cache.get(l) ?? (cache.set(l, buildColliders(q, l)), cache.get(l)!)
    let at: WalkPos = { x: 0.6, y: 1.1, level: sortedLevels(q)[0].id, stair: null }
    for (let i = 0; i < 130; i++) at = walkStep(q, at, { x: 0.05, y: 0 }, 0.25, col)
    expect(at.level).toBe(first)
    // round the end of the stairwell guard and up the second flight
    for (let i = 0; i < 30; i++) at = walkStep(q, at, { x: 0, y: 0.05 }, 0.25, col)
    for (let i = 0; i < 140; i++) at = walkStep(q, at, { x: -0.05, y: 0 }, 0.25, col)
    expect(at.level).toBe(second)
    expect(walkFloor(q, at)).toBeCloseTo(q.levels[second].elevation)
  })

  it('nothing may stand on the flight or in the stairwell', () => {
    const { p, ground, first } = withStair()
    expect(addItem(p, { asset: 'sofa-arlo', level: ground, x: 3, y: 1.1 }).ok).toBe(false)
    expect(addItem(p, { asset: 'sofa-arlo', level: first, x: 3, y: 1.1 }).ok).toBe(false)
    expect(addItem(p, { asset: 'sofa-arlo', level: ground, x: 4, y: 4 }).ok).toBe(true)
  })
})

describe('adding stairs where they fit', () => {
  it('finds a valid spot clear of furniture and doorways, and explains when a floor is too full', () => {
    const t = twoStorey()
    expect(addStairAnywhere(emptyProject(), { level: 'l_none' }).ok).toBe(false)
    const p = ok(addItem(t.p, { asset: 'sofa-arlo', level: t.ground, x: 4, y: 3 }))
    const q = ok(addStairAnywhere(p, { level: t.ground }))
    const s = Object.values(q.stairs!)[0]
    expect(stairIssues(q, s.id)).toEqual([])
    // a fully furnished single-storey house with a floor added has no room for a 4–5 m flight: it says so
    let full = compactHome()
    full = ok(addLevel(full, {}))
    full = ok(createRoom(full, { level: sortedLevels(full)[1].id, points: box(0, 0, 10, 8.2), name: 'Upper floor', type: 'living', thickness: 0.25 }))
    const r = addStairAnywhere(full, { level: sortedLevels(full)[0].id })
    expect(!r.ok && r.error.message).toMatch(/no free spot.*clear a strip/)
  })
})

describe('walking between floors', () => {
  const R = 0.25
  const walk = (p: Project, at: WalkPos, dx: number, dy: number, steps: number) => {
    const cache = new Map<string, ReturnType<typeof buildColliders>>()
    const col = (l: string) => cache.get(l) ?? (cache.set(l, buildColliders(p, l)), cache.get(l)!)
    let q = at
    const trace: WalkPos[] = []
    for (let i = 0; i < steps; i++) {
      q = walkStep(p, q, { x: dx, y: dy }, R, col)
      trace.push(q)
    }
    return { q, trace }
  }

  it('climbs the flight from its foot and arrives on the floor above at its height', () => {
    const { p, ground, first } = withStair()
    const { q, trace } = walk(p, { x: 0.6, y: 1.1, level: ground, stair: null }, 0.05, 0, 120)
    expect(q.level).toBe(first)
    expect(q.stair).toBeNull()
    expect(walkFloor(p, q)).toBeCloseTo(p.levels[first].elevation)
    // the floor height rises steadily on the way up (no jumps)
    const heights = trace.map((t) => walkFloor(p, t))
    for (let i = 1; i < heights.length; i++) expect(heights[i] - heights[i - 1]).toBeLessThan(0.05)
    expect(Math.max(...heights)).toBeCloseTo(p.levels[first].elevation)
  })

  it('comes back down from the top', () => {
    const { p, ground, first } = withStair()
    const { q } = walk(p, { x: 6.4, y: 1.1, level: first, stair: null }, -0.05, 0, 140)
    expect(q.level).toBe(ground)
    expect(walkFloor(p, q)).toBeCloseTo(0)
    expect(q.x).toBeLessThan(1)
  })

  it('draws the furniture of another floor only near the stairs that lead to it', () => {
    const { p, ground, first, stair } = withStair()
    expect(furnishedLevels(p, { x: 7.5, y: 5.6, level: ground, stair: null })).toEqual([ground])
    expect(furnishedLevels(p, { x: 0.6, y: 2.5, level: ground, stair: null })).toEqual([ground, first])
    expect(furnishedLevels(p, { x: 3, y: 1.1, level: ground, stair: stair.id })).toEqual([ground, first])
    expect(furnishedLevels(p, { x: 7.5, y: 5.6, level: first, stair: null })).toEqual([first])
  })

  it('cannot step onto the flight from the side below, or fall into the stairwell from above', () => {
    const { p, ground, first } = withStair()
    const below = walk(p, { x: 3.4, y: 3, level: ground, stair: null }, 0, -0.05, 60).q
    expect(below.stair).toBeNull()
    expect(below.y).toBeGreaterThan(1.6)
    const above = walk(p, { x: 3.4, y: 3, level: first, stair: null }, 0, -0.05, 60).q
    expect(above.stair).toBeNull()
    expect(above.level).toBe(first)
    expect(above.y).toBeGreaterThan(1.6)
    // nor walk under the top of the flight into its head from below
    const head = walk(p, { x: 6.4, y: 1.1, level: ground, stair: null }, -0.05, 0, 40).q
    expect(head.stair).toBeNull()
    expect(head.x).toBeGreaterThan(5.6)
  })
})
