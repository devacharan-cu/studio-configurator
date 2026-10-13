import { describe, expect, it } from 'vitest'
import { addItem, addOpening, moveOpening } from '../../../src/engine/commands/elements'
import { createRoom, deleteRoom, moveNode, moveWall, setRoomSize } from '../../../src/engine/commands/structure'
import { area, insetPolygon, isSimplePolygon, signedArea, triangulate } from '../../../src/engine/geometry/polygon'
import { openingCenter, wallOutline, wallSides, wallSolid } from '../../../src/engine/geometry/walls'
import { roomMetrics } from '../../../src/engine/metrics'
import { nodePos, roomPolygon, wallBetween, wallLength } from '../../../src/engine/model/query'
import { blankWithRooms, err, levelOf, ok, rect, roomByName } from './helpers'

const wallAtX = (p: ReturnType<typeof blankWithRooms>, x: number) =>
  Object.values(p.walls).find((w) => Math.abs(p.nodes[w.a].x - x) < 1e-9 && Math.abs(p.nodes[w.b].x - x) < 1e-9)!

describe('polygon kernel', () => {
  it('area, orientation, simplicity, inset and triangulation', () => {
    const sq = rect(0, 0, 4, 3)
    expect(area(sq)).toBeCloseTo(12)
    expect(isSimplePolygon(sq)).toBe(true)
    expect(isSimplePolygon([{ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 2, y: 0 }, { x: 0, y: 2 }])).toBe(false)
    const ccw = signedArea(sq) > 0 ? sq : [...sq].reverse()
    expect(area(insetPolygon(ccw, [0.1, 0.1, 0.1, 0.1]))).toBeCloseTo(3.8 * 2.8)
    const L = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 4 }, { x: 0, y: 4 }]
    const tris = triangulate(L)
    expect(tris).toHaveLength(4)
    const sum = tris.reduce((s, [a, b, c]) => s + area([L[a], L[b], L[c]]), 0)
    expect(sum).toBeCloseTo(12)
  })
})

describe('createRoom', () => {
  it('drawing a room creates corners, walls and a room with consistent data', () => {
    const p = blankWithRooms([0, 0, 4, 3])
    expect(Object.keys(p.nodes)).toHaveLength(4)
    expect(Object.keys(p.walls)).toHaveLength(4)
    const r = roomByName(p, 'R1')
    expect(r.boundary).toHaveLength(4)
    expect(area(roomPolygon(p, r))).toBeCloseTo(12)
    // every boundary edge is a wall
    r.boundary.forEach((n, i) => expect(wallBetween(p, n, r.boundary[(i + 1) % 4])).toBeDefined())
  })

  it('adjacent rooms share the common wall instead of duplicating it', () => {
    const p = blankWithRooms([0, 0, 4, 3], [4, 0, 7, 3])
    expect(Object.keys(p.walls)).toHaveLength(7)
    const shared = wallAtX(p, 4)
    const sides = wallSides(p)[shared.id]
    expect(sides.left && sides.right).toBeTruthy()
  })

  it('a room attached along part of a wall creates a T-junction (the wall is split)', () => {
    const p = blankWithRooms([0, 0, 6, 3], [1, 3, 4, 6])
    // the first room's bottom edge is now split into three walls at x=1 and x=4
    const r1 = roomByName(p, 'R1')
    expect(r1.boundary).toHaveLength(6)
    expect(Object.values(p.walls).filter((w) => p.nodes[w.a].y === 3 && p.nodes[w.b].y === 3)).toHaveLength(3)
  })

  it('rejects overlapping, self-crossing, tiny and enclosed rooms without changing the project', () => {
    const p = blankWithRooms([0, 0, 4, 4])
    const level = levelOf(p)
    const snapshot = JSON.stringify(p)
    expect(err(createRoom(p, { level, points: rect(2, 2, 6, 6) }))).toBe('wall-cross')
    expect(err(createRoom(p, { level, points: rect(1, 1, 2, 2) }))).toBe('room-overlap')
    expect(err(createRoom(p, { level, points: [{ x: 10, y: 0 }, { x: 12, y: 2 }, { x: 12, y: 0 }, { x: 10, y: 2 }] }))).toBe('room-self-intersect')
    expect(err(createRoom(p, { level, points: rect(10, 0, 10.5, 0.5) }))).toBe('room-small')
    expect(JSON.stringify(p)).toBe(snapshot)
  })
})

