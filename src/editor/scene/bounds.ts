import type { Project } from '../../engine/model/types'

/** Bounding box of a level's corners, or of the whole building (plan coordinates). */
export function planBounds(p: Project, level?: string) {
  const nodes = Object.values(p.nodes).filter((n) => !level || n.level === level)
  if (!nodes.length) return { x0: -4, x1: 4, y0: -4, y1: 4 }
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}
