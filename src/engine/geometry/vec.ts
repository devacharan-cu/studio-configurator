/** Minimal 2D vector maths on plain {x, y} objects (plan coordinates, metres). */

export interface V2 {
  x: number
  y: number
}

export const v = (x: number, y: number): V2 => ({ x, y })
export const add = (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (a: V2, s: number): V2 => ({ x: a.x * s, y: a.y * s })
export const dot = (a: V2, b: V2) => a.x * b.x + a.y * b.y
export const cross = (a: V2, b: V2) => a.x * b.y - a.y * b.x
export const len = (a: V2) => Math.hypot(a.x, a.y)
export const dist = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y)
export const norm = (a: V2): V2 => {
  const l = len(a)
  return l > 0 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 }
}
/** Rotate +90° (the "left" normal of a direction in math orientation). */
export const perp = (a: V2): V2 => ({ x: -a.y, y: a.x })
export const lerp = (a: V2, b: V2, t: number): V2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
export const eq = (a: V2, b: V2, tol: number) => dist(a, b) <= tol
export const angleOf = (a: V2) => Math.atan2(a.y, a.x)

/** Intersection of two infinite lines p + t·d and q + s·e, or null if (near) parallel. */
export function lineIntersection(p: V2, d: V2, q: V2, e: V2): V2 | null {
  const den = cross(d, e)
  if (Math.abs(den) < 1e-9) return null
  const t = cross(sub(q, p), e) / den
  return add(p, scale(d, t))
}

/** Closest point on segment ab to p, with its parameter t ∈ [0, 1]. */
export function closestOnSegment(p: V2, a: V2, b: V2): { point: V2; t: number; distance: number } {
  const ab = sub(b, a)
  const l2 = dot(ab, ab)
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2))
  const point = add(a, scale(ab, t))
  return { point, t, distance: dist(p, point) }
}

/**
 * Do segments ab and cd cross at a single point strictly inside both? Touching at endpoints,
 * T-touching and collinear overlap are reported separately by the caller's own checks.
 */
export function segmentsProperlyIntersect(a: V2, b: V2, c: V2, d: V2, eps = 1e-9): boolean {
  const d1 = cross(sub(b, a), sub(c, a))
  const d2 = cross(sub(b, a), sub(d, a))
  const d3 = cross(sub(d, c), sub(a, c))
  const d4 = cross(sub(d, c), sub(b, c))
  return ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps))
}

export const round = (n: number, step: number) => Math.round(n / step) * step
