import { add, dot, scale, sub, type V2 } from '../geometry/vec'
import { sortedLevels } from './query'
import { LIMITS, type Id, type Level, type Project, type Stair } from './types'

/** Everything derived from a stair and the two levels it joins. Pure; recomputed whenever needed. */
export interface StairGeometry {
  stair: Stair
  from: Level
  /** The level it arrives on (undefined if there is no level above — an invalid model). */
  to?: Level
  rise: number
  risers: number
  riser: number
  going: number
  /** Unit plan direction of ascent, and the lateral unit direction (the climber's right hand). */
  dir: V2
  side: V2
  /** Footprint corners: bottom-left, bottom-right, top-right, top-left (bottom = where you start climbing). */
  corners: [V2, V2, V2, V2]
  bottomMid: V2
  topMid: V2
}

export const stairsOf = (p: Project): Stair[] => Object.values(p.stairs ?? {})

/** The next level up from `level`, by elevation. */
export function levelAbove(p: Project, level: Id): Level | undefined {
  const ls = sortedLevels(p)
  const i = ls.findIndex((l) => l.id === level)
  return i >= 0 ? ls[i + 1] : undefined
}

export function riserCount(rise: number) {
  return Math.max(2, Math.round(rise / LIMITS.riser))
}

export function stairGeometry(p: Project, s: Stair): StairGeometry {
  const from = p.levels[s.level]
  const to = levelAbove(p, s.level)
  const rise = to ? to.elevation - from.elevation : from.height
  const risers = riserCount(rise)
  const dir = { x: Math.cos(s.rotation), y: -Math.sin(s.rotation) }
  const side = { x: Math.sin(s.rotation), y: Math.cos(s.rotation) }
  const c = { x: s.x, y: s.y }
  const hl = s.length / 2
  const hw = s.width / 2
  const bottomMid = sub(c, scale(dir, hl))
  const topMid = add(c, scale(dir, hl))
  return {
    stair: s,
    from,
    to,
    rise,
    risers,
    riser: rise / risers,
    going: s.length / risers,
    dir,
    side,
    corners: [sub(bottomMid, scale(side, hw)), add(bottomMid, scale(side, hw)), add(topMid, scale(side, hw)), sub(topMid, scale(side, hw))],
    bottomMid,
    topMid,
  }
}

/** A point in the stair's frame: u = distance along the run from the bottom edge, v = lateral offset from the centreline. */
export function stairLocal(g: StairGeometry, q: V2): { u: number; v: number } {
  const d = sub(q, g.bottomMid)
  return { u: dot(d, g.dir), v: dot(d, g.side) }
}

/** Height of the walking surface above the lower floor at a point on the flight (clamped to the flight). */
export function stairHeightAt(g: StairGeometry, q: V2): number {
  const { u } = stairLocal(g, q)
  return (Math.min(Math.max(u, 0), g.stair.length) / g.stair.length) * g.rise
}

/** The stair length for a comfortable going on a given rise (rounded up to 5 cm). */
export function defaultStairLength(rise: number, going = 0.27) {
  return Math.ceil((riserCount(rise) * going) / 0.05) * 0.05
}

/** Rectangle (convex polygon) overlap by the separating-axis test; touching edges don't count. */
export function convexOverlap(a: V2[], b: V2[], eps = 1e-6): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const e = sub(poly[(i + 1) % poly.length], poly[i])
      const axis = { x: -e.y, y: e.x }
      const pa = a.map((q) => dot(q, axis))
      const pb = b.map((q) => dot(q, axis))
      if (Math.max(...pa) <= Math.min(...pb) + eps || Math.max(...pb) <= Math.min(...pa) + eps) return false
    }
  }
  return true
}
