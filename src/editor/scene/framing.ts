/**
 * Camera framing for the orbit/inspection view. Pure maths (no three.js) so the E2E suite can
 * reproduce the exact initial camera and click real geometry.
 */

export type Bounds = { x0: number; x1: number; y0: number; y1: number }
export type ViewPreset = 'overview' | 'top' | 'front' | 'back' | 'left' | 'right'
type V3 = [number, number, number]

export const ORBIT_FOV = 45

const deg = Math.PI / 180
/** Direction from the target to the camera (world: x east, y up, z south). */
const DIRECTIONS: Record<ViewPreset, V3> = {
  // three-quarter view from the south-east at ~38° elevation: reads as a model on a table
  overview: [Math.sin(32 * deg) * Math.cos(38 * deg), Math.sin(38 * deg), Math.cos(32 * deg) * Math.cos(38 * deg)],
  top: [0, 1, 0.0001],
  front: [0, Math.sin(12 * deg), Math.cos(12 * deg)],
  back: [0, Math.sin(12 * deg), -Math.cos(12 * deg)],
  left: [-Math.cos(12 * deg), Math.sin(12 * deg), 0],
  right: [Math.cos(12 * deg), Math.sin(12 * deg), 0],
}

export const PRESET_LABELS: Record<ViewPreset, string> = {
  overview: 'Overview',
  top: 'Top',
  front: 'Front (south)',
  back: 'Back (north)',
  left: 'West side',
  right: 'East side',
}

/**
 * Distance at which a sphere of `radius` fills the narrower field of view of a camera with vertical
 * `fovDeg` and `aspect`, scaled by `fill` (< 1 frames tighter: a box's sphere overstates its silhouette).
 */
export function fitDistance(radius: number, aspect: number, fovDeg = ORBIT_FOV, fill = 0.82) {
  const v = fovDeg * deg
  const h = 2 * Math.atan(Math.tan(v / 2) * aspect)
  return (radius / Math.sin(Math.min(v, h) / 2)) * fill
}

/**
 * Exact distance at which every corner of a box is inside the view (with `margin` < 1 leaving a border),
 * for a camera looking at `target` from unit direction `dir`. Each corner gives a lower bound:
 * |x_right| ≤ (dist − z_toward) · tan(hfov/2) · margin, and likewise vertically.
 */
export function fitBoxDistance(corners: V3[], target: V3, dir: V3, aspect: number, fovDeg = ORBIT_FOV, margin = 0.9) {
  const f: V3 = [-dir[0], -dir[1], -dir[2]]
  let r: V3 = [-f[2], 0, f[0]] // f × up, with up = (0, 1, 0)
  const rl = Math.hypot(...r) || 1
  r = [r[0] / rl, r[1] / rl, r[2] / rl]
  const u: V3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
  const tanV = Math.tan((fovDeg * deg) / 2) * margin
  const tanH = Math.tan((fovDeg * deg) / 2) * aspect * margin
  let dist = 0
  for (const c of corners) {
    const rel: V3 = [c[0] - target[0], c[1] - target[1], c[2] - target[2]]
    const x = rel[0] * r[0] + rel[1] * r[1] + rel[2] * r[2]
    const y = rel[0] * u[0] + rel[1] * u[1] + rel[2] * u[2]
    const z = rel[0] * dir[0] + rel[1] * dir[1] + rel[2] * dir[2]
    dist = Math.max(dist, Math.abs(x) / tanH + z, Math.abs(y) / tanV + z)
  }
  return dist
}

/** Camera position and target that frame the building from a preset direction. */
export function presetPose(b: Bounds, wallHeight: number, aspect: number, preset: ViewPreset = 'overview') {
  const cx = (b.x0 + b.x1) / 2
  const cz = (b.y0 + b.y1) / 2
  const target: V3 = [cx, preset === 'top' || preset === 'overview' ? 0 : wallHeight / 2, cz]
  const corners: V3[] = []
  for (const x of [b.x0, b.x1]) for (const y of [0, wallHeight]) for (const z of [b.y0, b.y1]) corners.push([x, y, z])
  const dir = DIRECTIONS[preset]
  const dist = Math.max(4, fitBoxDistance(corners, target, dir, aspect, ORBIT_FOV, preset === 'overview' ? 0.92 : 0.86))
  const position: V3 = [target[0] + dir[0] * dist, target[1] + dir[1] * dist, target[2] + dir[2] * dist]
  return { position, target }
}

/** Frame an arbitrary box (selection) from the current viewing direction. */
export function framePose(center: V3, radius: number, aspect: number, fromDir: V3) {
  const len = Math.hypot(...fromDir) || 1
  const dist = Math.max(1.2, fitDistance(Math.max(radius, 0.3), aspect, ORBIT_FOV, 1.25))
  const position: V3 = [center[0] + (fromDir[0] / len) * dist, center[1] + (fromDir[1] / len) * dist, center[2] + (fromDir[2] / len) * dist]
  return { position, target: center }
}
