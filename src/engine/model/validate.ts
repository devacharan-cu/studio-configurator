import { getAsset } from '../assets/catalog'
import { area, insetPolygon, interiorPoint, isSimplePolygon, pointInPolygon, strictlyInside } from '../geometry/polygon'
import { angleOf, closestOnSegment, dist, segmentsProperlyIntersect, sub } from '../geometry/vec'
import { usableRange } from '../geometry/walls'
import { add as plus, scale } from '../geometry/vec'
import { nodePos, openingsOnWall, roomPolygon, roomWalls, wallBetween, wallEnds, wallsAtNode, wallsOnLevel } from './query'
import { convexOverlap, stairGeometry, stairsOf } from './stairs'
import { isOutdoor, LIMITS, TOL, type Id, type Project, type Room } from './types'

export interface ValidationIssue {
  code: string
  message: string
  entities: Id[]
}

const fmt = (n: number) => `${n.toFixed(2)} m`

/**
 * Structural invariants of a project. Every command validates its result with this before it can
 * be committed, so the canonical model never holds an invalid building.
 */
export function validateProject(p: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const add = (code: string, message: string, ...entities: Id[]) => issues.push({ code, message, entities })
  const roomName = (id: Id) => p.rooms[id]?.name ?? 'a room'

  // References
  for (const n of Object.values(p.nodes)) {
    if (!p.levels[n.level]) add('ref', `Corner ${n.id} is on a missing level`, n.id)
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y) || Math.abs(n.x) > LIMITS.maxCoordinate || Math.abs(n.y) > LIMITS.maxCoordinate)
      add('coord', 'A corner has an invalid position', n.id)
  }
  for (const w of Object.values(p.walls)) {
    const a = p.nodes[w.a]
    const b = p.nodes[w.b]
    if (!a || !b) {
      add('ref', `Wall ${w.id} references a missing corner`, w.id)
      continue
    }
    if (a.level !== w.level || b.level !== w.level) add('ref', 'A wall connects corners on different levels', w.id)
    if (w.a === w.b) add('wall-degenerate', 'A wall starts and ends at the same corner', w.id)
  }
  for (const r of Object.values(p.rooms)) for (const id of r.boundary) if (!p.nodes[id]) add('ref', `${r.name} references a missing corner`, r.id)
  for (const o of Object.values(p.openings)) if (!p.walls[o.wall]) add('ref', 'An opening references a missing wall', o.id)
  for (const it of Object.values(p.items)) {
    if (!p.levels[it.level]) add('ref', 'An item is on a missing level', it.id)
    if (!getAsset(it.asset)) add('asset', `Unknown asset “${it.asset}”`, it.id)
  }
  for (const s of stairsOf(p)) if (!p.levels[s.level]) add('ref', 'Stairs are on a missing level', s.id)
  if (issues.length) return issues // structural checks below assume valid references

  // Walls: length, thickness, height, duplicates, crossings, T-junctions, junction angles
  const seen = new Map<string, Id>()
  for (const w of Object.values(p.walls)) {
    const { a, b } = wallEnds(p, w)
    const L = dist(a, b)
    if (L < LIMITS.minWallLength) add('wall-short', `A wall would be only ${fmt(L)} long (minimum ${fmt(LIMITS.minWallLength)})`, w.id)
    if (w.thickness < LIMITS.minWallThickness || w.thickness > LIMITS.maxWallThickness)
      add('wall-thickness', `Wall thickness must be between ${fmt(LIMITS.minWallThickness)} and ${fmt(LIMITS.maxWallThickness)}`, w.id)
    if (w.height < LIMITS.minWallHeight || w.height > LIMITS.maxWallHeight)
      add('wall-height', `Wall height must be between ${fmt(LIMITS.minWallHeight)} and ${fmt(LIMITS.maxWallHeight)}`, w.id)
    const key = [w.a, w.b].sort().join('|')
    if (seen.has(key)) add('wall-duplicate', 'Two walls join the same pair of corners', w.id, seen.get(key)!)
    seen.set(key, w.id)
  }

  for (const level of Object.keys(p.levels)) {
    const walls = wallsOnLevel(p, level)
    for (let i = 0; i < walls.length; i++) {
      const wi = walls[i]
      const ei = wallEnds(p, wi)
      for (let j = i + 1; j < walls.length; j++) {
        const wj = walls[j]
        const shared = [wi.a, wi.b].some((n) => n === wj.a || n === wj.b)
        if (shared) continue
        const ej = wallEnds(p, wj)
        if (segmentsProperlyIntersect(ei.a, ei.b, ej.a, ej.b, 1e-9)) add('wall-cross', 'Two walls cross without a junction', wi.id, wj.id)
      }
      // No foreign corner may sit on a wall's interior (junctions must be explicit) or overlap another corner.
      for (const n of Object.values(p.nodes)) {
        if (n.level !== level || n.id === wi.a || n.id === wi.b) continue
        const c = closestOnSegment(n, ei.a, ei.b)
        if (c.distance < TOL.snap && c.t > 0 && c.t < 1) add('wall-overlap', 'A corner lies on another wall — walls would overlap', wi.id, n.id)
      }
    }
    const nodes = Object.values(p.nodes).filter((n) => n.level === level)
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        if (dist(nodes[i], nodes[j]) < TOL.snap) add('node-overlap', 'Two corners are at the same position', nodes[i].id, nodes[j].id)
  }

  for (const n of Object.values(p.nodes)) {
    const ws = wallsAtNode(p, n.id)
    if (ws.length < 2) continue
    const angles = ws
      .map((w) => {
        const o = nodePos(p, w.a === n.id ? w.b : w.a)
        return angleOf(sub(o, n))
      })
      .sort((a, b) => a - b)
    for (let i = 0; i < angles.length; i++) {
      const next = i + 1 < angles.length ? angles[i + 1] : angles[0] + Math.PI * 2
      if (next - angles[i] < LIMITS.minJunctionAngle) add('junction-angle', 'Walls meet at too sharp an angle', n.id)
    }
  }

  // Rooms: closed by walls, simple, big enough, not overlapping
  const roomPolys = new Map<Id, ReturnType<typeof roomPolygon>>()
  for (const r of Object.values(p.rooms)) {
    if (r.boundary.length < 3) {
      add('room-degenerate', `${r.name} needs at least three corners`, r.id)
      continue
    }
    for (let i = 0; i < r.boundary.length; i++) {
      const a = r.boundary[i]
      const b = r.boundary[(i + 1) % r.boundary.length]
      if (!wallBetween(p, a, b)) add('room-open', `${r.name} is not enclosed by walls`, r.id)
      if (p.nodes[a].level !== r.level) add('ref', `${r.name} uses a corner from another level`, r.id)
    }
    const poly = roomPolygon(p, r)
    if (!isSimplePolygon(poly, TOL.point)) add('room-self-intersect', `${r.name}’s outline would cross itself`, r.id)
    else if (area(poly) < LIMITS.minRoomArea) add('room-small', `${r.name} would be smaller than ${LIMITS.minRoomArea} m²`, r.id)
    roomPolys.set(r.id, poly)
  }
  const rooms = Object.values(p.rooms)
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const A = rooms[i]
      const B = rooms[j]
      if (A.level !== B.level) continue
      const pa = roomPolys.get(A.id)
      const pb = roomPolys.get(B.id)
      if (!pa || !pb || pa.length < 3 || pb.length < 3) continue
      // Walls never cross and room edges are walls, so rooms can only overlap by one containing part of the other.
      if (strictlyInside(interiorPoint(pa), pb, 1e-4) || strictlyInside(interiorPoint(pb), pa, 1e-4))
        add('room-overlap', `${roomName(A.id)} would overlap ${roomName(B.id)}`, A.id, B.id)
    }
  }

  // Openings: fit in their wall, don't overlap, sensible sizes
  for (const w of Object.values(p.walls)) {
    const ops = openingsOnWall(p, w.id)
    if (!ops.length) continue
    const [u0, u1] = usableRange(p, w)
    let prevEnd = -Infinity
    for (const o of ops) {
      const label = o.kind === 'window' ? 'window' : o.kind === 'door' ? 'door' : 'opening'
      if (o.width < LIMITS.minOpeningWidth) add('opening-size', `The ${label} is narrower than ${fmt(LIMITS.minOpeningWidth)}`, o.id)
      if (o.height <= 0.3 || o.sill < 0 || o.sill + o.height > w.height - 0.05)
        add('opening-height', `The ${label} doesn’t fit the wall height (${fmt(w.height)})`, o.id)
      if (o.offset - o.width / 2 < u0 + LIMITS.openingClearance - 1e-9 || o.offset + o.width / 2 > u1 - LIMITS.openingClearance + 1e-9)
        add('opening-fit', `The ${label} doesn’t fit in its wall (${fmt(Math.max(0, u1 - u0))} clear)`, o.id, w.id)
      if (o.offset - o.width / 2 < prevEnd + LIMITS.openingClearance - 1e-9) add('opening-overlap', `Two openings overlap on the same wall`, o.id)
      prevEnd = o.offset + o.width / 2
    }
  }

  validateStairs(p, add)
  return issues
}

