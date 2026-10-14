import { nodePos, openingsOnWall, roomPolygon, wallFrame, wallsAtNode } from '../model/query'
import { isOutdoor, type Id, type Opening, type Project, type Wall } from '../model/types'
import { signedArea } from './polygon'
import { add, angleOf, dist, dot, lineIntersection, scale, sub, type V2 } from './vec'

/**
 * Wall solids derived from the node–wall graph.
 *
 * Junctions: at every node, incident walls are sorted by angle; the corner between two neighbouring
 * walls is the intersection of one wall's left face line and the next wall's right face line (a mitre).
 * This gives clean L-, T- and X-junctions and walls of different thickness without boolean operations.
 */

export interface WallOutline {
  wall: Id
  /** Left face (left of a→b) from the a-end corner to the b-end corner, and the same for the right face. */
  left: [V2, V2]
  right: [V2, V2]
  /** Plan footprint polygon (includes junction node centres so junctions are fully covered). */
  footprint: V2[]
  /** Free ends (no other wall at that node) need an end cap. */
  capA: boolean
  capB: boolean
}

const MITRE_LIMIT = 4 // × half-thickness

interface Incident {
  wall: Wall
  out: V2 // unit direction pointing away from the node
  half: number
  angle: number
}

function incidents(p: Project, nodeId: Id): Incident[] {
  const n = nodePos(p, nodeId)
  return wallsAtNode(p, nodeId)
    .map((w) => {
      const other = nodePos(p, w.a === nodeId ? w.b : w.a)
      const d = sub(other, n)
      const l = Math.hypot(d.x, d.y) || 1
      const out = { x: d.x / l, y: d.y / l }
      return { wall: w, out, half: w.thickness / 2, angle: angleOf(out) }
    })
    .sort((a, b) => a.angle - b.angle)
}

/** Corner points for a wall at one node: on the left and right of the outward direction. */
function cornersAt(p: Project, nodeId: Id, wallId: Id): { left: V2; right: V2; free: boolean } {
  const n = nodePos(p, nodeId)
  const list = incidents(p, nodeId)
  const i = list.findIndex((x) => x.wall.id === wallId)
  const me = list[i]
  const leftN = { x: -me.out.y, y: me.out.x }
  const ownLeft = add(n, scale(leftN, me.half))
  const ownRight = add(n, scale(leftN, -me.half))
  if (list.length < 2) return { left: ownLeft, right: ownRight, free: true }

  const corner = (ia: Incident, ib: Incident, fallback: V2) => {
    // left face of ia meets right face of ib (ib is the next wall counter-clockwise)
    const la = { x: -ia.out.y, y: ia.out.x }
    const lb = { x: -ib.out.y, y: ib.out.x }
    const pa = add(n, scale(la, ia.half))
    const pb = add(n, scale(lb, -ib.half))
    const hit = lineIntersection(pa, ia.out, pb, ib.out)
    if (!hit || dist(hit, n) > MITRE_LIMIT * Math.max(ia.half, ib.half)) return fallback
    return hit
  }
  const next = list[(i + 1) % list.length]
  const prev = list[(i - 1 + list.length) % list.length]
  return { left: corner(me, next, ownLeft), right: corner(prev, me, ownRight), free: false }
}

export function wallOutline(p: Project, w: Wall): WallOutline {
  const atA = cornersAt(p, w.a, w.id)
  const atB = cornersAt(p, w.b, w.id)
  // At a, outward = a→b so its left is the wall's left. At b, outward = b→a so its left is the wall's right.
  const left: [V2, V2] = [atA.left, atB.right]
  const right: [V2, V2] = [atA.right, atB.left]
  const A = nodePos(p, w.a)
  const B = nodePos(p, w.b)
  const footprint = [right[0], right[1], ...(atB.free ? [] : [B]), left[1], left[0], ...(atA.free ? [] : [A])]
  return { wall: w.id, left, right, footprint, capA: atA.free, capB: atB.free }
}

/* ---------- Faces ---------- */

export type FaceRole = 'left' | 'right' | 'reveal' | 'top' | 'cap'

/** A planar quad (or polygon for tops) in world space: [x, y(up), z] with outward normal. */
export interface Face {
  role: FaceRole
  points: [number, number, number][]
  normal: [number, number, number]
}

export interface WallSolid {
  wall: Id
  faces: Face[]
  /** u-range (along the centreline from a) that openings may occupy on this wall. */
  usable: [number, number]
}

const to3 = (q: V2, y: number): [number, number, number] => [q.x, y, q.y]

/** Range of positions along the wall's centreline covered by both faces (the inner, shorter face). */
export function usableRange(p: Project, w: Wall, outline = wallOutline(p, w)): [number, number] {
  const { a, dir } = wallFrame(p, w)
  const u = (q: V2) => dot(sub(q, a), dir)
  return [Math.max(u(outline.left[0]), u(outline.right[0])), Math.min(u(outline.left[1]), u(outline.right[1]))]
}

/**
 * Build all faces of one wall: both long faces with rectangular holes for openings (decomposed into
 * rectangles — no CSG needed), opening reveals (jambs, head, sill), end caps and the top.
 * `displayHeight` lets views show cut-away walls without changing the model.
 */
