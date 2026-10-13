import { describe, expect, it } from 'vitest'
import { addOpening } from '../../../src/engine/commands/elements'
import { wallFrame } from '../../../src/engine/model/query'
import { compactHome } from '../../../src/engine/templates'
import { bestHeading, blocked, buildColliders, clearDistance, currentRoom, moveWithCollisions, roomCentres, spawnPoint } from '../../../src/engine/walk'
import { fitDistance, presetPose } from '../../../src/editor/scene/framing'
import { approach, keyIntent } from '../../../src/editor/scene/walkInput'
import { blankWithRooms, err, levelOf, ok } from './helpers'

const R = 0.25

describe('adding openings next to existing ones', () => {
  it('a click on an existing window places the new one in the nearest free span, with a note', () => {
    const p0 = blankWithRooms([0, 0, 6, 4])
    const wall = Object.values(p0.walls).find((w) => wallFrame(p0, w).length > 5.9)!
    const p1 = ok(addOpening(p0, { wall: wall.id, kind: 'window', offset: 3 }))
    const r = addOpening(p1, { wall: wall.id, kind: 'window', offset: 3 })
    const p2 = ok(r)
    expect(r.ok && r.warnings[0]).toMatch(/beside the existing opening/)
    const offsets = Object.values(p2.openings).map((o) => o.offset).sort((a, b) => a - b)
    expect(offsets[1] - offsets[0]).toBeGreaterThanOrEqual(1.2 + 0.05 - 1e-9) // width + clearance
  })

  it('a full wall is rejected with a reason instead of creating an overlap', () => {
    let p = blankWithRooms([0, 0, 3, 3])
    const wall = Object.values(p.walls)[0]
    p = ok(addOpening(p, { wall: wall.id, kind: 'window', offset: 0.9, width: 1.2 }))
    p = ok(addOpening(p, { wall: wall.id, kind: 'window', offset: 2.1, width: 1.0 }))
    const r = addOpening(p, { wall: wall.id, kind: 'door', offset: 1.5 })
    expect(err(r)).toBe('opening-overlap')
    expect(!r.ok && r.error.message).toMatch(/No free space on this wall/)
  })
})

describe('walkthrough navigation', () => {
  const p = compactHome()
  const level = levelOf(p)
  const c = buildColliders(p, level)

  it('every room centre is a free position, and all rooms are mutually reachable by walking', () => {
    const centres = roomCentres(p, level)
    for (const r of centres) expect(blocked(r.at, R, c)).toBe(false)
    // flood fill on a 10 cm grid from the hall, walking with collisions
    const hall = centres.find((r) => r.name === 'Hall')!.at
    const key = (q: { x: number; y: number }) => `${Math.round(q.x * 10)},${Math.round(q.y * 10)}`
    const seen = new Set([key(hall)])
    const queue = [hall]
    while (queue.length) {
      const q = queue.pop()!
      for (const d of [{ x: 0.1, y: 0 }, { x: -0.1, y: 0 }, { x: 0, y: 0.1 }, { x: 0, y: -0.1 }]) {
        const n = moveWithCollisions(q, d, R, c)
        if (Math.hypot(n.x - q.x - d.x, n.y - q.y - d.y) > 0.02) continue // blocked or deflected
        const k = key(n)
        if (seen.has(k) || n.x < -1 || n.y < -1 || n.x > 11 || n.y > 9) continue
        seen.add(k)
        queue.push({ x: Math.round(n.x * 10) / 10, y: Math.round(n.y * 10) / 10 })
      }
    }
    for (const r of centres) {
      const near = [...seen].some((k) => {
        const [x, y] = k.split(',').map((v) => Number(v) / 10)
        return Math.hypot(x - r.at.x, y - r.at.y) < 0.6
      })
      expect(near, `${r.name} reachable`).toBe(true)
    }
  })

  it('running speed in one frame cannot tunnel through a wall', () => {
    // hall (x 3.8–5.3) west wall at x = 3.8 has no door at y = 5.2 (the bedroom door is at 7.1–8.0)
    const q = moveWithCollisions({ x: 4.5, y: 5.2 }, { x: -5, y: 0 }, R, c)
    expect(q.x).toBeGreaterThan(3.8 + 0.06 + R - 1e-3)
  })

  it('the arrival heading looks into the home, down its longest open indoor view', () => {
    const inside = (q: { x: number; y: number }) => !!currentRoom(p, level, q)
    // the hall faces the living room through its doorway, not out of the open front door
    const s = spawnPoint(p, level)!
    const yaw = bestHeading(s, R, c, inside)
    expect(-Math.cos(yaw)).toBeLessThan(-0.7) // looking north (−y)
    for (const r of roomCentres(p, level)) {
      const yaw = bestHeading(r.at, R, c, inside)
      const view = clearDistance(r.at, { x: -Math.sin(yaw), y: -Math.cos(yaw) }, R, c, 12, 0.1, inside)
      // no sampled direction sees much further
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2
        expect(clearDistance(r.at, { x: -Math.sin(a), y: -Math.cos(a) }, R, c, 12, 0.1, inside)).toBeLessThanOrEqual(view * 1.05 + 1e-9)
      }
      expect(view).toBeGreaterThan(1)
    }
  })
})

