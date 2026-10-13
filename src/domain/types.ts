export const GROUP_IDS = ['sofa', 'coffeeTable', 'flooring', 'wallFinish', 'rug'] as const
export type GroupId = (typeof GROUP_IDS)[number]

/** A client's selection: stable option IDs only — never scene data. */
export interface Configuration {
  templateId: string
  sofa: string
  coffeeTable: string
  flooring: string
  wallFinish: string
  rug: string
}

/** A tiling PBR surface from /assets/textures/<id>/{color,normal,rough}.webp */
export interface SurfaceSpec {
  texture: string
  /** Real-world size of one texture tile in metres. */
  tileSize: number
  /** Multiplied into the colour map (hex). */
  tint: string
  roughness?: number
  normalScale?: number
  /** Textile sheen (0–1): soft grazing-angle glow that makes fabric read as fabric, not plastic. */
  sheen?: number
  /** Rotate the texture 90° (e.g. to run floorboards along the room). */
  rotate?: boolean
}

export type SofaSpec =
  | { kind: 'modular'; layout: 'straight' | 'corner'; fabric: SurfaceSpec; legs: string }
  | { kind: 'gltf'; url: string; variant: string }

export type CoffeeTableSpec =
  | { kind: 'gltf'; url: string; rotationY: number }
  | { kind: 'plinth'; surface: SurfaceSpec; width: number; depth: number; height: number }

export interface FloorSpec {
  surface: SurfaceSpec
}

export interface WallSpec {
  surface: SurfaceSpec
  /** Adds vertical oak fluting on the feature (back) wall. */
  fluted?: SurfaceSpec
}

export type RugSpec =
  | { kind: 'none' }
  | {
      kind: 'rug'
      shape: 'rect' | 'round'
      width: number
      depth: number
      surface: SurfaceSpec
      border?: string
    }

export type Swatch =
  | { kind: 'color'; value: string }
  | { kind: 'texture'; texture: string; tint: string }
  | { kind: 'none' }

export type Provenance = 'studio-modelled' | 'asset-library'

interface OptionBase {
  id: string
  name: string
  /** One-line material/character note shown under the selection. */
  description: string
  swatch: Swatch
  provenance: Provenance
}

export interface SofaOption extends OptionBase { spec: SofaSpec }
export interface CoffeeTableOption extends OptionBase { spec: CoffeeTableSpec }
export interface FloorOption extends OptionBase { spec: FloorSpec }
export interface WallOption extends OptionBase { spec: WallSpec }
export interface RugOption extends OptionBase { spec: RugSpec }

export interface OptionsByGroup {
  sofa: SofaOption
  coffeeTable: CoffeeTableOption
  flooring: FloorOption
  wallFinish: WallOption
  rug: RugOption
}

export type AnyOption = OptionsByGroup[GroupId]

export interface GroupDefinition<G extends GroupId = GroupId> {
  id: G
  label: string
  /** Short noun used in sentences, e.g. "the sofa". */
  noun: string
  options: OptionsByGroup[G][]
}

export interface RoomTemplate {
  id: string
  name: string
  defaults: Omit<Configuration, 'templateId'>
}
