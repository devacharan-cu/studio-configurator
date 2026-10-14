/**
 * Canonical building model — the single source of truth for a project.
 *
 * Units & conventions (see docs/ARCHITECTURE.md):
 * - All lengths are metres (float). Display code converts.
 * - Plan coordinates (x, y): x → east, y → south. World (three.js): X = x, Z = y, Y = up.
 * - Each level has an elevation (floor top, m) and a default wall height.
 * - Topology: nodes (wall junctions) + walls (edges between two nodes) form a planar graph per level.
 *   A node never lies in the interior of a wall it isn't an endpoint of; junctions are explicit.
 * - Rooms are closed cycles of node ids; consecutive nodes must be joined by a wall.
 * - Openings are hosted by one wall, positioned by the distance from the wall's start node (a)
 *   along its centreline to the opening's centre.
 * - Items (furniture, fixtures) are placed by their footprint centre on the floor and a rotation about +Y
 *   (radians, counter-clockwise when seen from above in world space).
 */

export type Id = string

export interface Level {
  id: Id
  name: string
  /** Elevation of the finished floor, metres. */
  elevation: number
  /** Default wall height for walls on this level, metres. */
  height: number
}

export interface Node {
  id: Id
  level: Id
  x: number
  y: number
}

export interface Wall {
  id: Id
  level: Id
  a: Id
  b: Id
  thickness: number
  height: number
}

export const ROOM_TYPES = [
  'living',
  'dining',
  'kitchen',
  'bedroom',
  'bathroom',
  'hall',
  'study',
  'utility',
  'storage',
  'dressing',
  'pooja',
  'laundry',
  'garage',
  'balcony',
  'terrace',
  'courtyard',
  'other',
] as const
export type RoomType = (typeof ROOM_TYPES)[number]

/** Open-air spaces: no ceiling or roof; their walls count as exterior (facade finish, eaves, entrances). */
export const OUTDOOR_TYPES: readonly RoomType[] = ['balcony', 'terrace', 'courtyard']
export const isOutdoor = (r: { type: RoomType }) => OUTDOOR_TYPES.includes(r.type)

export interface Room {
  id: Id
  level: Id
  name: string
  type: RoomType
  /** Node ids in order around the room (orientation normalised to positive signed area). */
  boundary: Id[]
  floorFinish: string
  wallFinish: string
}

export type OpeningKind = 'door' | 'window' | 'passage'

export interface Opening {
  id: Id
  wall: Id
  kind: OpeningKind
  /** Distance from wall node `a` along the centreline to the opening centre, metres. */
  offset: number
  width: number
  height: number
  /** Height of the bottom of the opening above the floor (0 for doors and passages). */
  sill: number
  /** Doors: which end the hinge is on, and which side of the wall the leaf swings into. */
  hinge: 'a' | 'b'
  swing: 'left' | 'right'
}

export interface Item {
  id: Id
  level: Id
  asset: string
  x: number
  y: number
  rotation: number
  /** Optional finish/variant id understood by the asset (e.g. a fabric). */
  variant?: string
}

export interface Project {
  schema: 'roomset.project'
  version: 1
  id: Id
  name: string
  levels: Record<Id, Level>
  nodes: Record<Id, Node>
  walls: Record<Id, Wall>
  rooms: Record<Id, Room>
  openings: Record<Id, Opening>
  items: Record<Id, Item>
  meta: { createdAt: string; updatedAt: string; template?: string }
}

/* ---------- Tolerances & limits (metres) ---------- */

export const TOL = {
  /** Points closer than this are the same point. */
  point: 0.005,
  /** Distance used to snap a drawn point onto an existing node or wall. */
  snap: 0.02,
  /** Parallel/collinear test on unit vectors (sin of angle). */
  angle: 1e-4,
} as const

export const LIMITS = {
  minWallLength: 0.2,
  minWallThickness: 0.05,
  maxWallThickness: 0.6,
  /** Low enough for balcony and terrace parapets. */
  minWallHeight: 0.9,
  maxWallHeight: 6.0,
  minRoomArea: 0.8,
  /** Minimum angle between walls meeting at a node (radians, ~10°). */
  minJunctionAngle: (10 * Math.PI) / 180,
  /** Clearance between an opening and the end of its wall, or another opening. */
  openingClearance: 0.05,
  minOpeningWidth: 0.3,
  maxCoordinate: 500,
} as const