export function wallSolid(p: Project, w: Wall, elevation: number, displayHeight = w.height): WallSolid {
  const outline = wallOutline(p, w)
  const { a, dir, normal } = wallFrame(p, w)
  const H = Math.min(w.height, displayHeight)
  const y0 = elevation
  const half = w.thickness / 2
  const u = (q: V2) => dot(sub(q, a), dir)
  const at = (uu: number, side: number) => add(add(a, scale(dir, uu)), scale(normal, side * half))
  const faces: Face[] = []
  const openings = openingsOnWall(p, w.id)

  const holes = openings
    .map((o) => ({ u0: o.offset - o.width / 2, u1: o.offset + o.width / 2, v0: o.sill, v1: Math.min(o.sill + o.height, H) }))
    .filter((h) => h.v0 < H)

  const sideFaces = (role: 'left' | 'right', seg: [V2, V2], side: number) => {
    const uA = u(seg[0])
    const uB = u(seg[1])
    const n3: [number, number, number] = [normal.x * side, 0, normal.y * side]
    const rect = (u0: number, u1: number, v0: number, v1: number) => {
      if (u1 - u0 < 1e-6 || v1 - v0 < 1e-6) return
      // Points are interpolated along the actual face segment so mitred ends stay exact.
      const P = (uu: number) => {
        const t = (uu - uA) / (uB - uA || 1)
        return { x: seg[0].x + (seg[1].x - seg[0].x) * t, y: seg[0].y + (seg[1].y - seg[0].y) * t }
      }
      faces.push({ role, normal: n3, points: [to3(P(u0), y0 + v0), to3(P(u1), y0 + v0), to3(P(u1), y0 + v1), to3(P(u0), y0 + v1)] })
    }
    let cursor = uA
    for (const h of holes) {
      const h0 = Math.max(h.u0, uA)
      const h1 = Math.min(h.u1, uB)
      if (h1 <= h0) continue
      rect(cursor, h0, 0, H)
      rect(h0, h1, 0, h.v0)
      rect(h0, h1, h.v1, H)
      cursor = h1
    }
    rect(cursor, uB, 0, H)
  }
  sideFaces('left', outline.left, 1)
  sideFaces('right', outline.right, -1)

  // Reveals: jambs, head, sill — spanning the full thickness.
  for (const h of holes) {
    const quad = (pts: V2[], ys: number[], n: [number, number, number]): Face => ({
      role: 'reveal',
      normal: n,
      points: pts.map((q, i) => to3(q, y0 + ys[i])),
    })
    const L0 = at(h.u0, 1)
    const R0 = at(h.u0, -1)
    const L1 = at(h.u1, 1)
    const R1 = at(h.u1, -1)
    faces.push(quad([R0, L0, L0, R0], [h.v0, h.v0, h.v1, h.v1], [dir.x, 0, dir.y]))
    faces.push(quad([L1, R1, R1, L1], [h.v0, h.v0, h.v1, h.v1], [-dir.x, 0, -dir.y]))
    if (h.v1 < H - 1e-6) faces.push(quad([R0, R1, L1, L0], [h.v1, h.v1, h.v1, h.v1], [0, -1, 0]))
    if (h.v0 > 1e-6) faces.push(quad([R0, L0, L1, R1], [h.v0, h.v0, h.v0, h.v0], [0, 1, 0]))
  }

  // End caps on free ends.
  if (outline.capA) {
    const [l, r] = [outline.left[0], outline.right[0]]
    faces.push({ role: 'cap', normal: [-dir.x, 0, -dir.y], points: [to3(l, y0), to3(r, y0), to3(r, y0 + H), to3(l, y0 + H)] })
  }
  if (outline.capB) {
    const [l, r] = [outline.left[1], outline.right[1]]
    faces.push({ role: 'cap', normal: [dir.x, 0, dir.y], points: [to3(r, y0), to3(l, y0), to3(l, y0 + H), to3(r, y0 + H)] })
  }

  // Top (polygon; triangulated by the renderer).
  faces.push({ role: 'top', normal: [0, 1, 0], points: outline.footprint.map((q) => to3(q, y0 + H)) })

  return { wall: w.id, faces, usable: usableRange(p, w, outline) }
}

/** Which room (if any) lies on each side of a wall. */
/**
 * Which room lies on each side of each wall. With `indoorOnly`, open-air rooms (balcony, terrace,
 * courtyard) are ignored, so a wall between a living room and a courtyard reads as an exterior wall.
 */
export function wallSides(p: Project, indoorOnly = false): Record<Id, { left?: Id; right?: Id }> {
  const out: Record<Id, { left?: Id; right?: Id }> = {}
  for (const r of Object.values(p.rooms)) {
    if (indoorOnly && isOutdoor(r)) continue
    const ccw = signedArea(roomPolygon(p, r)) > 0
    r.boundary.forEach((id, i) => {
      const next = r.boundary[(i + 1) % r.boundary.length]
      const w = Object.values(p.walls).find((x) => (x.a === id && x.b === next) || (x.a === next && x.b === id))
      if (!w) return
      const forward = w.a === id
      // Interior of a CCW polygon is on the left of each edge in boundary order.
      const roomOnLeft = forward === ccw
      out[w.id] = { ...out[w.id], [roomOnLeft ? 'left' : 'right']: r.id }
    })
  }
  return out
}

/** World-space centre of an opening on its wall's centreline. */
export function openingCenter(p: Project, o: Opening): V2 {
  const w = p.walls[o.wall]
  const { a, dir } = wallFrame(p, w)
  return add(a, scale(dir, o.offset))
}

