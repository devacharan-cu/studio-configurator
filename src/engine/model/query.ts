import { closestOnSegment, dist, norm, perp, sub, type V2 } from '../geometry/vec'
import type { Id, Node, Opening, Project, Room, Wall } from './types'

/** Read-only helpers over a Project. Pure functions; never mutate. */

export const nodePos = (p: Project, id: Id): V2 => {
  const n = p.nodes[id]
  return { x: n.x, y: n.y }
}

export const wallsOnLevel = (p: Project, level: Id) => Object.values(p.walls).filter((w) => w.level === level)
export const roomsOnLevel = (p: Project, level: Id) => Object.values(p.rooms).filter((r) => r.level === level)
export const nodesOnLevel = (p: Project, level: Id) => Object.values(p.nodes).filter((n) => n.level === level)
export const itemsOnLevel = (p: Project, level: Id) => Object.values(p.items).filter((i) => i.level === level)

export function wallEnds(p: Project, w: Wall): { a: V2; b: V2 } {
  return { a: nodePos(p, w.a), b: nodePos(p, w.b) }
}

export function wallLength(p: Project, w: Wall): number {
  const { a, b } = wallEnds(p, w)
  return dist(a, b)
}

/** Unit direction a→b and its left normal. */
export function wallFrame(p: Project, w: Wall): { a: V2; b: V2; dir: V2; normal: V2; length: number } {
  const { a, b } = wallEnds(p, w)
  const dir = norm(sub(b, a))
  return { a, b, dir, normal: perp(dir), length: dist(a, b) }
}

export function wallsAtNode(p: Project, nodeId: Id): Wall[] {
  return Object.values(p.walls).filter((w) => w.a === nodeId || w.b === nodeId)
}

export function wallBetween(p: Project, n1: Id, n2: Id): Wall | undefined {
  return Object.values(p.walls).find((w) => (w.a === n1 && w.b === n2) || (w.a === n2 && w.b === n1))
}

export const openingsOnWall = (p: Project, wallId: Id): Opening[] =>
  Object.values(p.openings)
    .filter((o) => o.wall === wallId)
    .sort((a, b) => a.offset - b.offset)

export const roomPolygon = (p: Project, r: Room): V2[] => r.boundary.map((id) => nodePos(p, id))

/** Walls along a room's boundary, in boundary order (undefined if an edge has no wall — invalid model). */
export function roomWalls(p: Project, r: Room): (Wall | undefined)[] {
  return r.boundary.map((id, i) => wallBetween(p, id, r.boundary[(i + 1) % r.boundary.length]))
}

export function roomsUsingWall(p: Project, wallId: Id): Room[] {
  const w = p.walls[wallId]
  if (!w) return []
  return Object.values(p.rooms).filter((r) =>
    r.boundary.some((id, i) => {
      const next = r.boundary[(i + 1) % r.boundary.length]
      return (id === w.a && next === w.b) || (id === w.b && next === w.a)
    }),
  )
}

/** Existing node on `level` within `tol` of point q. */
export function findNodeNear(p: Project, level: Id, q: V2, tol: number): Node | undefined {
  let best: Node | undefined
  let bestD = tol
  for (const n of nodesOnLevel(p, level)) {
    const d = dist(n, q)
    if (d <= bestD) {
      best = n
      bestD = d
    }
  }
  return best
}

/** Wall on `level` whose interior (not its ends) passes within `tol` of q. */
export function findWallThrough(p: Project, level: Id, q: V2, tol: number): { wall: Wall; t: number; point: V2 } | undefined {
  for (const w of wallsOnLevel(p, level)) {
    const { a, b } = wallEnds(p, w)
    const c = closestOnSegment(q, a, b)
    const L = dist(a, b)
    if (c.distance <= tol && c.t * L > tol && (1 - c.t) * L > tol) return { wall: w, t: c.t, point: c.point }
  }
  return undefined
}

export const levelOf = (p: Project, id: Id) => p.levels[id]
export const sortedLevels = (p: Project) => Object.values(p.levels).sort((a, b) => a.elevation - b.elevation)
