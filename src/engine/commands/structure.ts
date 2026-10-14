import { getAsset } from '../assets/catalog'
import { EXTERIOR_FINISHES } from '../assets/finishes'
import { insetPolygon, isSimplePolygon, pointInPolygon, signedArea, area as polyArea } from '../geometry/polygon'
import { add, closestOnSegment, cross, dist, dot, norm, scale, sub, type V2 } from '../geometry/vec'
import { openingCenter, usableRange } from '../geometry/walls'
import {
  findNodeNear,
  findWallThrough,
  nodePos,
  openingsOnWall,
  roomPolygon,
  roomWalls,
  roomsUsingWall,
  wallBetween,
  wallFrame,
  wallsAtNode,
} from '../model/query'
import { LIMITS, TOL, type Id, type Item, type Project, type RoomType } from '../model/types'
import { Draft, fail, finish, newId, type CommandResult } from './draft'
import { placeItem } from './placement'

export const DEFAULT_THICKNESS = 0.15
export const DEFAULT_FINISHES = { floorFinish: 'oak-herringbone', wallFinish: 'chalk-white' }

/* ---------- Internal topology operations ---------- */

/** Split a wall at a point on its interior; returns the new node id. Openings move to the right half. */
function splitWall(d: Draft, wallId: Id, point: V2): Id | { error: string } {
  const w = d.p.walls[wallId]
  const { a } = wallFrame(d.p, w)
  const s = dist(a, point)
  for (const o of openingsOnWall(d.p, wallId)) {
    if (o.offset - o.width / 2 < s && o.offset + o.width / 2 > s) return { error: `That would cut through a ${o.kind} — move it first` }
  }
  const nodeId = newId('n')
  d.setNode({ id: nodeId, level: w.level, x: point.x, y: point.y })
  const w2Id = newId('w')
  d.setWall({ ...w, b: nodeId })
  d.setWall({ ...w, id: w2Id, a: nodeId, b: w.b })
  for (const o of openingsOnWall(d.p, wallId)) {
    if (o.offset > s) d.setOpening({ ...o, wall: w2Id, offset: o.offset - s })
  }
  // Insert the node into every room boundary that used the original edge.
  for (const r of Object.values(d.p.rooms)) {
    const idx = r.boundary.findIndex((id, i) => {
      const next = r.boundary[(i + 1) % r.boundary.length]
      return (id === w.a && next === w.b) || (id === w.b && next === w.a)
    })
    if (idx >= 0) {
      const boundary = [...r.boundary]
      boundary.splice(idx + 1, 0, nodeId)
      d.setRoom({ ...r, boundary })
    }
  }
  return nodeId
}

/** Resolve a drawn point to a node id: reuse a nearby node, split a wall it lands on, or create a node. */
function resolvePoint(d: Draft, level: Id, q: V2): Id | { error: string } {
  const near = findNodeNear(d.p, level, q, TOL.snap)
  if (near) return near.id
  const onWall = findWallThrough(d.p, level, q, TOL.snap)
  if (onWall) return splitWall(d, onWall.wall.id, onWall.point)
  const id = newId('n')
  d.setNode({ id, level, x: q.x, y: q.y })
  return id
}

/**
 * Keep openings where they were in the world after walls moved or stretched: re-project each
 * opening's old centre onto its wall's new axis, then clamp it into the wall's usable range.
 */
function reanchorOpenings(before: Project, d: Draft, walls: Set<Id>) {
  for (const o of Object.values(d.p.openings)) {
    if (!walls.has(o.wall) || !before.walls[o.wall]) continue
    const oldC = openingCenter(before, o)
    const w = d.p.walls[o.wall]
    const { a, dir } = wallFrame(d.p, w)
    let offset = dot(sub(oldC, a), dir)
    const [u0, u1] = usableRange(d.p, w)
    const lo = u0 + LIMITS.openingClearance + o.width / 2
    const hi = u1 - LIMITS.openingClearance - o.width / 2
    if (lo <= hi) offset = Math.min(hi, Math.max(lo, offset))
    if (Math.abs(offset - o.offset) > 1e-9) d.setOpening({ ...o, offset })
  }
}

/** Footprint corners of an item in plan coordinates. */
export function itemCorners(it: Pick<Item, 'x' | 'y' | 'rotation' | 'asset'>, pad = 0): V2[] {
  const a = getAsset(it.asset)
  const hw = (a?.footprint.w ?? 0.5) / 2 + pad
  const hd = (a?.footprint.d ?? 0.5) / 2 + pad
  const c = Math.cos(it.rotation)
  const s = Math.sin(it.rotation)
  // Rotation about world +Y (counter-clockwise from above); plan y = world z.
  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([x, y]) => ({ x: it.x + x * c + y * s, y: it.y - x * s + y * c }))
}

