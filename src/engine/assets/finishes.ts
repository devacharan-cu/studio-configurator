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
  { id: 'light-oak-plank', name: 'Light oak plank', texture: 'laminate_floor_02', tileSize: 1.7, tint: '#fff8ef', swatch: '#c9a77c' },
  { id: 'oak-parquet', name: 'Oak block parquet', texture: 'rectangular_parquet', tileSize: 2.25, tint: '#fff2e2', swatch: '#a8834f' },
  { id: 'terrazzo', name: 'Terrazzo', texture: 'terrazzo_tiles', tileSize: 2.0, tint: '#fbf7f0', roughness: 0.6, swatch: '#b8a58c' },
  { id: 'terracotta-tile', name: 'Terracotta tile', texture: 'terracotta_floor_tiles', tileSize: 2.08, tint: '#ffffff', swatch: '#8c3f2a' },
  { id: 'checker-tile', name: 'Checkerboard stone tile', texture: 'floor_tiles_06', tileSize: 3.0, tint: '#ffffff', roughness: 0.7, swatch: '#8d8a85' },
  { id: 'granite-tile', name: 'Grey granite tile', texture: 'granite_tile_03', tileSize: 1.8, tint: '#ffffff', roughness: 0.55, swatch: '#6f6c68' },
  { id: 'polished-concrete', name: 'Polished concrete', texture: 'brushed_concrete_2', tileSize: 2.5, tint: '#d8d4cc', roughness: 0.55, normalScale: 0.4, swatch: '#a39d93' },
  { id: 'pebble-mosaic', name: 'Pebble mosaic', texture: 'marble_mosaic_tiles', tileSize: 2.0, tint: '#ffffff', roughness: 0.7, swatch: '#8e7d6a' },
  { id: 'teak-deck', name: 'Teak decking (outdoor)', texture: 'wood_floor_deck', tileSize: 1.8, tint: '#e8d2b8', swatch: '#8a4f2c' },
  { id: 'patio-tile', name: 'Sandstone patio tile (outdoor)', texture: 'patio_tiles', tileSize: 2.15, tint: '#f6efe6', swatch: '#c09267' },
  { id: 'crazy-paving', name: 'Crazy-paving stone (outdoor)', texture: 'slate_floor_03', tileSize: 2.0, tint: '#e9e4dc', swatch: '#6f5444' },
]

export const WALL_FINISHES: FinishDef[] = [
  { id: 'chalk-white', name: 'Chalk white', texture: 'plastered_wall_04', tileSize: 3.2, tint: '#f2eee7', normalScale: 0.3, swatch: '#ece7df' },
  { id: 'sage-limewash', name: 'Sage limewash', texture: 'white_plaster_02', tileSize: 1.6, tint: '#b2baa4', normalScale: 0.4, swatch: '#a9b29b' },
  { id: 'clay-plaster', name: 'Terracotta clay plaster', texture: 'beige_wall_002', tileSize: 2.2, tint: '#c98d70', normalScale: 0.6, swatch: '#c98d70' },
  { id: 'ink-blue', name: 'Ink blue', texture: 'plastered_wall_04', tileSize: 3.2, tint: '#4a5564', roughness: 0.8, normalScale: 0.25, swatch: '#36404d' },
  { id: 'warm-greige', name: 'Warm greige paint', texture: 'plastered_wall_04', tileSize: 3.2, tint: '#d6cbbb', normalScale: 0.25, swatch: '#cfc2ae' },
  { id: 'white-wall-tile', name: 'White wall tile', texture: 'rounded_square_tiled_wall', tileSize: 2.0, tint: '#ffffff', roughness: 0.35, swatch: '#e7e3dc' },
  { id: 'white-panelling', name: 'White tongue-and-groove', texture: 'white_planks_clean', tileSize: 1.8, tint: '#ffffff', swatch: '#ece9e2' },
  { id: 'whitewashed-brick', name: 'Whitewashed brick', texture: 'whitewashed_brick', tileSize: 2.0, tint: '#ffffff', swatch: '#d8d2c8' },
  { id: 'stone-cladding', name: 'Stone cladding', texture: 'stone_tile_wall', tileSize: 2.0, tint: '#f2eee8', swatch: '#b9b2a8' },
]

/** Exterior faces of external walls (the project's facade); the first is the default. */
export const EXTERIOR_FINISHES: FinishDef[] = [
  { id: 'exterior-render', name: 'Lime render', texture: 'white_plaster_02', tileSize: 2.0, tint: '#e9e4da', normalScale: 0.5, swatch: '#e9e4da' },
  { id: 'white-stucco', name: 'White stucco', texture: 'white_plaster_02', tileSize: 2.0, tint: '#fbf9f5', normalScale: 0.35, swatch: '#f5f3ef' },
  { id: 'sandstone-render', name: 'Sandstone render', texture: 'white_plaster_02', tileSize: 2.0, tint: '#d9c4a3', normalScale: 0.5, swatch: '#d4bd99' },
  { id: 'charcoal-render', name: 'Charcoal render', texture: 'plastered_wall_04', tileSize: 3.2, tint: '#6e6c68', normalScale: 0.3, swatch: '#4a4845' },
  { id: 'facade-brick', name: 'Whitewashed brick', texture: 'whitewashed_brick', tileSize: 2.0, tint: '#ffffff', swatch: '#d8d2c8' },
  { id: 'facade-stone', name: 'Stone cladding', texture: 'stone_tile_wall', tileSize: 2.0, tint: '#ede8e0', swatch: '#b9b2a8' },
]
export const EXTERIOR_FINISH = EXTERIOR_FINISHES[0]
export const getExteriorFinish = (id: string | undefined) => EXTERIOR_FINISHES.find((f) => f.id === id) ?? EXTERIOR_FINISH
/** Every finish by id (floors, walls, facades). */
export const finishById = (id: string): FinishDef | undefined => [...FLOOR_FINISHES, ...WALL_FINISHES, ...EXTERIOR_FINISHES].find((f) => f.id === id)

export const getFloorFinish = (id: string) => FLOOR_FINISHES.find((f) => f.id === id) ?? FLOOR_FINISHES[0]
export const getWallFinish = (id: string) => WALL_FINISHES.find((f) => f.id === id) ?? WALL_FINISHES[0]
