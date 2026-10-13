import { closestOnSegment, cross, lineIntersection, norm, perp, segmentsProperlyIntersect, sub, type V2 } from './vec'

/** Signed area (shoelace). Positive = counter-clockwise in math orientation (x right, y up). */
export function signedArea(poly: V2[]): number {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    s += a.x * b.y - b.x * a.y
  }
  return s / 2
}

export const area = (poly: V2[]) => Math.abs(signedArea(poly))

export function perimeter(poly: V2[]): number {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    s += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return s
}

export function centroid(poly: V2[]): V2 {
  const A = signedArea(poly)
  if (Math.abs(A) < 1e-12) {
    const n = poly.length || 1
    return { x: poly.reduce((s, p) => s + p.x, 0) / n, y: poly.reduce((s, p) => s + p.y, 0) / n }
  }
  let cx = 0
  let cy = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const f = a.x * b.y - b.x * a.y
    cx += (a.x + b.x) * f
    cy += (a.y + b.y) * f
  }
  return { x: cx / (6 * A), y: cy / (6 * A) }
}

/** Even-odd point-in-polygon. Points on the boundary may go either way — use `onBoundary` when it matters. */
export function pointInPolygon(p: V2, poly: V2[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export function distanceToBoundary(p: V2, poly: V2[]): number {
  let best = Infinity
  for (let i = 0; i < poly.length; i++) best = Math.min(best, closestOnSegment(p, poly[i], poly[(i + 1) % poly.length]).distance)
  return best
}

/** Strictly inside: inside and further than `tol` from every edge. */
export const strictlyInside = (p: V2, poly: V2[], tol = 1e-6) => pointInPolygon(p, poly) && distanceToBoundary(p, poly) > tol

/** True if no two non-adjacent edges intersect and no vertex repeats. */
export function isSimplePolygon(poly: V2[], tol = 1e-6): boolean {
  const n = poly.length
  if (n < 3) return false
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.hypot(poly[i].x - poly[j].x, poly[i].y - poly[j].y) < tol) return false
    }
  }
  for (let i = 0; i < n; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % n]
    for (let j = i + 1; j < n; j++) {
      if (j === i || (j + 1) % n === i || j === (i + 1) % n) continue
      const c = poly[j]
      const d = poly[(j + 1) % n]
      if (segmentsProperlyIntersect(a, b, c, d)) return false
      // a vertex of one edge lying on the other non-adjacent edge (touching) also makes it non-simple
      if (closestOnSegment(c, a, b).distance < tol || closestOnSegment(a, c, d).distance < tol) return false
    }
  }
  return true
}

/**
 * A point guaranteed to be strictly inside a simple polygon: midpoint of the first inside interval
 * of a horizontal scanline placed between two distinct vertex heights.
 */
export function interiorPoint(poly: V2[]): V2 {
  const c = centroid(poly)
  if (strictlyInside(c, poly, 1e-4)) return c
  const ys = [...new Set(poly.map((p) => p.y))].sort((a, b) => a - b)
  for (let k = 0; k < ys.length - 1; k++) {
    const y = (ys[k] + ys[k + 1]) / 2
    const xs: number[] = []
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]
      const b = poly[(i + 1) % poly.length]
      if (a.y > y !== b.y > y) xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y))
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      if (xs[i + 1] - xs[i] > 1e-6) return { x: (xs[i] + xs[i + 1]) / 2, y }
    }
  }
  return c
}

/**
 * Offset each edge of a polygon (positive area orientation) inward by a per-edge distance and
 * intersect consecutive offset lines. Used for inner-face outlines (net floor area, furniture limits).
 */
export function insetPolygon(poly: V2[], insets: number[]): V2[] {
  const n = poly.length
  const ccw = signedArea(poly) > 0
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n]
    const d = norm(sub(b, a))
    // inward normal: left of edge for CCW polygons
    const nIn = ccw ? perp(d) : { x: -perp(d).x, y: -perp(d).y }
    return { p: { x: a.x + nIn.x * insets[i], y: a.y + nIn.y * insets[i] }, d }
  })
  return lines.map((l, i) => {
    const prev = lines[(i - 1 + n) % n]
    const hit = Math.abs(cross(prev.d, l.d)) < 1e-9 ? l.p : lineIntersection(prev.p, prev.d, l.p, l.d)
    return hit ?? l.p
  })
}

/** Ear-clipping triangulation of a simple polygon (no holes). Returns index triples. */
export function triangulate(poly: V2[]): [number, number, number][] {
  const n = poly.length
  if (n < 3) return []
  const idx = poly.map((_, i) => i)
  if (signedArea(poly) < 0) idx.reverse()
  const tris: [number, number, number][] = []
  const isEar = (i0: number, i1: number, i2: number, list: number[]) => {
    const a = poly[i0]
    const b = poly[i1]
    const c = poly[i2]
    if (cross(sub(b, a), sub(c, b)) <= 1e-12) return false
    for (const k of list) {
      if (k === i0 || k === i1 || k === i2) continue
      const p = poly[k]
      if (cross(sub(b, a), sub(p, a)) >= 0 && cross(sub(c, b), sub(p, b)) >= 0 && cross(sub(a, c), sub(p, c)) >= 0) return false
    }
    return true
  }
  let guard = 0
  while (idx.length > 3 && guard++ < 10000) {
    let clipped = false
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i - 1 + idx.length) % idx.length]
      const i1 = idx[i]
      const i2 = idx[(i + 1) % idx.length]
      if (isEar(i0, i1, i2, idx)) {
        tris.push([i0, i1, i2])
        idx.splice(i, 1)
        clipped = true
        break
      }
    }
    if (!clipped) {
      // Degenerate (collinear) remainder: drop the flattest vertex and continue.
      idx.splice(1, 1)
    }
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]])
  return tris
}
