import { getAsset } from '../assets/catalog'
import { area, interiorPoint, isSimplePolygon, strictlyInside } from '../geometry/polygon'
import { angleOf, closestOnSegment, dist, segmentsProperlyIntersect, sub } from '../geometry/vec'
import { usableRange } from '../geometry/walls'
import { nodePos, openingsOnWall, roomPolygon, wallBetween, wallEnds, wallsAtNode, wallsOnLevel } from './query'
import { LIMITS, TOL, type Id, type Project } from './types'

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

  return issues
}
