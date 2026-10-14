import { openingsOnWall, roomPolygon, roomsOnLevel, wallBetween, wallFrame, wallsOnLevel } from '../model/query'
import { isOutdoor, type Id, type Project, type Room } from '../model/types'
import { insetPolygon, signedArea } from './polygon'
import { add, dot, len, norm, perp, scale, sub, type V2 } from './vec'
import { wallSides } from './walls'

/**
 * Derived architectural detail that is not part of the model: skirting boards, the flat roof and the
 * site (terrace, front path). Pure functions of the project, so they follow every edit and are unit-tested.
 */

/** Skirting stops this far either side of a door/passage opening (the door casing sits there). */
export const CASING_WIDTH = 0.07

export interface SkirtingRun {
  a: V2
  b: V2
  /** Unit normal pointing into the room. */
  inward: V2
}

/**
 * Skirting along each inner wall face of a room, interrupted at doors and passages.
 * Each boundary edge's inner face line is offset by half the wall thickness; its ends come from the
 * neighbouring edges (the same mitre as the inner face of the wall solids).
 */
export function skirtingRuns(p: Project, room: Room): SkirtingRun[] {
  const poly = roomPolygon(p, room)
  const n = poly.length
  const walls = room.boundary.map((id, i) => wallBetween(p, id, room.boundary[(i + 1) % n]))
  const inner = insetPolygon(
    poly,
    walls.map((w) => (w ? w.thickness / 2 : 0)),
  )
  const ccw = signedArea(poly) > 0
  const out: SkirtingRun[] = []
  for (let i = 0; i < n; i++) {
    const w = walls[i]
    if (!w) continue
    const d = norm(sub(poly[(i + 1) % n], poly[i]))
    const inward = ccw ? perp(d) : scale(perp(d), -1)
    // project both ends onto this edge's own inner line (a collinear neighbour of another thickness
    // reports its own offset point)
    const base = add(poly[i], scale(inward, w.thickness / 2))
    const s0 = dot(sub(inner[i], base), d)
    const s1 = dot(sub(inner[(i + 1) % n], base), d)
    if (s1 - s0 < 0.02) continue
    // door and passage gaps, in this edge's parameter
    const { a, dir } = wallFrame(p, w)
    const gaps = openingsOnWall(p, w.id)
      .filter((o) => o.kind !== 'window' && o.sill < 0.05)
      .map((o) => {
        const e0 = dot(sub(add(a, scale(dir, o.offset - o.width / 2)), base), d)
        const e1 = dot(sub(add(a, scale(dir, o.offset + o.width / 2)), base), d)
        return [Math.min(e0, e1) - CASING_WIDTH, Math.max(e0, e1) + CASING_WIDTH] as [number, number]
      })
      .sort((x, y) => x[0] - y[0])
    let from = s0
    const push = (t0: number, t1: number) => {
      if (t1 - t0 >= 0.02) out.push({ a: add(base, scale(d, t0)), b: add(base, scale(d, t1)), inward })
    }
    for (const [g0, g1] of gaps) {
      push(from, Math.min(g0, s1))
      from = Math.max(from, g1)
    }
    push(from, s1)
  }
  return out
}

export interface RoofStrip {
  /** Rectangle corners in order (plan). */
  corners: [V2, V2, V2, V2]
}

export interface RoofPlan {
  /** Room polygons on the wall centrelines: together they tile the area inside the outer walls. */
  slabs: V2[][]
  /** One rectangle per exterior wall, from its centreline out past the outer face (eaves), extended
   *  at both ends so corners and re-entrant corners are covered. */
  strips: RoofStrip[]
}

/** Flat roof outline for a level: room slabs plus an overhanging strip along every exterior wall. */
export function roofPlan(p: Project, level: Id, overhang = 0.25): RoofPlan {
  const sides = wallSides(p, true)
  const slabs = roomsOnLevel(p, level)
    .filter((r) => !isOutdoor(r))
    .map((r) => roomPolygon(p, r))
  const strips: RoofStrip[] = []
  for (const w of wallsOnLevel(p, level)) {
    const s = sides[w.id] ?? {}
    // exactly one side has a room: the other side is outside
    if (!!s.left === !!s.right) continue
    const { a, b, dir, normal } = wallFrame(p, w)
    const outward = s.left ? scale(normal, -1) : normal
    const e = w.thickness / 2 + overhang
    const a0 = sub(a, scale(dir, e))
    const b0 = add(b, scale(dir, e))
    strips.push({ corners: [a0, b0, add(b0, scale(outward, e)), add(a0, scale(outward, e))] })
  }
  return { slabs, strips }
}

export interface Entrance {
  /** Point on the outer face of the wall at the door centre. */
  at: V2
  /** Unit direction pointing away from the building. */
  outward: V2
  width: number
}

/**
 * Exterior doors (a door on a wall with a room on one side only), widest first. Used to lay a path
 * from the front door and to place the street viewpoint.
 */
export function entrances(p: Project, level: Id): Entrance[] {
  // a way into the house: a door with a room on one side and nothing at all on the other (a door onto
  // a balcony or courtyard leads to a parapet or the house again, not to the street)
  const sides = wallSides(p)
  const out: Entrance[] = []
  for (const w of wallsOnLevel(p, level)) {
    const s = sides[w.id] ?? {}
    if (!!s.left === !!s.right) continue
    if (isOutdoor(p.rooms[(s.left ?? s.right)!])) continue
    const { a, dir, normal } = wallFrame(p, w)
    const outward = s.left ? scale(normal, -1) : normal
    for (const o of openingsOnWall(p, w.id)) {
      if (o.kind !== 'door') continue
      out.push({ at: add(add(a, scale(dir, o.offset)), scale(outward, w.thickness / 2)), outward, width: o.width })
    }
  }
  return out.sort((x, y) => y.width - x.width)
}

/** Length of a skirting run (for tests and metrics). */
export const runLength = (r: SkirtingRun) => len(sub(r.b, r.a))