/** The room on `level` whose inner faces (walls' thickness removed) contain every point, if any. */
function roomHolding(p: Project, level: Id, pts: { x: number; y: number }[]): Room | undefined {
  return Object.values(p.rooms).find((r) => {
    if (r.level !== level) return false
    const inner = insetPolygon(roomPolygon(p, r), roomWalls(p, r).map((w) => (w ? w.thickness / 2 : 0)))
    return pts.every((q) => pointInPolygon(q, inner))
  })
}

/**
 * Stairs: a level above to arrive on; a safe going and width; the flight inside one room below and its
 * stairwell inside one indoor room above (so neither crosses a wall); room to step on and off at both
 * ends; and nothing standing on the flight or in the stairwell.
 */
function validateStairs(p: Project, add: (code: string, message: string, ...entities: Id[]) => void, only?: Id) {
  const stairs = stairsOf(p)
  for (const s of stairs) {
    if (only && s.id !== only) continue
    const g = stairGeometry(p, s)
    if (!g.to) {
      add('stair-level', 'Stairs need a floor above to lead to — add a level first', s.id)
      continue
    }
    if (s.width < LIMITS.minStairWidth - 1e-9 || s.width > LIMITS.maxStairWidth + 1e-9)
      add('stair-width', `Stairs must be between ${fmt(LIMITS.minStairWidth)} and ${fmt(LIMITS.maxStairWidth)} wide`, s.id)
    if (g.going < LIMITS.minGoing - 1e-9)
      add('stair-steep', `These stairs would be too steep (${g.risers} steps of ${Math.round(g.going * 100)} cm) — make the flight at least ${fmt(g.risers * LIMITS.minGoing)} long`, s.id)
    if (g.going > LIMITS.maxGoing + 1e-9) add('stair-shallow', `The flight is longer than ${g.risers} comfortable steps — shorten it to ${fmt(g.risers * LIMITS.maxGoing)} or less`, s.id)
    const below = roomHolding(p, s.level, [...g.corners, plus(g.bottomMid, scale(g.dir, -0.5))])
    if (!below) add('stair-room', 'Stairs must stand inside one room, with space to step on at the bottom', s.id)
    const above = roomHolding(p, g.to.id, [...g.corners, plus(g.topMid, scale(g.dir, 0.5))])
    if (!above || isOutdoor(above)) add('stair-arrival', `Stairs must arrive inside one room on ${g.to.name}, with space to step off at the top`, s.id)
    for (const it of Object.values(p.items)) {
      if (it.level !== s.level && it.level !== g.to.id) continue
      const a = getAsset(it.asset)
      // lights, wall art and things on tables don't stand on the floor (floor-standing wall units do)
      if (!a || a.mount === 'ceiling' || (it.z ?? 0) > 0.25) continue
      const hw = a.footprint.w / 2
      const hd = a.footprint.d / 2
      const c = Math.cos(it.rotation)
      const sn = Math.sin(it.rotation)
      const box = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, y]) => ({ x: it.x + x * c + y * sn, y: it.y - x * sn + y * c }))
      if (convexOverlap(box, g.corners)) add('stair-blocked', `${a.name} is in the way of the stairs`, s.id, it.id)
    }
  }
  // a flight can't start inside the stairwell of the flight arriving on its floor (stack them side by side)
  for (const a of stairs)
    for (const b of stairs) {
      if (a === b || (only && a.id !== only && b.id !== only)) continue
      const gb = stairGeometry(p, b)
      if (gb.to?.id === a.level && convexOverlap(stairGeometry(p, a).corners, gb.corners)) add('stair-stack', 'A flight can’t start inside the stairwell of the flight below — put it beside it', a.id, b.id)
    }
  for (let i = 0; i < stairs.length; i++)
    for (let j = i + 1; j < stairs.length; j++)
      if ((!only || stairs[i].id === only || stairs[j].id === only) && stairs[i].level === stairs[j].level && convexOverlap(stairGeometry(p, stairs[i]).corners, stairGeometry(p, stairs[j]).corners))
        add('stair-overlap', 'Two flights of stairs overlap', stairs[i].id, stairs[j].id)
}

/** Only the stair rules, for one flight (fast enough to try many candidate positions). */
export function stairIssues(p: Project, stair: Id): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  validateStairs(p, (code, message, ...entities) => issues.push({ code, message, entities }), stair)
  return issues
}
