import type { RoomType } from '../model/types'
import { LIBRARY_ASSETS } from './library'

/**
 * Asset library metadata. Pure data — renderers decide how to draw each asset.
 *
 * Placement convention: an item's (x, y) is the centre of its footprint on the floor; at rotation 0
 * the asset's front faces +y in plan (+Z in world), its width runs along x and its depth along y.
 * `yaw` and `scale` normalise source models to that convention; `footprint` is measured after them.
 */

export type AssetCategory = 'seating' | 'tables' | 'storage' | 'beds' | 'kitchen' | 'bathroom' | 'lighting' | 'decor' | 'plants' | 'rugs' | 'outdoor'

export interface AssetLicense {
  spdx: 'CC0-1.0' | 'CC-BY-4.0' | 'project'
  attribution: string
  source?: string
}

export interface AssetDef {
  id: string
  name: string
  category: AssetCategory
  /** gltf = third-party model file; procedural = modelled in code by this project (honestly labelled). */
  kind: 'gltf' | 'procedural'
  url?: string
  /** Material variant name inside the glTF (KHR_materials_variants). */
  variant?: string
  footprint: { w: number; d: number; h: number }
  yaw?: number
  scale?: number
  /** Can a person walk over it in the walkthrough (rugs)? */
  walkable?: boolean
  /** Mounted on a wall (snaps to the nearest wall face) or hung from the ceiling; floor by default. */
  mount?: 'wall' | 'ceiling'
  /** Wall-mounted: height of the item's bottom above the floor, metres. */
  wallHeight?: number
  /** Height of a usable top that small items can stand on (tables, consoles, counters). */
  surface?: number
  /** Small items that stand on a surface under them (vases, lamps, clocks) when there is one. */
  onSurfaces?: boolean
  license: AssetLicense
  /** Approximate triangle count, for budgeting. */
  tris?: number
  /** Extra search words (materials, styles, synonyms). */
  tags?: string[]
  /** Finish options the renderer understands for this asset (first = default). */
  variants?: AssetVariant[]
}

export interface AssetVariant {
  id: string
  name: string
  /** Swatch colour for the picker. */
  swatch: string
  /** Multiplier applied to the asset's main textured material (fabric, wood). */
  tint?: string
}

const FABRICS: AssetVariant[] = [
  { id: 'oatmeal', name: 'Oatmeal linen', swatch: '#d6cab8', tint: '#d6cab8' },
  { id: 'sage', name: 'Sage linen', swatch: '#9aa58e', tint: '#a3ad94' },
  { id: 'charcoal', name: 'Charcoal wool', swatch: '#4a4a48', tint: '#58585a' },
  { id: 'terracotta', name: 'Terracotta', swatch: '#b8735a', tint: '#c07c60' },
  { id: 'ink', name: 'Ink blue', swatch: '#3d4b63', tint: '#4b5a75' },
]
const BOUCLE: AssetVariant[] = [
  { id: 'ivory', name: 'Ivory bouclé', swatch: '#e6dfd2', tint: '#e6dfd2' },
  { id: 'stone', name: 'Stone bouclé', swatch: '#bdb3a3', tint: '#bdb3a3' },
  { id: 'moss', name: 'Moss bouclé', swatch: '#8d9277', tint: '#959a7f' },
  { id: 'clay', name: 'Clay bouclé', swatch: '#b48a70', tint: '#b8907a' },
]

const PH = (author: string, slug: string): AssetLicense => ({
  spdx: 'CC0-1.0',
  attribution: `Poly Haven — ${author}`,
  source: `https://polyhaven.com/a/${slug}`,
})
const STUDIO: AssetLicense = { spdx: 'project', attribution: 'Modelled in code for this project' }
const m = (file: string) => `/assets/models/${file}.glb`

