import { distanceToBoundary, interiorPoint, pointInPolygon } from '../geometry/polygon'
import { openingCenter } from '../geometry/walls'
import { roomPolygon, roomsOnLevel, sortedLevels } from '../model/query'
import { defaultStairLength, levelAbove, stairGeometry, stairsOf } from '../model/stairs'
import { isOutdoor, type Id, type Project, type Stair } from '../model/types'
import { stairIssues } from '../model/validate'
import { Draft, fail, finish, newId, type CommandResult } from './draft'

/** Stairs and levels. Every rule lives in `validateProject`, so these only assemble the change. */

export function addStair(p: Project, args: { level: Id; x: number; y: number; rotation?: number; width?: number; length?: number }): CommandResult {
  const from = p.levels[args.level]
  if (!from) return fail('ref', 'Pick a floor to put the stairs on')
  const to = levelAbove(p, args.level)
  if (!to) return fail('stair-level', 'Stairs need a floor above to lead to — add a level first', args.level)
  const d = new Draft(p)
  const id = newId('s')
  d.setStair({
    id,
    level: args.level,
    x: args.x,
    y: args.y,
    rotation: args.rotation ?? 0,
    width: args.width ?? 1,
    length: args.length ?? defaultStairLength(to.elevation - from.elevation),
  })
  d.created.push(id)
  return finish(d, 'Add stairs')
}

/**
 * Put a flight on a floor where it fits: tries every room (halls and living spaces first) on a 25 cm grid
 * in all four directions, nearest the room's centre first, with only the stair rules checked per try.
 */
export function addStairAnywhere(p: Project, args: { level: Id }): CommandResult {
  const from = p.levels[args.level]
  const to = from && levelAbove(p, args.level)
  if (!from || !to) return fail('stair-level', 'Stairs need a floor above to lead to — add a floor first', args.level)
  const rise = to.elevation - from.elevation
  const length = defaultStairLength(rise)
  // the comfortable flight first, then a slightly steeper and narrower one (25 cm goings, 90 cm wide)
  const sizes = [
    { length, width: 1 },
    { length: defaultStairLength(rise, 0.25), width: 0.9 },
  ]
  const rank = (t: string) => (t === 'hall' ? 0 : t === 'living' || t === 'dining' ? 1 : 2)
  const rooms = roomsOnLevel(p, args.level)
    .filter((r) => !isOutdoor(r))
    .sort((a, b) => rank(a.type) - rank(b.type))
  // doorways on both floors stay clear: no flight or stairwell within a metre of one
  const doors = Object.values(p.openings)
    .filter((o) => o.kind !== 'window' && [args.level, to.id].includes(p.walls[o.wall]?.level))
    .map((o) => openingCenter(p, o))
  const probe = new Draft(p)
  const id = newId('s')
  for (const size of sizes) {
    for (const r of rooms) {
      const poly = roomPolygon(p, r)
      const c = interiorPoint(poly)
      const xs = poly.map((q) => q.x)
      const ys = poly.map((q) => q.y)
      const cells: { x: number; y: number }[] = []
      for (let x = Math.ceil(Math.min(...xs) * 4) / 4; x <= Math.max(...xs); x += 0.25) for (let y = Math.ceil(Math.min(...ys) * 4) / 4; y <= Math.max(...ys); y += 0.25) cells.push({ x, y })
      cells.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))
      for (const q of cells)
        for (const rotation of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          const s: Stair = { id, level: args.level, x: q.x, y: q.y, rotation, ...size }
          probe.setStair(s)
          const foot = stairGeometry(probe.p, s).corners
          if (doors.some((d) => pointInPolygon(d, foot) || distanceToBoundary(d, foot) < 1)) continue
          if (!stairIssues(probe.p, id).length) return addStair(p, s)
        }
    }
  }
  return fail('stair-room', `There’s no free spot for a ${length.toFixed(2)} m flight on ${from.name} — clear a strip about 1 m wide by ${(length + 1).toFixed(1)} m (furniture, doorways) and try again`, args.level)
}

export function updateStair(p: Project, args: { stair: Id; x?: number; y?: number; rotation?: number; width?: number; length?: number }): CommandResult {
  const s = p.stairs?.[args.stair]
  if (!s) return fail('ref', 'Those stairs no longer exist', args.stair)
  const d = new Draft(p)
  const { stair: _id, ...patch } = args
  d.setStair({ ...s, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) })
  return finish(d, args.x !== undefined || args.y !== undefined ? 'Move stairs' : 'Edit stairs')
}

export function deleteStair(p: Project, args: { stair: Id }): CommandResult {
  if (!p.stairs?.[args.stair]) return fail('ref', 'Those stairs no longer exist', args.stair)
  const d = new Draft(p)
  d.deleteStair(args.stair)
  return finish(d, 'Delete stairs')
}

export function renameLevel(p: Project, args: { level: Id; name: string }): CommandResult {
  const l = p.levels[args.level]
  if (!l) return fail('ref', 'That floor no longer exists', args.level)
  const name = args.name.trim().slice(0, 40)
  if (!name) return fail('level-name', 'A floor needs a name', args.level)
  const d = new Draft(p)
  d.setLevel({ ...l, name })
  return finish(d, 'Rename floor')
}

/**
 * Remove a floor and everything on it, plus any stairs that led to or from it. Only the top floor can
 * be removed (the floors above would otherwise be left floating), and never the last one.
 */
export function deleteLevel(p: Project, args: { level: Id }): CommandResult {
  const levels = sortedLevels(p)
  const l = p.levels[args.level]
  if (!l) return fail('ref', 'That floor no longer exists', args.level)
  if (levels.length < 2) return fail('level-last', 'A project needs at least one floor', l.id)
  if (levels[levels.length - 1].id !== l.id) return fail('level-order', 'Only the top floor can be removed', l.id)
  const d = new Draft(p)
  const below = levels[levels.length - 2]
  for (const r of roomsOnLevel(p, l.id)) delete d.p.rooms[r.id]
  for (const w of Object.values(p.walls)) {
    if (w.level !== l.id) continue
    delete d.p.walls[w.id]
    for (const o of Object.values(p.openings)) if (o.wall === w.id) delete d.p.openings[o.id]
  }
  for (const n of Object.values(p.nodes)) if (n.level === l.id) delete d.p.nodes[n.id]
  for (const it of Object.values(p.items)) if (it.level === l.id) delete d.p.items[it.id]
  for (const s of stairsOf(p)) if (s.level === l.id || s.level === below.id) d.deleteStair(s.id)
  delete d.p.levels[l.id]
  return finish(d, `Remove ${l.name}`)
}