/** Room (on the item's level) containing a plan point. */
export function roomAt(p: Project, level: Id, q: V2) {
  return Object.values(p.rooms).find((r) => r.level === level && pointInPolygon(q, roomPolygon(p, r)))
}

/** Inner-face outline of a room: its boundary inset by half of each wall's thickness. */
export function roomInnerPolygon(p: Project, roomId: Id): V2[] {
  const r = p.rooms[roomId]
  const poly = roomPolygon(p, r)
  const walls = roomWalls(p, r)
  return insetPolygon(
    poly,
    walls.map((w) => (w ? w.thickness / 2 : 0)),
  )
}

/**
 * After walls move, push furniture that now pokes through a wall back inside its room
 * (iterative push along each inner face's inward normal). Reports items it could not fit.
 */
function keepItemsInRooms(before: Project, d: Draft) {
  for (const it of Object.values(d.p.items)) {
    const asset = getAsset(it.asset)
    if (!asset) continue
    const room = roomAt(before, it.level, it) ?? roomAt(d.p, it.level, it)
    if (!room || !d.p.rooms[room.id]) continue
    const inner = roomInnerPolygon(d.p, room.id)
    const ccw = signedArea(inner) > 0
    let pos = { x: it.x, y: it.y }
    for (let iter = 0; iter < 6; iter++) {
      let moved = false
      const corners = itemCorners({ ...it, ...pos })
      for (let i = 0; i < inner.length; i++) {
        const a = inner[i]
        const b = inner[(i + 1) % inner.length]
        const dir = norm(sub(b, a))
        const nIn = ccw ? { x: -dir.y, y: dir.x } : { x: dir.y, y: -dir.x }
        // Only faces the item actually spans — avoids pushing against the far side of an L-shaped room.
        let worst = 0
        for (const c of corners) {
          const along = dot(sub(c, a), dir)
          if (along < -0.01 || along > dist(a, b) + 0.01) continue
          const depth = dot(sub(c, a), nIn)
          if (depth < worst && depth > -1.0) worst = depth
        }
        if (worst < -1e-6) {
          pos = add(pos, scale(nIn, -worst + 0.002))
          moved = true
        }
      }
      if (!moved) break
    }
    if (asset.mount === 'wall') d.setItem(placeItem(d.p, { ...it, x: pos.x, y: pos.y }))
    else if (dist(pos, it) > 1e-6) d.setItem({ ...it, x: pos.x, y: pos.y })
    const still = itemCorners({ ...it, ...pos }).some((c) => !pointInPolygon(c, inner))
    if (still && !asset.walkable) d.warnings.push(`${asset.name} no longer fits in ${room.name}`)
  }
}

/** Apply node moves, then keep openings and furniture coherent; validated by `finish`. */
function moveNodes(base: Project, moves: Map<Id, V2>, label: string): CommandResult {
  const d = new Draft(base)
  const touched = new Set<Id>()
  for (const [id, q] of moves) {
    const n = d.p.nodes[id]
    if (!n) return fail('ref', 'That corner no longer exists', id)
    if (!Number.isFinite(q.x) || !Number.isFinite(q.y)) return fail('coord', 'Invalid position', id)
    d.setNode({ ...n, x: q.x, y: q.y })
    for (const w of wallsAtNode(d.p, id)) touched.add(w.id)
  }
  reanchorOpenings(base, d, touched)
  keepItemsInRooms(base, d)
  return finish(d, label)
}

/* ---------- Public commands ---------- */

export interface CreateRoomArgs {
  level: Id
  points: V2[]
  name?: string
  type?: RoomType
  thickness?: number
  height?: number
}

/**
 * Create a room from a drawn outline. Corners snap onto existing corners, land on existing walls
 * (splitting them into T-junctions) and edges reuse existing walls, so adjacent rooms share walls.
 */
