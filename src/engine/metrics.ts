import { roomInnerPolygon } from './commands/structure'
import { area, centroid, interiorPoint, perimeter } from './geometry/polygon'
import { roomPolygon } from './model/query'
import type { Id, Project } from './model/types'

export interface RoomMetrics {
  /** Net floor area inside the wall faces, m². */
  netArea: number
  /** Area to wall centrelines, m². */
  grossArea: number
  perimeter: number
  /** Bounding extents of the inner outline (useful for rectangular rooms). */
  width: number
  depth: number
  labelAt: { x: number; y: number }
}

export function roomMetrics(p: Project, roomId: Id): RoomMetrics {
  const r = p.rooms[roomId]
  const poly = roomPolygon(p, r)
  const inner = roomInnerPolygon(p, roomId)
  const xs = inner.map((q) => q.x)
  const ys = inner.map((q) => q.y)
  const c = centroid(poly)
  return {
    netArea: area(inner),
    grossArea: area(poly),
    perimeter: perimeter(inner),
    width: Math.max(...xs) - Math.min(...xs),
    depth: Math.max(...ys) - Math.min(...ys),
    labelAt: interiorPoint(poly).x === c.x ? c : interiorPoint(poly),
  }
}

export const fmtLen = (m: number) => (Math.abs(m) >= 10 ? m.toFixed(1) : m.toFixed(2)) + ' m'
export const fmtArea = (m2: number) => `${m2.toFixed(1)} m²`
