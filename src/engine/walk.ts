import { getAsset } from './assets/catalog'
import { itemCorners, roomAt } from './commands/structure'
import { interiorPoint } from './geometry/polygon'
import { add, closestOnSegment, norm, scale, sub, type V2 } from './geometry/vec'
import { openingsOnWall, roomPolygon, wallFrame } from './model/query'
import type { Id, Project } from './model/types'

/**
 * Walkthrough collision in plan space (the player is a circle on the floor).
 * Walls become capsules along their centreline, interrupted where doors and passages are, so you can
 * walk through doorways but not through walls or windows. Furniture footprints are solid boxes.
 */

export interface Capsule {
  a: V2
  b: V2
  r: number
  wall: Id
}
export interface Box {
  corners: V2[]
  item: Id
}
export interface Colliders {
  capsules: Capsule[]
  boxes: Box[]
}

export function buildColliders(p: Project, level: Id): Colliders {
  const capsules: Capsule[] = []
  for (const w of Object.values(p.walls)) {
    if (w.level !== level) continue
    const { a, dir, length } = wallFrame(p, w)
    const gaps = openingsOnWall(p, w.id)
      .filter((o) => o.kind !== 'window' && o.sill < 0.05)
      .map((o) => [o.offset - o.width / 2, o.offset + o.width / 2] as const)
    let cursor = 0
    for (const [g0, g1] of gaps) {
      if (g0 > cursor) capsules.push({ a: add(a, scale(dir, cursor)), b: add(a, scale(dir, g0)), r: w.thickness / 2, wall: w.id })
      cursor = Math.max(cursor, g1)
    }
    if (cursor < length) capsules.push({ a: add(a, scale(dir, cursor)), b: add(a, scale(dir, length)), r: w.thickness / 2, wall: w.id })
  }
  const boxes: Box[] = Object.values(p.items)
    .filter((it) => it.level === level && !getAsset(it.asset)?.walkable && (getAsset(it.asset)?.footprint.h ?? 0) > 0.25)
    .map((it) => ({ corners: itemCorners(it), item: it.id }))
  return { capsules, boxes }
}

/** Push a circle (centre q, radius r) out of every collider. Iterates so corners resolve cleanly. */
export function resolveCollisions(q: V2, r: number, c: Colliders, iterations = 4): V2 {
  let pos = q
  for (let it = 0; it < iterations; it++) {
    let moved = false
    for (const cap of c.capsules) {
      const hit = closestOnSegment(pos, cap.a, cap.b)
      const minD = cap.r + r
      if (hit.distance < minD) {
        const n = hit.distance > 1e-9 ? norm(sub(pos, hit.point)) : norm({ x: -(cap.b.y - cap.a.y), y: cap.b.x - cap.a.x })
        pos = add(hit.point, scale(n, minD + 1e-4))
        moved = true
      }
    }
    for (const box of c.boxes) {
      const pts = box.corners
      // nearest point on the box boundary; push out if the centre is inside or within r of it
      let best = { point: pts[0], distance: Infinity }
      for (let i = 0; i < pts.length; i++) {
        const h = closestOnSegment(pos, pts[i], pts[(i + 1) % pts.length])
        if (h.distance < best.distance) best = h
      }
      const inside = pts.every((pt, i) => {
        const nx = pts[(i + 1) % pts.length]
        const e = sub(nx, pt)
        return e.x * (pos.y - pt.y) - e.y * (pos.x - pt.x) <= 0
      }) || pts.every((pt, i) => {
        const nx = pts[(i + 1) % pts.length]
        const e = sub(nx, pt)
        return e.x * (pos.y - pt.y) - e.y * (pos.x - pt.x) >= 0
      })
      if (inside || best.distance < r) {
        const out = norm(sub(pos, best.point))
        const dirOut = inside ? scale(out, -1) : out
        pos = add(best.point, scale(dirOut, r + 1e-4))
        moved = true
      }
    }
    if (!moved) break
  }
  return pos
}

/** Swept movement: sub-steps so fast movement can't tunnel through thin walls. */
export function moveWithCollisions(from: V2, delta: V2, r: number, c: Colliders): V2 {
  const L = Math.hypot(delta.x, delta.y)
  const steps = Math.max(1, Math.ceil(L / (r * 0.5)))
  let pos = from
  for (let i = 0; i < steps; i++) pos = resolveCollisions(add(pos, scale(delta, 1 / steps)), r, c)
  return pos
}

/** A good place to start a walkthrough: inside the hall (entrance) if there is one. */
export function spawnPoint(p: Project, level: Id): V2 | null {
  const rooms = Object.values(p.rooms).filter((r) => r.level === level)
  const room = rooms.find((r) => r.type === 'hall') ?? rooms[0]
  return room ? interiorPoint(roomPolygon(p, room)) : null
}

export function currentRoom(p: Project, level: Id, q: V2) {
  return roomAt(p, level, q)
}


/** A walkable point inside each room on a level, for "go to room" navigation. */
export function roomCentres(p: Project, level: Id): { id: Id; name: string; at: V2 }[] {
  return Object.values(p.rooms)
    .filter((r) => r.level === level)
    .map((r) => ({ id: r.id, name: r.name, at: interiorPoint(roomPolygon(p, r)) }))
}
