/** Surface finishes for floors and walls (CC0 Poly Haven textures, recoloured — see README credits). */

export interface FinishDef {
  id: string
  name: string
  texture: string
  /** Real-world size of one texture tile, metres. */
  tileSize: number
  tint: string
  roughness?: number
  normalScale?: number
  rotate?: boolean
  swatch: string
}

export const FLOOR_FINISHES: FinishDef[] = [
  { id: 'oak-herringbone', name: 'Oak herringbone', texture: 'herringbone_parquet', tileSize: 3.4, tint: '#fff4ea', swatch: '#b07a4f' },
  { id: 'smoked-oak-plank', name: 'Smoked oak plank', texture: 'wood_floor', tileSize: 1.7, tint: '#9a8572', rotate: true, swatch: '#6e5643' },
  { id: 'microcement', name: 'Warm microcement', texture: 'concrete_floor_worn_001', tileSize: 3, tint: '#cfc5b8', normalScale: 0.4, swatch: '#c8beb1' },
  { id: 'limestone', name: 'Honed limestone', texture: 'marble_01', tileSize: 2.4, tint: '#fbf6ee', swatch: '#d9c9a8' },
]

export const WALL_FINISHES: FinishDef[] = [
  { id: 'chalk-white', name: 'Chalk white', texture: 'plastered_wall_04', tileSize: 3.2, tint: '#f2eee7', normalScale: 0.3, swatch: '#ece7df' },
  { id: 'sage-limewash', name: 'Sage limewash', texture: 'white_plaster_02', tileSize: 1.6, tint: '#b2baa4', normalScale: 0.4, swatch: '#a9b29b' },
  { id: 'clay-plaster', name: 'Terracotta clay plaster', texture: 'beige_wall_002', tileSize: 2.2, tint: '#c98d70', normalScale: 0.6, swatch: '#c98d70' },
  { id: 'ink-blue', name: 'Ink blue', texture: 'plastered_wall_04', tileSize: 3.2, tint: '#4a5564', roughness: 0.8, normalScale: 0.25, swatch: '#36404d' },
]

/** Exterior face of external walls. */
export const EXTERIOR_FINISH: FinishDef = { id: 'exterior-render', name: 'Lime render', texture: 'white_plaster_02', tileSize: 2.0, tint: '#e9e4da', normalScale: 0.5, swatch: '#e9e4da' }

export const getFloorFinish = (id: string) => FLOOR_FINISHES.find((f) => f.id === id) ?? FLOOR_FINISHES[0]
export const getWallFinish = (id: string) => WALL_FINISHES.find((f) => f.id === id) ?? WALL_FINISHES[0]
