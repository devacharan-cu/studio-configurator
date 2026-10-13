import { describe, expect, it } from 'vitest'
import { moveWall } from '../../../src/engine/commands/structure'
import { commit, initHistory, redo, undo } from '../../../src/engine/history'
import { parseProject, serializeProject } from '../../../src/engine/model/project'
import { openingsOnWall, roomPolygon } from '../../../src/engine/model/query'
import { validateProject } from '../../../src/engine/model/validate'
import { compactHome } from '../../../src/engine/templates'
import { buildColliders, moveWithCollisions, spawnPoint, currentRoom } from '../../../src/engine/walk'
import { area } from '../../../src/engine/geometry/polygon'
import { wallSolid } from '../../../src/engine/geometry/walls'
import { blankWithRooms, ok, roomByName } from './helpers'

describe('compact home template', () => {
  const home = compactHome()

  it('is a valid, connected multi-room building', () => {
    expect(validateProject(home)).toEqual([])
    expect(Object.keys(home.rooms)).toHaveLength(6)
    expect(Object.values(home.openings).filter((o) => o.kind === 'door')).toHaveLength(5)
    // every room is reachable from the hall through doors/passages
    const rooms = Object.values(home.rooms)
    const adj = new Map<string, Set<string>>(rooms.map((r) => [r.id, new Set()]))
    for (const o of Object.values(home.openings)) {
      if (o.kind === 'window') continue
      const users = rooms.filter((r) => r.boundary.some((n, i) => {
        const w = home.walls[o.wall]
        const m = r.boundary[(i + 1) % r.boundary.length]
        return (n === w.a && m === w.b) || (n === w.b && m === w.a)
      }))
      if (users.length === 2) {
        adj.get(users[0].id)!.add(users[1].id)
        adj.get(users[1].id)!.add(users[0].id)
      }
    }
    const start = roomByName(home, 'Hall').id
    const seen = new Set([start])
    const queue = [start]
    while (queue.length) {
      for (const n of adj.get(queue.shift()!)!) {
        if (seen.has(n)) continue
        seen.add(n)
        queue.push(n)
      }
    }
    expect(seen.size).toBe(6)
  })

  it('produces wall solids for every wall', () => {
    for (const w of Object.values(home.walls)) {
      const s = wallSolid(home, w, 0)
      expect(s.faces.length).toBeGreaterThan(2)
      for (const f of s.faces) for (const pt of f.points) for (const c of pt) expect(Number.isFinite(c)).toBe(true)
    }
  })

  it('gross areas add up to the footprint', () => {
    const total = Object.values(home.rooms).reduce((s, r) => s + area(roomPolygon(home, r)), 0)
    expect(total).toBeCloseTo(10 * 8.2)
  })
})

describe('history', () => {
  it('undo and redo restore exact model states', () => {
    const p0 = blankWithRooms([0, 0, 4, 3], [4, 0, 7, 3])
    let h = initHistory(p0)
    const w = Object.values(p0.walls)[0]
    const p1 = ok(moveWall(p0, { wall: w.id, distance: 0.5 }))
    h = commit(h, p1, 'Move wall')
    const p2 = ok(moveWall(p1, { wall: w.id, distance: 0.5 }))
    h = commit(h, p2, 'Move wall')
    h = undo(h)
    expect(h.present).toBe(p1)
    h = undo(h)
    expect(h.present).toBe(p0)
    h = undo(h)
    expect(h.present).toBe(p0)
    h = redo(h)
    expect(h.present).toBe(p1)
    h = commit(h, p2, 'branch')
    expect(h.future).toHaveLength(0)
  })
})

describe('persistence', () => {
  const home = compactHome()

  it('round-trips a full project through JSON exactly', () => {
    const r = parseProject(serializeProject(home))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.project).toEqual(home)
  })

  it('rejects malformed, tampered and hostile documents', () => {
    const json = JSON.parse(serializeProject(home))
    const cases: unknown[] = [
      '{nope',
      null,
      { ...json, schema: 'other' },
      { ...json, version: 99 },
      { ...json, extra: 1 },
      { ...json, name: 'x'.repeat(500) },
      { ...json, walls: { ...json.walls, ['__proto__']: {} } },
      { ...json, nodes: { ...json.nodes, n_bad: { id: 'n_other', level: Object.keys(json.levels)[0], x: 0, y: 0 } } },
      { ...json, items: { ...json.items, i_x: { id: 'i_x', level: Object.keys(json.levels)[0], asset: '<script>', x: 0, y: 0, rotation: 0 } } },
    ]
    for (const c of cases) expect(parseProject(c).ok).toBe(false)
    // geometry that passes the schema but breaks invariants is rejected too
    const wallId = Object.keys(json.walls)[0]
    const broken = structuredClone(json)
    broken.walls[wallId].thickness = 5
    expect(parseProject(broken).ok).toBe(false)
  })
})

describe('walkthrough collision', () => {
  const home = compactHome()
  const level = Object.keys(home.levels)[0]
  const col = buildColliders(home, level)

  it('blocks walking through walls but allows doorways', () => {
    const hall = roomByName(home, 'Hall')
    const start = spawnPoint(home, level)!
    expect(currentRoom(home, level, start)?.id).toBe(hall.id)
    // walk west from the hall into the bedroom wall where there is no door (y = 5.2)
    const blocked = moveWithCollisions({ x: 4.5, y: 5.2 }, { x: -2, y: 0 }, 0.25, col)
    expect(blocked.x).toBeGreaterThan(3.8)
    // walk west through the bedroom door at y = 7.55
    const through = moveWithCollisions({ x: 4.5, y: 7.55 }, { x: -2, y: 0 }, 0.25, col)
    expect(through.x).toBeLessThan(3.8)
    expect(currentRoom(home, level, through)?.name).toBe('Bedroom')
  })

  it('cannot leave the building through a window', () => {
    const out = moveWithCollisions({ x: 1.6, y: 1.0 }, { x: 0, y: -3 }, 0.25, col)
    expect(out.y).toBeGreaterThan(0)
  })

  it('every door is wide enough to walk through', () => {
    for (const o of Object.values(home.openings).filter((x) => x.kind !== 'window')) {
      expect(openingsOnWall(home, o.wall).length).toBeGreaterThan(0)
      expect(o.width - home.walls[o.wall].thickness).toBeGreaterThan(0.5)
    }
  })
})