export function createRoom(base: Project, args: CreateRoomArgs): CommandResult {
  const level = base.levels[args.level]
  if (!level) return fail('ref', 'Unknown level', args.level)
  let pts = args.points.map((q) => ({ x: q.x, y: q.y }))
  if (pts.length < 3) return fail('room-degenerate', 'A room needs at least three corners')
  if (pts.some((q) => !Number.isFinite(q.x) || !Number.isFinite(q.y))) return fail('coord', 'Invalid point')
  if (!isSimplePolygon(pts, TOL.point)) return fail('room-self-intersect', 'The outline crosses itself')
  if (polyArea(pts) < LIMITS.minRoomArea) return fail('room-small', `Rooms must be at least ${LIMITS.minRoomArea} m²`)
  if (signedArea(pts) < 0) pts = pts.reverse()

  const d = new Draft(base)
  const corners: Id[] = []
  for (const q of pts) {
    const r = resolvePoint(d, args.level, q)
    if (typeof r !== 'string') return fail('split', r.error)
    if (corners.includes(r)) return fail('room-degenerate', 'Two corners of the outline snap to the same point')
    corners.push(r)
  }

  const boundary: Id[] = []
  for (let i = 0; i < corners.length; i++) {
    const from = corners[i]
    const to = corners[(i + 1) % corners.length]
    const A = nodePos(d.p, from)
    const B = nodePos(d.p, to)
    // Existing corners lying on this edge become part of the room's boundary (shared, collinear walls).
    const along = Object.values(d.p.nodes)
      .filter((n) => n.level === args.level && n.id !== from && n.id !== to)
      .map((n) => ({ n, c: closestOnSegment(n, A, B) }))
      .filter(({ c }) => c.distance < TOL.snap && c.t > 0 && c.t < 1)
      .sort((x, y) => x.c.t - y.c.t)
      .map(({ n }) => n.id)
    const chain = [from, ...along, to]
    for (let k = 0; k < chain.length - 1; k++) {
      boundary.push(chain[k])
      if (!wallBetween(d.p, chain[k], chain[k + 1])) {
        const id = newId('w')
        d.setWall({ id, level: args.level, a: chain[k], b: chain[k + 1], thickness: args.thickness ?? DEFAULT_THICKNESS, height: args.height ?? level.height })
        d.created.push(id)
      }
    }
  }

  const id = newId('r')
  const count = Object.values(d.p.rooms).filter((r) => r.level === args.level).length
  d.setRoom({ id, level: args.level, name: args.name ?? `Room ${count + 1}`, type: args.type ?? 'other', boundary, ...DEFAULT_FINISHES })
  d.created.unshift(id)
  return finish(d, `Create ${args.name ?? 'room'}`)
}

export const moveNode = (p: Project, args: { node: Id; x: number; y: number }) =>
  moveNodes(p, new Map([[args.node, { x: args.x, y: args.y }]]), 'Move corner')

/**
 * The straight run a wall belongs to: walls continuing collinearly through shared corners.
 * Dragging a wall moves the whole run, so splitting a wall for a T-junction doesn't create notches.
 */
export function collinearRun(p: Project, wallId: Id): Id[] {
  const start = p.walls[wallId]
  const { dir } = wallFrame(p, start)
  const run = new Set([wallId])
  const queue = [start.a, start.b]
  const visited = new Set<Id>()
  while (queue.length) {
    const n = queue.pop()!
    if (visited.has(n)) continue
    visited.add(n)
    for (const w of wallsAtNode(p, n)) {
      if (run.has(w.id)) continue
      const f = wallFrame(p, w)
      if (Math.abs(cross(f.dir, dir)) < 1e-6) {
        run.add(w.id)
        queue.push(w.a, w.b)
      }
    }
  }
  return [...run]
}

/** Move a wall (and its collinear run) along its normal by `distance` metres (+ = towards its left). */
export function moveWall(p: Project, args: { wall: Id; distance: number; run?: boolean }): CommandResult {
  const w = p.walls[args.wall]
  if (!w) return fail('ref', 'That wall no longer exists', args.wall)
  if (!Number.isFinite(args.distance)) return fail('coord', 'Invalid distance')
  const { normal } = wallFrame(p, w)
  const ids = args.run === false ? [w.id] : collinearRun(p, w.id)
  const moves = new Map<Id, V2>()
  for (const id of ids) {
    for (const n of [p.walls[id].a, p.walls[id].b]) moves.set(n, add(nodePos(p, n), scale(normal, args.distance)))
  }
  return moveNodes(p, moves, 'Move wall')
}

/**
 * Set a room's width (x) or depth (y) for rooms whose walls are axis-aligned: moves the room's
 * east (or south) wall run. Adjacent rooms sharing that wall resize with it.
 */
