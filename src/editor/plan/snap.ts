import type { V2 } from '../../engine/geometry/vec'
import type { Id, Project } from '../../engine/model/types'

export const GRID = 0.05

export interface SnapResult {
  point: V2
  /** Alignment guides to draw (plan coordinates). */
  guides: { from: V2; to: V2 }[]
  node?: Id
}

/**
 * Snap a plan point: to an existing corner (strongest), else align x/y with other corners,
 * else to the 5 cm grid. Tolerance is in metres, scaled by zoom by the caller.
 */
export function snapPoint(p: Project, level: Id, q: V2, tol: number, exclude: Set<Id> = new Set()): SnapResult {
  const nodes = Object.values(p.nodes).filter((n) => n.level === level && !exclude.has(n.id))
  let best: (typeof nodes)[number] | undefined
  let bestD = tol
  for (const n of nodes) {
    const d = Math.hypot(n.x - q.x, n.y - q.y)
    if (d < bestD) {
      best = n
      bestD = d
    }
  }
  if (best) return { point: { x: best.x, y: best.y }, guides: [], node: best.id }

  let x = Math.round(q.x / GRID) * GRID
  let y = Math.round(q.y / GRID) * GRID
  const guides: SnapResult['guides'] = []
  let ax: (typeof nodes)[number] | undefined
  let ay: (typeof nodes)[number] | undefined
  for (const n of nodes) {
    if (Math.abs(n.x - q.x) < tol && (!ax || Math.abs(n.x - q.x) < Math.abs(ax.x - q.x))) ax = n
    if (Math.abs(n.y - q.y) < tol && (!ay || Math.abs(n.y - q.y) < Math.abs(ay.y - q.y))) ay = n
  }
  if (ax) x = ax.x
  if (ay) y = ay.y
  if (ax) guides.push({ from: { x: ax.x, y: ax.y }, to: { x, y } })
  if (ay) guides.push({ from: { x: ay.x, y: ay.y }, to: { x, y } })
  return { point: { x, y }, guides }
}

export const snapLength = (v: number, step = GRID) => Math.round(v / step) * step
