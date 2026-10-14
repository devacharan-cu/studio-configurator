import { addItem, addOpening, setItemVariant, updateOpening } from '../commands/elements'
import type { CommandResult } from '../commands/draft'
import { addStair } from '../commands/stairs'
import { addLevel, createRoom, setFacade, updateRoom, updateWall } from '../commands/structure'
import { wallSides } from '../geometry/walls'
import { emptyProject } from '../model/project'
import { nodePos, sortedLevels } from '../model/query'
import { isOutdoor, type Id, type OpeningKind, type Project, type RoomType } from '../model/types'

/**
 * Declarative house templates. A spec lists rooms, openings and furniture in plan coordinates
 * (metres, x east, y south); `buildHouse` replays it through the same validated commands a user
 * triggers. A template therefore cannot contain anything the editor itself couldn't produce, and every
 * build is an end-to-end exercise of the engine.
 */

export interface RoomSpec {
  name: string
  type: RoomType
  /** Axis-aligned rectangle [x0, y0, x1, y1] … */
  rect?: [number, number, number, number]
  /** … or any simple polygon. */
  points?: [number, number][]
  floor: string
  walls?: string
}

export interface OpeningOpts {
  w?: number
  h?: number
  sill?: number
  hinge?: 'a' | 'b'
  swing?: 'left' | 'right'
}
/** [kind, x, y, options]: (x, y) is a point on the host wall's centreline at the opening's centre. */
export type OpeningSpec = [OpeningKind, number, number, OpeningOpts?]
/** [asset, x, y, rotation in degrees (counter-clockwise from above), finish variant]. */
export type ItemSpec = [string, number, number, number?, string?]

/** A flight rising from the floor it's listed on: centre (x, y), direction of ascent in degrees
 *  (0 = east, 90 = north; counter-clockwise from above), width and run length (default: a comfortable going). */
export interface StairSpec {
  at: [number, number]
  deg: number
  w?: number
  len?: number
}

/** An upper floor: its own rooms, openings and furniture, drawn in the same plan coordinates. */
export interface FloorSpec {
  name?: string
  rooms: RoomSpec[]
  openings: OpeningSpec[]
  items: ItemSpec[]
  /** Stairs rising from this floor to the next one up. */
  stairs?: StairSpec[]
}

export interface HouseSpec {
  name: string
  /** Storey height (floor to ceiling), metres. */
  height?: number
  exterior?: number
  interior?: number
  /** Height of walls that enclose only open-air space (balcony/terrace parapets). */
  parapet?: number
  /** Exterior wall finish (see EXTERIOR_FINISHES). */
  facade?: string
  rooms: RoomSpec[]
  openings: OpeningSpec[]
  items: ItemSpec[]
  /** Stairs rising from the ground floor. */
  stairs?: StairSpec[]
  /** Floors above the ground floor, bottom to top. */
  upper?: FloorSpec[]
}

export const EXTERIOR_THICKNESS = 0.25
export const INTERIOR_THICKNESS = 0.12

function must(r: CommandResult, what: string): Project {
  if (!r.ok) throw new Error(`Template step failed (${what}): ${r.error.message}`)
  return r.project
}

const rect = ([x0, y0, x1, y1]: [number, number, number, number]) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]

/** The wall (on `level`, if given) whose centreline contains (x, y), and the distance along it from node a. */
export function wallAt(p: Project, x: number, y: number, level?: Id): { wall: Id; offset: number } {
  for (const w of Object.values(p.walls)) {
    if (level && w.level !== level) continue
    const a = nodePos(p, w.a)
    const b = nodePos(p, w.b)
    const L = Math.hypot(b.x - a.x, b.y - a.y)
    const t = ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / (L * L)
    const px = a.x + (b.x - a.x) * t
    const py = a.y + (b.y - a.y) * t
    if (t > 0 && t < 1 && Math.hypot(px - x, py - y) < 1e-3) return { wall: w.id, offset: t * L }
  }
  throw new Error(`No wall at ${x}, ${y}`)
}