export function setRoomSize(p: Project, args: { room: Id; axis: 'x' | 'y'; size: number }): CommandResult {
  const r = p.rooms[args.room]
  if (!r) return fail('ref', 'That room no longer exists', args.room)
  const poly = roomPolygon(p, r)
  const axisAligned = poly.every((q, i) => {
    const n = poly[(i + 1) % poly.length]
    return Math.abs(q.x - n.x) < 1e-6 || Math.abs(q.y - n.y) < 1e-6
  })
  if (!axisAligned) return fail('room-shape', 'Width and depth can only be set on rooms with square corners — drag its walls instead', r.id)
  const k = args.axis
  const min = Math.min(...poly.map((q) => q[k]))
  const max = Math.max(...poly.map((q) => q[k]))
  const delta = args.size - (max - min)
  if (Math.abs(delta) < 1e-6) return finish(new Draft(p), 'Resize room')
  // the boundary wall lying on the max side, perpendicular to the axis
  const wall = roomWalls(p, r).find((w) => {
    if (!w) return false
    const a = nodePos(p, w.a)
    const b = nodePos(p, w.b)
    return Math.abs(a[k] - max) < 1e-6 && Math.abs(b[k] - max) < 1e-6
  })
  if (!wall) return fail('room-shape', 'Could not find the wall to move', r.id)
  const { normal } = wallFrame(p, wall)
  const sign = Math.sign(k === 'x' ? normal.x : normal.y)
  const result = moveWall(p, { wall: wall.id, distance: delta * sign })
  return result.ok ? { ...result, label: `Resize ${r.name}` } : result
}

export function updateWall(p: Project, args: { wall: Id; thickness?: number; height?: number }): CommandResult {
  const w = p.walls[args.wall]
  if (!w) return fail('ref', 'That wall no longer exists', args.wall)
  const d = new Draft(p)
  d.setWall({ ...w, thickness: args.thickness ?? w.thickness, height: args.height ?? w.height })
  reanchorOpenings(p, d, new Set(collinearRun(p, w.id).concat(w.id)))
  keepItemsInRooms(p, d)
  return finish(d, 'Edit wall')
}

export function updateRoom(
  p: Project,
  args: { room: Id; name?: string; type?: RoomType; floorFinish?: string; wallFinish?: string },
): CommandResult {
  const r = p.rooms[args.room]
  if (!r) return fail('ref', 'That room no longer exists', args.room)
  // Strip control characters from user-entered names.
  const clean = (s: string) => [...s].filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127).join('')
  const name = args.name === undefined ? r.name : clean(args.name).trim().slice(0, 40)
  if (!name) return fail('room-name', 'Rooms need a name', r.id)
  const d = new Draft(p)
  d.setRoom({ ...r, name, type: args.type ?? r.type, floorFinish: args.floorFinish ?? r.floorFinish, wallFinish: args.wallFinish ?? r.wallFinish })
  return finish(d, 'Edit room')
}

/** Delete a room and any walls only it used (plus their openings and orphaned corners). */
export function deleteRoom(p: Project, args: { room: Id }): CommandResult {
  const r = p.rooms[args.room]
  if (!r) return fail('ref', 'That room no longer exists', args.room)
  const d = new Draft(p)
  delete d.p.rooms[r.id]
  for (const w of roomWalls(p, r)) {
    if (!w || roomsUsingWall(d.p, w.id).length) continue
    delete d.p.walls[w.id]
    for (const o of openingsOnWall(p, w.id)) delete d.p.openings[o.id]
  }
  for (const n of Object.values(d.p.nodes)) if (!wallsAtNode(d.p, n.id).length) delete d.p.nodes[n.id]
  return finish(d, `Delete ${r.name}`)
}

/** Choose the building's facade finish (exterior faces of external walls). */
export function setFacade(p: Project, args: { finish: string }): CommandResult {
  if (!EXTERIOR_FINISHES.some((f) => f.id === args.finish)) return fail('finish', 'Unknown facade finish')
  const d = new Draft(p)
  d.p.facade = args.finish
  return finish(d, 'Change facade')
}

export function addLevel(p: Project, args: { name?: string; height?: number }): CommandResult {
  const levels = Object.values(p.levels).sort((a, b) => a.elevation - b.elevation)
  const top = levels[levels.length - 1]
  const d = new Draft(p)
  const id = newId('l')
  const SLAB = 0.3
  d.setLevel({ id, name: args.name ?? `Level ${levels.length}`, elevation: top ? top.elevation + top.height + SLAB : 0, height: args.height ?? 2.7 })
  d.created.push(id)
  return finish(d, 'Add level')
}