describe('camera input and framing', () => {
  it('keys map to movement intent; opposing keys cancel', () => {
    expect(keyIntent(new Set(['w', 'd']))).toEqual({ f: 1, s: 1, v: 0 })
    expect(keyIntent(new Set(['w', 's', 'e']))).toEqual({ f: 0, s: 0, v: 1 })
    expect(keyIntent(new Set(['arrowdown', 'a', 'q']))).toEqual({ f: -1, s: -1, v: -1 })
  })

  it('acceleration is frame-rate independent', () => {
    // one 1/30 s step ≈ two 1/60 s steps
    const one = approach(9, 1 / 30)
    const two = 1 - (1 - approach(9, 1 / 60)) ** 2
    expect(one).toBeCloseTo(two, 10)
  })

  it('every preset frames the whole building (all box corners on screen) at any aspect, without wasting the view', () => {
    const b = { x0: 0, x1: 10, y0: 0, y1: 8.2 }
    for (const preset of ['overview', 'top', 'front', 'back', 'left', 'right'] as const)
      for (const aspect of [2.2, 1.6, 1, 0.63, 0.46]) {
        const pose = presetPose(b, 2.7, aspect, preset)
        // project the corners with a look-at camera
        const [px, py, pz] = pose.position
        const d = [pose.target[0] - px, pose.target[1] - py, pose.target[2] - pz]
        const L = Math.hypot(...d)
        const f = d.map((v) => v / L)
        let r = [-f[2], 0, f[0]]
        const rl = Math.hypot(...r)
        r = r.map((v) => v / rl)
        const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
        const t = Math.tan((45 * Math.PI) / 360)
        let maxX = 0
        let maxY = 0
        for (const x of [0, 10]) for (const y of [0, 2.7]) for (const z of [0, 8.2]) {
          const rel = [x - px, y - py, z - pz]
          const depth = rel[0] * f[0] + rel[1] * f[1] + rel[2] * f[2]
          maxX = Math.max(maxX, Math.abs((rel[0] * r[0] + rel[1] * r[1] + rel[2] * r[2]) / (depth * t * aspect)))
          maxY = Math.max(maxY, Math.abs((rel[0] * u[0] + rel[1] * u[1] + rel[2] * u[2]) / (depth * t)))
        }
        expect(Math.max(maxX, maxY), `${preset} @ ${aspect}`).toBeLessThanOrEqual(0.92 + 1e-6)
        expect(Math.max(maxX, maxY), `${preset} @ ${aspect} fills the view`).toBeGreaterThan(0.8)
      }
    expect(fitDistance(5, 0.5)).toBeGreaterThan(fitDistance(5, 1.8))
  })
})
