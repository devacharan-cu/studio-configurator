import type {
  CoffeeTableOption,
  FloorOption,
  GroupDefinition,
  GroupId,
  RoomTemplate,
  RugOption,
  SofaOption,
  WallOption,
} from './types'

/**
 * The curated collection a (fictional) studio has approved for this room.
 * Pure data: the scene and UI both read from here; nothing here knows about three.js or React.
 * All products are illustrative — none corresponds to a real, purchasable listing.
 */

export const STUDIO = {
  name: 'Fernhall Interiors',
  tagline: 'Demo studio',
  designer: 'Your designer',
} as const

export const TEMPLATE: RoomTemplate = {
  id: 'garden-room',
  name: 'The Garden Room',
  defaults: {
    sofa: 'arlo-linen',
    coffeeTable: 'slab-concrete-oak',
    flooring: 'oak-herringbone',
    wallFinish: 'chalk-white',
    rug: 'ivory-boucle',
  },
}

const linen = (tint: string) => ({ texture: 'rough_linen', tileSize: 0.27, tint, roughness: 1, normalScale: 1.2, sheen: 0.55 })
const boucle = (tint: string) => ({ texture: 'curly_teddy_natural', tileSize: 0.22, tint, roughness: 1, normalScale: 1.8, sheen: 0.7 })

const sofas: SofaOption[] = [
  {
    id: 'arlo-linen',
    name: 'Arlo three-seater',
    description: 'Low, deep seat in oatmeal washed linen on recessed oak plinth legs.',
    swatch: { kind: 'texture', texture: 'rough_linen', tint: '#d8cdbc' },
    provenance: 'studio-modelled',
    spec: { kind: 'modular', layout: 'straight', fabric: linen('#d8cdbc'), legs: '#6b4e36' },
  },
  {
    id: 'arlo-corner-boucle',
    name: 'Arlo corner with chaise',
    description: 'L-shaped sectional in ivory bouclé — seats five, chaise to the right.',
    swatch: { kind: 'texture', texture: 'curly_teddy_natural', tint: '#ece5d8' },
    provenance: 'studio-modelled',
    spec: { kind: 'modular', layout: 'corner', fabric: boucle('#ece5d8'), legs: '#2b2622' },
  },
  {
    id: 'curve-velvet-midnight',
    name: 'Curve sofa, midnight velvet',
    description: 'Sculpted recessed-arm sofa in saturated midnight-blue velvet on slim black legs.',
    swatch: { kind: 'color', value: '#26387a' },
    provenance: 'asset-library',
    spec: { kind: 'gltf', url: '/assets/models/glam_velvet_sofa.glb', variant: 'Navy' },
  },
  {
    id: 'curve-velvet-taupe',
    name: 'Curve sofa, taupe velvet',
    description: 'The same sculpted silhouette in a soft, warm taupe velvet.',
    swatch: { kind: 'color', value: '#7d6a5a' },
    provenance: 'asset-library',
    spec: { kind: 'gltf', url: '/assets/models/glam_velvet_sofa.glb', variant: 'Champagne' },
  },
]

const coffeeTables: CoffeeTableOption[] = [
  {
    id: 'slab-concrete-oak',
    name: 'Slab table',
    description: 'Cast concrete top inlaid with oak, on solid oak sled ends.',
    swatch: { kind: 'color', value: '#8d8a84' },
    provenance: 'asset-library',
    spec: { kind: 'gltf', url: '/assets/models/modern_coffee_table_01.glb', rotationY: Math.PI / 2 },
  },
  {
    id: 'ellipse-travertine',
    name: 'Ellipse plinth',
    description: 'A solid oval plinth in honed travertine-effect stone.',
    swatch: { kind: 'texture', texture: 'beige_wall_002', tint: '#d9cfc1' },
    provenance: 'studio-modelled',
    spec: {
      kind: 'plinth',
      surface: { texture: 'beige_wall_002', tileSize: 1.2, tint: '#d9cfc1', roughness: 1, normalScale: 0.5 },
      width: 1.3,
      depth: 0.72,
      height: 0.36,
    },
  },
  {
    id: 'ribbon-round',
    name: 'Ribbon round table',
    description: 'Pale stone disc floating on looped, blackened steel ribbons.',
    swatch: { kind: 'color', value: '#c9cacb' },
    provenance: 'asset-library',
    spec: { kind: 'gltf', url: '/assets/models/coffee_table_round_01.glb', rotationY: 0 },
  },
  {
    id: 'lattice-ebonised',
    name: 'Lattice low table',
    description: 'Ebonised square block with a carved walnut lattice top.',
    swatch: { kind: 'color', value: '#2a2523' },
    provenance: 'asset-library',
    spec: { kind: 'gltf', url: '/assets/models/modern_coffee_table_02.glb', rotationY: 0 },
  },
]