export function buildHouse(spec: HouseSpec, templateId: string): Project {
  let p = emptyProject(spec.name)
  const ground = Object.keys(p.levels)[0]
  const height = spec.height ?? 2.7
  p = { ...p, levels: { [ground]: { ...p.levels[ground], height } } }
  const floors: FloorSpec[] = [{ rooms: spec.rooms, openings: spec.openings, items: spec.items, stairs: spec.stairs }, ...(spec.upper ?? [])]

  floors.forEach((f, i) => {
    if (i > 0) p = must(addLevel(p, { name: f.name, height }), `floor ${i}`)
    const level = sortedLevels(p)[i].id
    for (const r of f.rooms) {
      const points = r.rect ? rect(r.rect) : (r.points ?? []).map(([x, y]) => ({ x, y }))
      p = must(createRoom(p, { level, points, name: r.name, type: r.type, thickness: spec.interior ?? INTERIOR_THICKNESS, height }), r.name)
      const id = Object.values(p.rooms).find((x) => x.name === r.name && x.level === level)!.id
      p = must(updateRoom(p, { room: id, floorFinish: r.floor, wallFinish: r.walls ?? 'chalk-white' }), `${r.name} finishes`)
    }
  })
  const levels = sortedLevels(p).map((l) => l.id)

  // Walls with an indoor room on one side only are facade walls; walls enclosing only open-air space
  // (a balcony edge) are parapets.
  const indoor = wallSides(p, true)
  const all = wallSides(p)
  for (const w of Object.values(p.walls)) {
    const s = indoor[w.id] ?? {}
    const any = all[w.id] ?? {}
    if (!s.left && !s.right) {
      const outdoorOnly = [any.left, any.right].filter(Boolean).every((id) => isOutdoor(p.rooms[id!]))
      if (outdoorOnly) p = must(updateWall(p, { wall: w.id, thickness: 0.15, height: spec.parapet ?? 1.05 }), 'parapet')
    } else if (!(s.left && s.right)) p = must(updateWall(p, { wall: w.id, thickness: spec.exterior ?? EXTERIOR_THICKNESS }), 'exterior wall')
  }

  floors.forEach((f, i) => {
    for (const [kind, x, y, o = {}] of f.openings) {
      const { wall, offset } = wallAt(p, x, y, levels[i])
      const before = new Set(Object.keys(p.openings))
      p = must(addOpening(p, { wall, kind, offset, width: o.w, height: o.h, sill: o.sill }), `${kind} at ${x},${y}`)
      const id = Object.keys(p.openings).find((k) => !before.has(k))!
      if (Math.abs(p.openings[id].offset - offset) > 1e-6) throw new Error(`Template step failed (${kind} at ${x},${y}): it overlaps another opening`)
      if (o.hinge || o.swing) p = must(updateOpening(p, { opening: id, hinge: o.hinge, swing: o.swing }), `${kind} hinge`)
    }
  })

  if (spec.facade) p = must(setFacade(p, { finish: spec.facade }), 'facade')

  floors.forEach((f, i) => {
    for (const st of f.stairs ?? []) {
      const [x, y] = st.at
      p = must(addStair(p, { level: levels[i], x, y, rotation: (st.deg * Math.PI) / 180, width: st.w, length: st.len }), `stairs at ${x},${y}`)
    }
  })

  floors.forEach((f, i) => {
    for (const [asset, x, y, deg = 0, variant] of f.items) {
      const before = new Set(Object.keys(p.items))
      p = must(addItem(p, { asset, level: levels[i], x, y, rotation: (deg * Math.PI) / 180 }), `${asset} at ${x},${y}`)
      if (variant) {
        const id = Object.keys(p.items).find((k) => !before.has(k))!
        p = must(setItemVariant(p, { item: id, variant }), `${asset} finish`)
      }
    }
  })
  return { ...p, meta: { ...p.meta, template: templateId } }
}
