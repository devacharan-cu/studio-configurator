import { describe, expect, it } from 'vitest'
import { addOpening } from '../../../src/engine/commands/elements'
import { area, pointInPolygon } from '../../../src/engine/geometry/polygon'
import { CASING_WIDTH, entrances, roofPlan, runLength, skirtingRuns } from '../../../src/engine/geometry/site'
import { wallFrame } from '../../../src/engine/model/query'
import { compactHome } from '../../../src/engine/templates'
import { blankWithRooms, levelOf, ok, roomByName } from './helpers'

describe('skirting boards', () => {
  it('run along the inner faces of a closed room, mitred at the corners', () => {
    const p = blankWithRooms([0, 0, 4, 3]) // default 0.2 m walls → inner faces 3.8 × 2.8
    const runs = skirtingRuns(p, Object.values(p.rooms)[0])
    const t = Object.values(p.walls)[0].thickness
    expect(runs).toHaveLength(4)
    const total = runs.reduce((s, r) => s + runLength(r), 0)
    expect(total).toBeCloseTo(2 * (4 - t) + 2 * (3 - t), 6)
    for (const r of runs) {
      // inward normal points to the room centre
      const mid = { x: (r.a.x + r.b.x) / 2 + r.inward.x * 0.1, y: (r.a.y + r.b.y) / 2 + r.inward.y * 0.1 }
      expect(pointInPolygon(mid, [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }])).toBe(true)
    }
  })

  it('stop at doors (plus the casing) but run under windows', () => {
    const p0 = blankWithRooms([0, 0, 4, 3])
    const wall = Object.values(p0.walls).find((w) => wallFrame(p0, w).length > 3.9)!
    const withWindow = ok(addOpening(p0, { wall: wall.id, kind: 'window', offset: 2 }))
    expect(skirtingRuns(withWindow, Object.values(withWindow.rooms)[0])).toHaveLength(4)
    const withDoor = ok(addOpening(p0, { wall: wall.id, kind: 'door', offset: 2, width: 0.9 }))
    const runs = skirtingRuns(withDoor, Object.values(withDoor.rooms)[0])
    expect(runs).toHaveLength(5)
    const before = skirtingRuns(p0, Object.values(p0.rooms)[0]).reduce((s, r) => s + runLength(r), 0)
    const after = runs.reduce((s, r) => s + runLength(r), 0)
    expect(before - after).toBeCloseTo(0.9 + 2 * CASING_WIDTH, 6)
  })

  it('every room of the compact home has skirting that stays inside the room', () => {
    const p = compactHome()
    for (const r of Object.values(p.rooms)) {
      const runs = skirtingRuns(p, r)
      expect(runs.length, r.name).toBeGreaterThan(3)
      const poly = r.boundary.map((id) => p.nodes[id])
      for (const s of runs) for (const q of [s.a, s.b]) expect(pointInPolygon(q, poly), r.name).toBe(true)
    }
    // the hall has three doors and a front door: its skirting is interrupted four times
    const hall = skirtingRuns(p, roomByName(p, 'Hall'))
    expect(hall.length).toBeGreaterThanOrEqual(6)
  })
})

describe('roof', () => {
  it('covers the whole footprint out to the eaves, with no gap at corners', () => {
    const p = compactHome()
    const plan = roofPlan(p, levelOf(p), 0.25)
    expect(plan.slabs).toHaveLength(6)
    // the slabs tile the centreline footprint exactly
    expect(plan.slabs.reduce((s, poly) => s + area(poly), 0)).toBeCloseTo(10 * 8.2, 6)
    const e = 0.125 + 0.25
    const covered = (q: { x: number; y: number }) => plan.slabs.some((s) => pointInPolygon(q, s)) || plan.strips.some((s) => pointInPolygon(q, s.corners))
    // sample a grid over the eaves outline: everything inside is covered, nothing outside is
    for (let x = -e + 0.01; x < 10 + e; x += 0.17) for (let y = -e + 0.01; y < 8.2 + e; y += 0.17) expect(covered({ x, y }), `${x},${y}`).toBe(true)
    for (const q of [{ x: -e - 0.05, y: 4 }, { x: 5, y: 8.2 + e + 0.05 }, { x: 10 + e + 0.05, y: 0 }]) expect(covered(q)).toBe(false)
  })

  it('an L-shaped plan gets its re-entrant corner covered', () => {
    const p = blankWithRooms([0, 0, 6, 3], [0, 3, 3, 6])
    const plan = roofPlan(p, levelOf(p), 0.3)
    const e = Object.values(p.walls)[0].thickness / 2 + 0.3
    const covered = (q: { x: number; y: number }) => plan.slabs.some((s) => pointInPolygon(q, s)) || plan.strips.some((s) => pointInPolygon(q, s.corners))
    expect(covered({ x: 3 + e - 0.02, y: 3 + e - 0.02 })).toBe(true) // eaves at the inside corner
    expect(covered({ x: 3 + e + 0.05, y: 3 + e + 0.05 })).toBe(false) // the open garden beyond it
  })
})

describe('entrances', () => {
  it('finds the compact home front door on the south facade, facing out', () => {
    const p = compactHome()
    const [front] = entrances(p, levelOf(p))
    expect(front.width).toBe(1.0)
    expect(front.at.x).toBeCloseTo(4.55, 6)
    expect(front.at.y).toBeCloseTo(8.2 + 0.125, 6)
    expect(front.outward).toEqual({ x: expect.closeTo(0, 6), y: expect.closeTo(1, 6) })
  })
})