const floors: FloorOption[] = [
  {
    id: 'oak-herringbone',
    name: 'Oak herringbone',
    description: 'Natural oiled oak parquet laid in a classic herringbone.',
    swatch: { kind: 'texture', texture: 'herringbone_parquet', tint: '#ffffff' },
    provenance: 'asset-library',
    spec: { surface: { texture: 'herringbone_parquet', tileSize: 3.4, tint: '#fff4ea', roughness: 1 } },
  },
  {
    id: 'smoked-oak-plank',
    name: 'Smoked oak plank',
    description: 'Wide, fumed oak boards with a soft matt lacquer.',
    swatch: { kind: 'texture', texture: 'wood_floor', tint: '#9a8572' },
    provenance: 'asset-library',
    spec: { surface: { texture: 'wood_floor', tileSize: 1.7, tint: '#9a8572', roughness: 1, rotate: true } },
  },
  {
    id: 'microcement',
    name: 'Warm microcement',
    description: 'Seamless trowelled microcement in a warm putty grey.',
    swatch: { kind: 'texture', texture: 'concrete_floor_worn_001', tint: '#d6cbbd' },
    provenance: 'asset-library',
    spec: { surface: { texture: 'concrete_floor_worn_001', tileSize: 3, tint: '#cfc5b8', roughness: 1, normalScale: 0.4 } },
  },
  {
    id: 'limestone',
    name: 'Honed limestone',
    description: 'Large-format pale limestone flags with tight joints.',
    swatch: { kind: 'texture', texture: 'marble_01', tint: '#ffffff' },
    provenance: 'asset-library',
    spec: { surface: { texture: 'marble_01', tileSize: 2.4, tint: '#fbf6ee', roughness: 1 } },
  },
]

const walls: WallOption[] = [
  {
    id: 'chalk-white',
    name: 'Chalk white',
    description: 'Soft, warm white flat-matt paint.',
    swatch: { kind: 'color', value: '#ece7df' },
    provenance: 'asset-library',
    spec: { surface: { texture: 'plastered_wall_04', tileSize: 3.2, tint: '#f2eee7', roughness: 1, normalScale: 0.3 } },
  },
  {
    id: 'sage-limewash',
    name: 'Sage limewash',
    description: 'Cloudy, hand-brushed limewash in a muted grey-green.',
    swatch: { kind: 'texture', texture: 'white_plaster_02', tint: '#a9b29b' },
    provenance: 'asset-library',
    spec: { surface: { texture: 'white_plaster_02', tileSize: 1.6, tint: '#b2baa4', roughness: 1, normalScale: 0.4 } },
  },
  {
    id: 'clay-plaster',
    name: 'Terracotta clay plaster',
    description: 'Textured natural clay plaster in a sun-baked terracotta.',
    swatch: { kind: 'texture', texture: 'beige_wall_002', tint: '#c98d70' },
    provenance: 'asset-library',
    spec: { surface: { texture: 'beige_wall_002', tileSize: 2.2, tint: '#c98d70', roughness: 1, normalScale: 0.6 } },
  },
  {
    id: 'ink-blue',
    name: 'Ink blue',
    description: 'A deep, enveloping blue-black eggshell for a cocooning room.',
    swatch: { kind: 'color', value: '#36404d' },
    provenance: 'asset-library',
    spec: { surface: { texture: 'plastered_wall_04', tileSize: 3.2, tint: '#4a5564', roughness: 0.8, normalScale: 0.25 } },
  },
  {
    id: 'oak-fluted',
    name: 'Fluted oak feature wall',
    description: 'Vertical oak fluting behind the sofa; other walls in chalk white.',
    swatch: { kind: 'texture', texture: 'oak_veneer_01', tint: '#e8d2b8' },
    provenance: 'studio-modelled',
    spec: {
      surface: { texture: 'plastered_wall_04', tileSize: 3.2, tint: '#f0ebe3', roughness: 1, normalScale: 0.3 },
      fluted: { texture: 'oak_veneer_01', tileSize: 1.83, tint: '#d6c6b4', roughness: 1 },
    },
  },
]

