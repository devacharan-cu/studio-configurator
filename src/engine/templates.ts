import { addItem, addOpening } from './commands/elements'
import type { CommandResult } from './commands/draft'
import { createRoom, updateWall } from './commands/structure'
import { wallSides } from './geometry/walls'
import { emptyProject } from './model/project'
import { nodePos } from './model/query'
import type { Id, OpeningKind, Project, RoomType } from './model/types'

/**
 * Templates are built through the same public commands a user triggers, so every template is
 * also an end-to-end exercise of the engine (shared walls, T-junctions, openings, furniture).
 */

function must(r: CommandResult, what: string): Project {
  if (!r.ok) throw new Error(`Template step failed (${what}): ${r.error.message}`)
  return r.project
}

const rect = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]

/** Find the wall whose centreline contains the point (x, y). */
function wallAt(p: Project, x: number, y: number): { wall: Id; offset: number } {
  for (const w of Object.values(p.walls)) {
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

export const EXTERIOR_THICKNESS = 0.25
export const INTERIOR_THICKNESS = 0.12

export function compactHome(): Project {
  let p = emptyProject('Compact single-storey home')
  p = { ...p, meta: { ...p.meta, template: 'compact-home' } }
  const level = Object.keys(p.levels)[0]

  const rooms: [string, RoomType, number[], string, string][] = [
    ['Living & dining', 'living', [0, 0, 6.2, 4.6], 'oak-herringbone', 'chalk-white'],
    ['Kitchen', 'kitchen', [6.2, 0, 10, 4.6], 'limestone', 'chalk-white'],
    ['Bedroom', 'bedroom', [0, 4.6, 3.8, 8.2], 'smoked-oak-plank', 'sage-limewash'],
    ['Hall', 'hall', [3.8, 4.6, 5.3, 8.2], 'oak-herringbone', 'chalk-white'],
    ['Bathroom', 'bathroom', [5.3, 4.6, 7.6, 8.2], 'microcement', 'chalk-white'],
    ['Study', 'study', [7.6, 4.6, 10, 8.2], 'smoked-oak-plank', 'clay-plaster'],
  ]
  for (const [name, type, [x0, y0, x1, y1], floorFinish, wallFinish] of rooms) {
    p = must(createRoom(p, { level, points: rect(x0, y0, x1, y1), name, type, thickness: INTERIOR_THICKNESS }), name)
    const id = Object.values(p.rooms).find((r) => r.name === name)!.id
    p = { ...p, rooms: { ...p.rooms, [id]: { ...p.rooms[id], floorFinish, wallFinish } } }
  }

  // Walls with a room on only one side are exterior walls.
  const sides = wallSides(p)
  for (const w of Object.values(p.walls)) {
    const s = sides[w.id] ?? {}
    if (!(s.left && s.right)) p = must(updateWall(p, { wall: w.id, thickness: EXTERIOR_THICKNESS }), 'exterior wall')
  }

  const openings: [OpeningKind, number, number, Partial<{ width: number; height: number; sill: number }>][] = [
    ['door', 4.55, 8.2, { width: 1.0, height: 2.15 }], // front door
    ['door', 4.55, 4.6, {}], // hall → living
    ['door', 3.8, 7.55, {}], // hall → bedroom
    ['door', 5.3, 5.4, { width: 0.8 }], // hall → bathroom
    ['passage', 6.2, 2.6, { width: 2.0, height: 2.3 }], // open kitchen
    ['door', 8.4, 4.6, {}], // kitchen → study
    ['window', 1.6, 0, { width: 1.6, height: 1.8, sill: 0.45 }],
    ['window', 4.6, 0, { width: 1.6, height: 1.8, sill: 0.45 }],
    ['window', 0, 1.6, { width: 1.2, height: 1.3, sill: 0.9 }],
    ['window', 8.1, 0, { width: 1.4, height: 1.0, sill: 1.1 }],
    ['window', 10, 2.6, { width: 1.2, height: 1.3, sill: 0.9 }],
    ['window', 0, 6.4, { width: 1.4, height: 1.4, sill: 0.8 }],
    ['window', 1.9, 8.2, { width: 1.2, height: 1.4, sill: 0.8 }],
    ['window', 6.45, 8.2, { width: 0.7, height: 0.7, sill: 1.5 }],
    ['window', 10, 6.4, { width: 1.2, height: 1.4, sill: 0.8 }],
    ['window', 8.8, 8.2, { width: 1.4, height: 1.4, sill: 0.8 }],
  ]
  for (const [kind, x, y, size] of openings) {
    const { wall, offset } = wallAt(p, x, y)
    p = must(addOpening(p, { wall, kind, offset, ...size }), `${kind} at ${x},${y}`)
  }

  const S = Math.PI / 2
  const items: [string, number, number, number][] = [
    // living & dining
    ['rug-wool', 1.85, 2.75, 0],
    ['sofa-arlo', 1.85, 4.0, Math.PI],
    ['table-coffee-slab', 1.85, 2.75, 0],
    ['chair-lounge', 0.85, 1.25, 0.7],
    ['cabinet-media', 0.42, 2.9, S],
    ['plant-large', 5.75, 0.55, 0],
    ['table-dining-round', 4.7, 2.0, 0],
    ['chair-dining', 4.7, 1.22, 0],
    ['chair-dining', 4.7, 2.78, Math.PI],
    ['chair-dining', 3.92, 2.0, S],
    ['chair-dining', 5.48, 2.0, -S],
    // kitchen
    ['kitchen-run', 8.1, 0.45, 0],
    ['kitchen-island', 8.1, 2.45, 0],
    // bedroom
    ['bed-double', 1.9, 5.76, 0],
    ['table-side', 0.62, 4.95, 0],
    ['table-side', 3.15, 4.95, 0],
    ['wardrobe', 3.43, 6.15, -S],
    // hall
    ['bench-wood', 4.1, 6.6, S],
    // bathroom
    ['bath', 6.45, 7.66, Math.PI],
    ['vanity', 7.29, 6.3, -S],
    ['wc', 6.0, 4.96, 0],
    // study
    ['desk', 9.5, 6.6, -S],
    ['chair-arm', 8.55, 7.55, 2.4],
    ['shelves-cube', 7.87, 6.2, S],
  ]
  for (const [asset, x, y, rotation] of items) p = must(addItem(p, { asset, level, x, y, rotation }), asset)

  return { ...p, meta: { ...p.meta, template: 'compact-home' } }
}

export const TEMPLATES = [
  { id: 'compact-home', name: 'Compact single-storey home', description: '6 rooms · 82 m² · open kitchen', build: compactHome },
  { id: 'blank', name: 'Blank project', description: 'Start from an empty plan', build: () => emptyProject() },
] as const
