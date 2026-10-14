import { getAsset } from '../assets/catalog'
import { pointInPolygon, signedArea } from '../geometry/polygon'
import { closestOnSegment, dist, norm, sub, type V2 } from '../geometry/vec'
import type { Item, Project } from '../model/types'
import { itemCorners, roomAt, roomInnerPolygon } from './structure'

/**
 * Where an item actually sits, given where the user put it:
 * - wall-mounted assets (mirrors, art, wall lights) snap flat against the nearest inner wall face of
 *   their room, facing into the room, at the asset's mounting height;
 * - assets that stand on surfaces (vases, lamps, clocks) sit on top of the highest table, console or
 *   counter under them, or on the floor;
 * - ceiling assets hang from the ceiling (resolved by the renderer from the level height);
 * - everything else stands on the floor.
 * Pure: the commands call it so 2D, 3D and templates all place things the same way.
 */
export function placeItem(p: Project, it: Item): Item {
  const a = getAsset(it.asset)
  if (!a) return it
  if (a.mount === 'wall') return snapToWall(p, it)
  if (a.onSurfaces) {
    const z = surfaceUnder(p, it)
    return z > 0 ? { ...it, z } : withoutZ(it)
  }
  return withoutZ(it)
}

const withoutZ = (it: Item): Item => {
  if (it.z === undefined) return it
  const { z: _z, ...rest } = it
  return rest
}

/** Height of the highest usable top (another item's `surface`) under the item's centre, or 0. */
export function surfaceUnder(p: Project, it: Pick<Item, 'id' | 'x' | 'y' | 'level'>): number {
  let best = 0
  for (const o of Object.values(p.items)) {
    if (o.id === it.id || o.level !== it.level) continue
    const oa = getAsset(o.asset)
    if (!oa?.surface) continue
    if (!pointInPolygon(it, itemCorners(o))) continue
    best = Math.max(best, (o.z ?? 0) + oa.surface)
  }
  return best
}

function snapToWall(p: Project, it: Item): Item {
  const a = getAsset(it.asset)!
  const room = roomAt(p, it.level, it)
  if (!room) return it
  const inner = roomInnerPolygon(p, room.id)
  const ccw = signedArea(inner) > 0
  let best: { q: V2; n: V2; a: V2; b: V2; d: number } | null = null
  for (let i = 0; i < inner.length; i++) {
    const s = inner[i]
    const e = inner[(i + 1) % inner.length]
    const len = dist(s, e)
    if (len < a.footprint.w) continue // too short to hang it on
    const c = closestOnSegment(it, s, e)
    const dir = norm(sub(e, s))
    const n = ccw ? { x: -dir.y, y: dir.x } : { x: dir.y, y: -dir.x }
    if (!best || c.distance < best.d) best = { q: c.point, n, a: s, b: e, d: c.distance }
  }
  if (!best) return it
  // keep the whole width on this face
  const dir = norm(sub(best.b, best.a))
  const len = dist(best.a, best.b)
  const t = Math.min(len - a.footprint.w / 2, Math.max(a.footprint.w / 2, (best.q.x - best.a.x) * dir.x + (best.q.y - best.a.y) * dir.y))
  const off = a.footprint.d / 2 + 0.004
  return {
    ...it,
    x: best.a.x + dir.x * t + best.n.x * off,
    y: best.a.y + dir.y * t + best.n.y * off,
    // front (+y at rotation 0) faces into the room: plan direction (sin r, cos r) = inward normal
    rotation: (Math.atan2(best.n.x, best.n.y) + Math.PI * 2) % (Math.PI * 2),
    z: a.wallHeight ?? 1.2,
  }
}

/** Items standing on `table` (centre inside its footprint and resting on its top). */
export function itemsOn(p: Project, table: Item): Item[] {
  const a = getAsset(table.asset)
  if (!a?.surface) return []
  const top = (table.z ?? 0) + a.surface
  const foot = itemCorners(table)
  return Object.values(p.items).filter((o) => o.id !== table.id && o.level === table.level && Math.abs((o.z ?? 0) - top) < 1e-6 && pointInPolygon(o, foot))
}
