import { getAsset } from './assets/catalog'
import { itemCorners, roomAt } from './commands/structure'
import { interiorPoint, signedArea, strictlyInside } from './geometry/polygon'
import { entrances } from './geometry/site'
import { add, closestOnSegment, len, norm, perp, scale, sub, type V2 } from './geometry/vec'
import { openingCenter } from './geometry/walls'
import { openingsOnWall, roomPolygon, wallBetween, wallFrame } from './model/query'
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

/**
 * Walls (with door/passage gaps) and furniture taller than `minItemHeight`. The walker uses 25 cm (you can't
 * step over a sofa); sight lines use eye-level obstacles only (you can see over a bed).
 */
export function buildColliders(p: Project, level: Id, minItemHeight = 0.25): Colliders {
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
    .filter((it) => it.level === level && !getAsset(it.asset)?.walkable && (getAsset(it.asset)?.footprint.h ?? 0) > minItemHeight)
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

/**
 * Where a walkthrough starts: just inside the front door, as a visitor arrives; otherwise in the hall
 * (or the first room) at a free spot.
 */
export function spawnPoint(p: Project, level: Id): V2 | null {
  const c = buildColliders(p, level)
  const front = entrances(p, level)[0]
  if (front) {
    const q = { x: front.at.x - front.outward.x * 0.95, y: front.at.y - front.outward.y * 0.95 }
    if (currentRoom(p, level, q) && !blocked(q, 0.25, c)) return q
  }
  const rooms = Object.values(p.rooms).filter((r) => r.level === level)
  const room = rooms.find((r) => r.type === 'hall') ?? rooms[0]
  return room ? walkablePoint(roomPolygon(p, room), c) : null
}

/**
 * A point inside the polygon where a walker fits, as close as possible to its natural centre
 * (rooms often have a table or bed in the middle). Falls back to the centre if the room is full.
 */
export function walkablePoint(poly: V2[], c: Colliders, r = 0.25): V2 {
  const centre = interiorPoint(poly)
  if (!blocked(centre, r, c)) return centre
  const xs = poly.map((q) => q.x)
  const ys = poly.map((q) => q.y)
  let best: V2 | null = null
  let bestD = Infinity
  for (let x = Math.min(...xs) + r; x <= Math.max(...xs) - r; x += 0.1)
    for (let y = Math.min(...ys) + r; y <= Math.max(...ys) - r; y += 0.1) {
      const q = { x, y }
      const d = Math.hypot(x - centre.x, y - centre.y)
      if (d < bestD && strictlyInside(q, poly, r) && !blocked(q, r, c)) {
        best = q
        bestD = d
      }
    }
  return best ?? centre
}

export function currentRoom(p: Project, level: Id, q: V2) {
  return roomAt(p, level, q)
}


/** A walkable point inside each room on a level, for "go to room" navigation. */
export function roomCentres(p: Project, level: Id): { id: Id; name: string; at: V2 }[] {
  const c = buildColliders(p, level)
  return Object.values(p.rooms)
    .filter((r) => r.level === level)
    .map((r) => ({ id: r.id, name: r.name, at: walkablePoint(roomPolygon(p, r), c) }))
}

/** True if a circle of radius r at q overlaps any collider (used for line-of-travel probes). */
export function blocked(q: V2, r: number, c: Colliders): boolean {
  const out = resolveCollisions(q, r, c, 1)
  return Math.hypot(out.x - q.x, out.y - q.y) > 1e-3
}

/**
 * How far a walker can travel from `from` along unit `dir` before hitting something (capped at `max`).
 * With `inside`, the view also ends where it leaves the building (e.g. out through the front door).
 */
export function clearDistance(from: V2, dir: V2, r: number, c: Colliders, max = 12, step = 0.1, inside?: (q: V2) => boolean): number {
  for (let d = step; d <= max; d += step) {
    const q = { x: from.x + dir.x * d, y: from.y + dir.y * d }
    if (blocked(q, r, c) || (inside && !inside(q))) return d - step
  }
  return max
}

/**
 * The most open direction from a point, as a walkthrough yaw (camera forward = plan (-sin yaw, -cos yaw)).
 * Used when entering a room so the visitor looks into it, not at the nearest wall or door leaf.
 */
export function bestHeading(from: V2, r: number, c: Colliders, inside?: (q: V2) => boolean, samples = 24, cone = 0): number {
  const dist = (yaw: number) => clearDistance(from, { x: -Math.sin(yaw), y: -Math.cos(yaw) }, r, c, 12, 0.1, inside)
  // with a cone, score the whole field of view (mean of 7 rays), not one ray: in a rectangular room the
  // longest single ray is always the diagonal, which looks into a corner
  const rays = cone > 0 ? [-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1].map((k) => k * cone) : [0]
  let best = { yaw: 0, score: -1 }
  for (let i = 0; i < samples; i++) {
    const yaw = (i / samples) * Math.PI * 2
    // prefer long, unobstructed views; a slight bias towards right angles reads as "looking down the room"
    const score = (rays.reduce((s, d) => s + dist(yaw + d), 0) / rays.length) * (i % (samples / 4) === 0 ? 1.04 : 1)
    if (score > best.score) best = { yaw, score }
  }
  return best.yaw
}

/**
 * Where to look on arriving in a room: the field of view that sees furthest *within that room*, past furniture
 * below eye level (you see over a bed, not over a wardrobe). Probing walkable space instead sent the view
 * out through the nearest doorway.
 */
export function arrivalHeading(p: Project, level: Id, q: V2, sight = buildColliders(p, level, SIGHT_ITEM_HEIGHT)): number {
  const room = currentRoom(p, level, q)?.id
  return bestHeading(q, SIGHT_RADIUS, sight, (x) => !!room && currentRoom(p, level, x)?.id === room, 24, VIEW_CONE)
}
/** Furniture taller than this blocks a standing person's view. */
export const SIGHT_ITEM_HEIGHT = 1.4
/** Sight lines are probed with a thin circle so table edges and chair backs don't hide a view. */
const SIGHT_RADIUS = 0.08
/** Half the walkthrough's horizontal field of view (~90°), radians. */
const VIEW_CONE = (40 * Math.PI) / 180

export interface RoomEntry {
  id: Id
  name: string
  at: V2
  /** Walkthrough yaw (camera forward = plan (−sin yaw, −cos yaw)). */
  yaw: number
}

/**
 * Where "go to room" puts the visitor: just inside the room's main entrance (its widest door or
 * passage), turned towards the room's centre — the view you get walking in, the way architectural
 * walkthroughs present a room. Rooms without a door fall back to a free point and the widest view.
 */
export function roomEntries(p: Project, level: Id): RoomEntry[] {
  const c = buildColliders(p, level)
  return Object.values(p.rooms)
    .filter((r) => r.level === level)
    .map((r) => {
      const poly = roomPolygon(p, r)
      const centre = interiorPoint(poly)
      const ccw = signedArea(poly) > 0
      let best: { width: number; centre: V2; inward: V2; half: number } | null = null
      r.boundary.forEach((id, i) => {
        const w = wallBetween(p, id, r.boundary[(i + 1) % r.boundary.length])
        if (!w) return
        const d = norm(sub(poly[(i + 1) % poly.length], poly[i]))
        const inward = ccw ? perp(d) : scale(perp(d), -1)
        for (const o of openingsOnWall(p, w.id)) {
          if (o.kind === 'window' || (best && best.width >= o.width)) continue
          best = { width: o.width, centre: openingCenter(p, o), inward, half: w.thickness / 2 }
        }
      })
      const entry = best as { width: number; centre: V2; inward: V2; half: number } | null
      if (entry) {
        for (let step = 0.55; step < 2.5; step += 0.1) {
          const q = add(entry.centre, scale(entry.inward, entry.half + step))
          if (!strictlyInside(q, poly, 0.25) || blocked(q, 0.25, c)) continue
          const toCentre = sub(centre, q)
          const look = len(toCentre) > 0.3 ? norm(toCentre) : entry.inward
          const dir = norm(add(entry.inward, look))
          return { id: r.id, name: r.name, at: q, yaw: Math.atan2(-dir.x, -dir.y) }
        }
      }
      const at = walkablePoint(poly, c)
      return { id: r.id, name: r.name, at, yaw: arrivalHeading(p, level, at) }
    })
}