describe('wall junction geometry', () => {
  it('mitres corners exactly at the outer and inner faces', () => {
    const q = blankWithRooms([0, 0, 4, 3])
    for (const w of Object.values(q.walls)) {
      const o = wallOutline(q, w)
      // each face end lies 0.075 m (half of 0.15) from the centreline corner along both axes
      for (const pt of [...o.left, ...o.right]) {
        const cornerX = [0, 4].reduce((a, b) => (Math.abs(pt.x - b) < Math.abs(pt.x - a) ? b : a))
        const cornerY = [0, 3].reduce((a, b) => (Math.abs(pt.y - b) < Math.abs(pt.y - a) ? b : a))
        expect(Math.abs(pt.x - cornerX)).toBeCloseTo(0.075, 6)
        expect(Math.abs(pt.y - cornerY)).toBeCloseTo(0.075, 6)
      }
    }
  })

  it('solid faces are regenerated with holes for openings', () => {
    let p = blankWithRooms([0, 0, 4, 3])
    const w = Object.values(p.walls).find((x) => wallLength(p, x) > 3.9)!
    const before = wallSolid(p, w, 0).faces.filter((f) => f.role === 'left').length
    p = ok(addOpening(p, { wall: w.id, kind: 'window', offset: 2 }))
    const solid = wallSolid(p, p.walls[w.id], 0)
    expect(before).toBe(1)
    // left face becomes: strip, below sill, above head, strip
    expect(solid.faces.filter((f) => f.role === 'left')).toHaveLength(4)
    expect(solid.faces.filter((f) => f.role === 'reveal')).toHaveLength(4)
    // window hole area is missing from the face area
    const faceArea = solid.faces
      .filter((f) => f.role === 'left')
      .reduce((s, f) => {
        const [a, b, , d] = f.points
        return s + Math.hypot(b[0] - a[0], b[2] - a[2]) * Math.abs(d[1] - a[1])
      }, 0)
    const fullFace = (4 + 0.15) * 2.7 // outer face, mitred
    const innerFace = (4 - 0.15) * 2.7
    expect([fullFace - 1.2 * 1.3, innerFace - 1.2 * 1.3].some((v) => Math.abs(v - faceArea) < 1e-6)).toBe(true)
  })
})