export const ASSETS: AssetDef[] = [
  // Seating
  { id: 'sofa-arlo', surface: 0.44, name: 'Arlo three-seater sofa', category: 'seating', kind: 'procedural', footprint: { w: 2.3, d: 0.98, h: 0.78 }, license: STUDIO, variants: FABRICS, tags: ['couch', 'linen'] },
  {
    id: 'sofa-curve-velvet',
    surface: 0.45,
    name: 'Curve velvet sofa',
    category: 'seating',
    kind: 'gltf',
    url: m('glam_velvet_sofa'),
    variant: 'Navy',
    footprint: { w: 2.19, d: 1.02, h: 0.79 },
    license: {
      spdx: 'CC-BY-4.0',
      attribution: '“Glam Velvet Sofa” © 2021 Wayfair LLC, model by Eric Chadwick (Khronos glTF Sample Assets)',
      source: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa',
    },
    tris: 3800,
  },
  { id: 'chair-lounge', name: 'Mid-century lounge chair', category: 'seating', kind: 'gltf', url: m('mid_century_lounge_chair'), footprint: { w: 1.01, d: 1.19, h: 1.17 }, license: PH('Kuutti Siitonen', 'mid_century_lounge_chair'), tris: 5800 },
  { id: 'chair-arm', name: 'Leather armchair', category: 'seating', kind: 'gltf', url: m('modern_arm_chair_01'), footprint: { w: 0.82, d: 0.99, h: 1.02 }, license: PH('Vibrant Nordic', 'modern_arm_chair_01'), tris: 8900 },
  { id: 'chair-dining', name: 'Upholstered dining chair', category: 'seating', kind: 'gltf', url: m('dining_chair_02'), footprint: { w: 0.43, d: 0.58, h: 0.97 }, license: PH('James Ray Cock', 'dining_chair_02'), tris: 22000 },

  // Tables
  { id: 'table-coffee-slab', surface: 0.39, name: 'Slab coffee table', category: 'tables', kind: 'gltf', url: m('modern_coffee_table_01'), yaw: Math.PI / 2, footprint: { w: 1.2, d: 0.6, h: 0.39 }, license: PH('Amin', 'modern_coffee_table_01'), tris: 3800 },
  { id: 'table-coffee-round', surface: 0.49, name: 'Ribbon round coffee table', category: 'tables', kind: 'gltf', url: m('coffee_table_round_01'), footprint: { w: 1.3, d: 1.3, h: 0.49 }, license: PH('Ulan Cabanilla', 'coffee_table_round_01'), tris: 3700 },
  { id: 'table-dining-round', surface: 0.76, name: 'Round pedestal dining table', category: 'tables', kind: 'gltf', url: m('round_wooden_table_01'), scale: 0.76, footprint: { w: 1.06, d: 1.06, h: 0.76 }, license: PH('Ulan Cabanilla', 'round_wooden_table_01'), tris: 8600 },
  { id: 'table-side', surface: 0.55, name: 'Oak side table', category: 'tables', kind: 'gltf', url: m('side_table_01'), footprint: { w: 0.55, d: 0.45, h: 0.55 }, license: PH('James Ray Cock', 'side_table_01'), tris: 2500 },
  { id: 'bench-wood', surface: 0.53, name: 'Low wooden bench', category: 'tables', kind: 'gltf', url: m('small_wooden_table_01'), footprint: { w: 0.92, d: 0.44, h: 0.53 }, license: PH('Ulan Cabanilla', 'small_wooden_table_01'), tris: 3400 },
  { id: 'desk', surface: 0.75, name: 'Writing desk', category: 'tables', kind: 'procedural', footprint: { w: 1.4, d: 0.7, h: 0.75 }, license: STUDIO },

  // Storage
  { id: 'cabinet-media', surface: 0.68, name: 'Slatted media console', category: 'storage', kind: 'gltf', url: m('modern_wooden_cabinet'), footprint: { w: 2.44, d: 0.52, h: 0.68 }, license: PH('Patrik Pangerl', 'modern_wooden_cabinet'), tris: 13300 },
  { id: 'shelves-cube', name: 'Cube display shelving', category: 'storage', kind: 'gltf', url: m('wooden_display_shelves_01'), yaw: Math.PI / 2, footprint: { w: 1.08, d: 0.37, h: 1.56 }, license: PH('James Ray Cock', 'wooden_display_shelves_01'), tris: 3200 },
  { id: 'cabinet-drawers', name: 'Steel-frame drawer unit', category: 'storage', kind: 'gltf', url: m('drawer_cabinet'), footprint: { w: 1.14, d: 0.49, h: 1.88 }, license: PH('Ulan Cabanilla', 'drawer_cabinet'), tris: 26000 },
  { id: 'wardrobe', name: 'Two-door wardrobe', category: 'storage', kind: 'procedural', footprint: { w: 1.8, d: 0.62, h: 2.2 }, license: STUDIO },

  // Beds
  { id: 'bed-double', surface: 0.62, name: 'Upholstered double bed', category: 'beds', kind: 'procedural', footprint: { w: 1.7, d: 2.15, h: 1.05 }, license: STUDIO, variants: BOUCLE, tags: ['bedroom'] },

  // Kitchen
  { id: 'kitchen-run', surface: 0.92, name: 'Kitchen run, 3 m', category: 'kitchen', kind: 'procedural', footprint: { w: 3.0, d: 0.62, h: 0.95 }, license: STUDIO },
  { id: 'kitchen-island', surface: 0.92, name: 'Kitchen island', category: 'kitchen', kind: 'procedural', footprint: { w: 1.8, d: 0.9, h: 0.92 }, license: STUDIO },

  // Bathroom
  { id: 'bath', name: 'Freestanding bath', category: 'bathroom', kind: 'procedural', footprint: { w: 1.7, d: 0.78, h: 0.6 }, license: STUDIO },
  { id: 'vanity', surface: 0.86, name: 'Vanity with basin', category: 'bathroom', kind: 'procedural', footprint: { w: 0.9, d: 0.5, h: 0.86 }, license: STUDIO },
  { id: 'wc', name: 'Wall-hung WC', category: 'bathroom', kind: 'procedural', footprint: { w: 0.38, d: 0.55, h: 0.8 }, license: STUDIO },

  // Decor
  { id: 'plant-large', name: 'Large potted plant', category: 'plants', kind: 'gltf', url: m('potted_plant_02'), footprint: { w: 0.7, d: 0.66, h: 0.84 }, license: PH('Rico Cilliers', 'potted_plant_02'), tris: 69000 },
  { id: 'plant-small', name: 'Potted succulent', category: 'plants', kind: 'gltf', url: m('potted_plant_04'), footprint: { w: 0.17, d: 0.18, h: 0.27 }, walkable: false, license: PH('James Ray Cock', 'potted_plant_04'), tris: 6100 },
  { id: 'rug-wool', name: 'Wool rug, 2.4 × 1.7 m', category: 'rugs', kind: 'procedural', footprint: { w: 2.4, d: 1.7, h: 0.016 }, walkable: true, license: STUDIO, variants: BOUCLE },
]