const rugs: RugOption[] = [
  {
    id: 'ivory-boucle',
    name: 'Ivory bouclé',
    description: 'Thick looped wool, 280 × 200 cm, in soft ivory.',
    swatch: { kind: 'texture', texture: 'curly_teddy_natural', tint: '#e9e1d3' },
    provenance: 'studio-modelled',
    spec: { kind: 'rug', shape: 'rect', width: 2.8, depth: 2.0, surface: boucle('#e9e1d3') },
  },
  {
    id: 'jute-round',
    name: 'Round jute',
    description: 'Hand-braided natural jute, 220 cm diameter.',
    swatch: { kind: 'texture', texture: 'hessian_380', tint: '#cdb38c' },
    provenance: 'studio-modelled',
    spec: {
      kind: 'rug',
      shape: 'round',
      width: 2.2,
      depth: 2.2,
      surface: { texture: 'hessian_380', tileSize: 0.14, tint: '#cdb38c', roughness: 1, normalScale: 1.4 },
    },
  },
  {
    id: 'charcoal-herringbone',
    name: 'Charcoal herringbone',
    description: 'Flat-woven wool herringbone, 300 × 200 cm.',
    swatch: { kind: 'texture', texture: 'poly_wool_herringbone', tint: '#5d5b5a' },
    provenance: 'studio-modelled',
    spec: {
      kind: 'rug',
      shape: 'rect',
      width: 3.0,
      depth: 2.0,
      surface: { texture: 'poly_wool_herringbone', tileSize: 0.2, tint: '#626060', roughness: 1, normalScale: 1, sheen: 0.4 },
    },
  },
  {
    id: 'rust-wool',
    name: 'Rust wool, bound edge',
    description: 'Dense felted wool in burnt rust with a cream bound edge, 240 × 170 cm.',
    swatch: { kind: 'texture', texture: 'caban', tint: '#b3633f' },
    provenance: 'studio-modelled',
    spec: {
      kind: 'rug',
      shape: 'rect',
      width: 2.4,
      depth: 1.7,
      surface: { texture: 'caban', tileSize: 0.25, tint: '#b3633f', roughness: 1, normalScale: 0.8, sheen: 0.45 },
      border: '#e8dfcf',
    },
  },
  {
    id: 'no-rug',
    name: 'No rug',
    description: 'Leave the floor bare to show off the finish.',
    swatch: { kind: 'none' },
    provenance: 'studio-modelled',
    spec: { kind: 'none' },
  },
]

export const GROUPS: { [G in GroupId]: GroupDefinition<G> } = {
  sofa: { id: 'sofa', label: 'Sofa', noun: 'the sofa', options: sofas },
  coffeeTable: { id: 'coffeeTable', label: 'Coffee table', noun: 'the coffee table', options: coffeeTables },
  flooring: { id: 'flooring', label: 'Flooring', noun: 'the floor', options: floors },
  wallFinish: { id: 'wallFinish', label: 'Walls', noun: 'the walls', options: walls },
  rug: { id: 'rug', label: 'Rug', noun: 'the rug', options: rugs },
}

export function getOption<G extends GroupId>(group: G, id: string) {
  return (GROUPS[group].options as { id: string }[]).find((o) => o.id === id) as
    | GroupDefinition<G>['options'][number]
    | undefined
}