describe('structural edits', () => {
  it('moving a shared wall resizes both rooms and nothing else', () => {
    const p = blankWithRooms([0, 0, 4, 3], [4, 0, 7, 3])
    const shared = wallAtX(p, 4)
    const sign = Math.sign(p.nodes[shared.b].y - p.nodes[shared.a].y) // left normal of a vertical wall
    const q = ok(moveWall(p, { wall: shared.id, distance: -sign * 1 })) // move east by 1 m
    expect(area(roomPolygon(q, roomByName(q, 'R1')))).toBeCloseTo(15)
    expect(area(roomPolygon(q, roomByName(q, 'R2')))).toBeCloseTo(6)
    expect(Object.keys(q.walls)).toHaveLength(7)
  })

  it('moving a wall run keeps T-junctions straight (no notch)', () => {
    const p = blankWithRooms([0, 0, 6, 3], [1, 3, 4, 6])
    const bottom = Object.values(p.walls).find((w) => p.nodes[w.a].y === 3 && p.nodes[w.b].y === 3)!
    const q = ok(moveWall(p, { wall: bottom.id, distance: 0.5 * (p.nodes[bottom.b].x > p.nodes[bottom.a].x ? -1 : 1) }))
    // all five corners of the run (incl. both T-junctions) moved together: no corner left behind at y = 3
    expect(Object.values(q.nodes).filter((n) => Math.abs(n.y - 3) < 1e-9)).toHaveLength(0)
    const y = Object.values(q.nodes).find((n) => n.y > 2 && n.y < 4)!.y
    expect(Object.values(q.nodes).filter((n) => Math.abs(n.y - y) < 1e-9)).toHaveLength(4)
    expect(area(roomPolygon(q, roomByName(q, 'R1')))).toBeCloseTo(6 * y)
    expect(area(roomPolygon(q, roomByName(q, 'R2')))).toBeCloseTo(3 * (6 - y))
  })

  it('rejects edits that would cross walls, collapse rooms or leave openings without room', () => {
    let p = blankWithRooms([0, 0, 4, 3], [4, 0, 7, 3])
    const shared = wallAtX(p, 4)
    const sign = Math.sign(p.nodes[shared.b].y - p.nodes[shared.a].y)
    expect(err(moveWall(p, { wall: shared.id, distance: -sign * 3.5 }))).toMatch(/wall-cross|room|wall-short|node-overlap|wall-overlap/)
    p = ok(addOpening(p, { wall: shared.id, kind: 'door', offset: 1.5, width: 0.9 }))
    const rightWall = wallAtX(p, 7)
    // squeezing room 2 so the shared wall can't host... the door stays on the shared wall (still 3 m) — move the far wall instead
    const s2 = Math.sign(p.nodes[rightWall.b].y - p.nodes[rightWall.a].y)
    expect(err(moveWall(p, { wall: rightWall.id, distance: s2 * 2.9 }))).toMatch(/room-small|wall-short/)
  })

  it('openings keep their world position when their wall is stretched, and are clamped to fit', () => {
    let p = blankWithRooms([0, 0, 6, 3])
    const top = Object.values(p.walls).find((w) => p.nodes[w.a].y === 0 && p.nodes[w.b].y === 0)!
    p = ok(addOpening(p, { wall: top.id, kind: 'window', offset: 0, width: 1.2 }))
    const o = Object.values(p.openings)[0]
    const before = openingCenter(p, o)
    const left = wallAtX(p, 0)
    const s = Math.sign(p.nodes[left.b].y - p.nodes[left.a].y)
    const q = ok(moveWall(p, { wall: left.id, distance: s * 1 })) // move west wall 1 m west
    const after = openingCenter(q, q.openings[o.id])
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('furniture pushed by a wall stays inside its room', () => {
    let p = blankWithRooms([0, 0, 5, 4])
    p = ok(addItem(p, { asset: 'sofa-arlo', level: levelOf(p), x: 3.6, y: 2, rotation: 0 }))
    const east = wallAtX(p, 5)
    const s = Math.sign(p.nodes[east.b].y - p.nodes[east.a].y)
    const r = moveWall(p, { wall: east.id, distance: s * 0.6 }) // pull the east wall 0.6 m west
    const q = ok(r)
    const it = Object.values(q.items)[0]
    expect(it.x + 2.3 / 2).toBeLessThanOrEqual(4.4 - 0.075 + 0.01)
  })

  it('room width/depth can be set numerically on rectangular rooms', () => {
    const p = blankWithRooms([0, 0, 4, 3], [4, 0, 7, 3])
    const q = ok(setRoomSize(p, { room: roomByName(p, 'R1').id, axis: 'x', size: 5 }))
    expect(roomMetrics(q, roomByName(q, 'R1').id).width).toBeCloseTo(5 - 0.15)
    expect(area(roomPolygon(q, roomByName(q, 'R2')))).toBeCloseTo(6)
  })

  it('moving a corner reshapes connected walls; deleting a room keeps shared walls', () => {
    const p = blankWithRooms([0, 0, 4, 3], [4, 0, 7, 3])
    const corner = Object.values(p.nodes).find((n) => n.x === 0 && n.y === 0)!
    const q = ok(moveNode(p, { node: corner.id, x: -1, y: 0 }))
    expect(area(roomPolygon(q, roomByName(q, 'R1')))).toBeCloseTo(13.5)
    const d = ok(deleteRoom(p, { room: roomByName(p, 'R1').id }))
    expect(Object.keys(d.walls)).toHaveLength(4)
    expect(Object.keys(d.rooms)).toHaveLength(1)
  })

  it('openings: fit, overlap and movement are validated', () => {
    let p = blankWithRooms([0, 0, 4, 3])
    const top = Object.values(p.walls).find((w) => nodePos(p, w.a).y === 0 && nodePos(p, w.b).y === 0)!
    expect(err(addOpening(p, { wall: top.id, kind: 'door', offset: 2, width: 4.5 }))).toBe('opening-fit')
    p = ok(addOpening(p, { wall: top.id, kind: 'door', offset: 1, width: 0.9 }))
    const door = Object.values(p.openings)[0]
    // a new opening requested on top of the door goes to the nearest free span instead of overlapping
    const beside = ok(addOpening(p, { wall: top.id, kind: 'window', offset: 1.5, width: 1 }))
    const win = Object.values(beside.openings).find((o) => o.kind === 'window')!
    expect(win.offset - win.width / 2).toBeGreaterThanOrEqual(1 + 0.45 + 0.05 - 1e-9)
    // ...while moving one opening onto another is still rejected
    expect(err(moveOpening(beside, { opening: win.id, offset: 1.2 }))).toBe('opening-overlap')
    expect(err(moveOpening(p, { opening: door.id, offset: 3.9 }))).toBe('opening-fit')
    expect(ok(moveOpening(p, { opening: door.id, offset: 3 })).openings[door.id].offset).toBe(3)
  })
})