ASSETS.push(...LIBRARY_ASSETS)

const BY_ID = new Map(ASSETS.map((a) => [a.id, a]))
export const getAsset = (id: string) => BY_ID.get(id)

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  seating: 'Seating',
  tables: 'Tables',
  storage: 'Storage',
  beds: 'Beds',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  lighting: 'Lighting',
  decor: 'Decor',
  plants: 'Plants',
  rugs: 'Rugs',
  outdoor: 'Outdoor',
}

/** Thumbnail rendered from the asset itself by `scripts/capture-thumbnails.mjs`. */
export const assetThumb = (a: Pick<AssetDef, 'id'>) => `/assets/catalog/${a.id}.webp`

/** Categories that usually belong in each room type (library suggestions for the selected room). */
export const SUGGESTED_FOR: Record<RoomType, AssetCategory[]> = {
  living: ['seating', 'tables', 'storage', 'lighting', 'decor', 'plants', 'rugs'],
  dining: ['tables', 'seating', 'storage', 'lighting', 'decor'],
  kitchen: ['kitchen', 'seating', 'lighting'],
  bedroom: ['beds', 'storage', 'seating', 'lighting', 'rugs', 'decor'],
  bathroom: ['bathroom', 'lighting', 'plants'],
  hall: ['storage', 'seating', 'decor', 'lighting', 'plants'],
  study: ['tables', 'seating', 'storage', 'lighting', 'decor'],
  utility: ['storage', 'kitchen'],
  storage: ['storage'],
  dressing: ['storage', 'seating', 'lighting'],
  pooja: ['decor', 'lighting', 'storage'],
  laundry: ['storage', 'kitchen'],
  garage: ['storage', 'outdoor'],
  balcony: ['outdoor', 'plants', 'seating'],
  terrace: ['outdoor', 'plants', 'seating', 'tables'],
  courtyard: ['outdoor', 'plants', 'seating'],
  other: ['seating', 'tables', 'storage', 'decor'],
}
