import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * PBR surfaces for the parametric fixtures (kitchens, bathrooms, beds, wardrobes). Every surface is a
 * real texture set (CC0 Poly Haven) so the hook count never depends on the chosen finish: painted
 * fronts use a fine plaster set at a very low normal strength, which reads as a sprayed lacquer.
 * Materials are cached by spec, so twenty cabinets share one material.
 */

export interface SurfaceSpec {
  texture: string
  tint: string
  /** Real-world tile size, metres. */
  tile: number
  roughness: number
  metalness?: number
  normalScale?: number
  /** Use the colour map (false: tint only, keeping normal/roughness detail). */
  colorMap?: boolean
}

export const SURFACES = {
  oak: { texture: 'white_oak_veneer', tint: '#ffffff', tile: 0.5, roughness: 0.55, normalScale: 0.4 },
  walnut: { texture: 'walnut_veneer', tint: '#ffffff', tile: 1.8, roughness: 0.5, normalScale: 0.4 },
  teak: { texture: 'teak_veneer', tint: '#f2e2d0', tile: 1.0, roughness: 0.5, normalScale: 0.4 },
  greyOak: { texture: 'washed_grey_oak_veneer', tint: '#ffffff', tile: 1.0, roughness: 0.6, normalScale: 0.4 },
  butcherBlock: { texture: 'kitchen_wood', tint: '#f3e3cf', tile: 0.6, roughness: 0.45, normalScale: 0.5 },
  marble: { texture: 'marble_01', tint: '#ffffff', tile: 1.6, roughness: 0.18 },
  terrazzo: { texture: 'terrazzo_tiles', tint: '#ffffff', tile: 2.0, roughness: 0.3 },
  concrete: { texture: 'brushed_concrete_2', tint: '#cfcac2', tile: 1.6, roughness: 0.5, normalScale: 0.3 },
  /** Engineered quartz worktop: fine grain, low sheen (Poly Haven's marble is a tiled floor, wrong for a slab). */
  quartz: { texture: 'brushed_concrete_2', tint: '#eeebe5', tile: 1.2, roughness: 0.22, normalScale: 0.08, colorMap: false },
  ceramic: { texture: 'plastered_wall_04', tint: '#fbfbf9', tile: 3, roughness: 0.12, normalScale: 0.02, colorMap: false },
  leatherWhite: { texture: 'leather_white', tint: '#e9e4dc', tile: 0.3, roughness: 0.55, normalScale: 0.6 },
} satisfies Record<string, SurfaceSpec>

/** A painted (lacquered) surface in any colour. */
export const paint = (tint: string, roughness = 0.42): SurfaceSpec => ({ texture: 'plastered_wall_04', tint, tile: 2.5, roughness, normalScale: 0.06, colorMap: false })
/** Upholstery: a neutral (greyscale) fabric texture tinted to the chosen colour. */
export const fabric = (tint: string, texture = 'rough_linen', tile = 0.5): SurfaceSpec => ({ texture, tint, tile, roughness: 0.95, normalScale: 0.8 })

const cache = new Map<string, THREE.MeshStandardMaterial>()
const files = (t: string) => [`/assets/textures/${t}/color.webp`, `/assets/textures/${t}/normal.webp`, `/assets/textures/${t}/rough.webp`]

export function useSurface(spec: SurfaceSpec): THREE.MeshStandardMaterial {
  const maps = useTexture(files(spec.texture))
  const key = JSON.stringify(spec)
  return useMemo(() => {
    const hit = cache.get(key)
    if (hit) return hit
    const prep = (t: THREE.Texture, srgb: boolean) => {
      const c = t.clone()
      c.wrapS = c.wrapT = THREE.RepeatWrapping
      c.repeat.set(1 / spec.tile, 1 / spec.tile)
      c.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
      c.anisotropy = 8
      c.needsUpdate = true
      return c
    }
    const ns = spec.normalScale ?? 1
    const m = new THREE.MeshStandardMaterial({
      map: spec.colorMap === false ? null : prep(maps[0], true),
      normalMap: prep(maps[1], false),
      roughnessMap: prep(maps[2], false),
      normalScale: new THREE.Vector2(ns, ns),
      color: new THREE.Color(spec.tint),
      roughness: spec.roughness,
      metalness: spec.metalness ?? 0,
    })
    cache.set(key, m)
    return m
  }, [key, maps]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Untextured shared materials: metals, glass, dark appliance surfaces. */
export const PLAIN = {
  chrome: new THREE.MeshStandardMaterial({ color: '#e8e8e6', roughness: 0.08, metalness: 1 }),
  brushedSteel: new THREE.MeshStandardMaterial({ color: '#d8d8d4', roughness: 0.42, metalness: 0.75 }),
  blackSteel: new THREE.MeshStandardMaterial({ color: '#1d1d1c', roughness: 0.35, metalness: 0.8 }),
  brass: new THREE.MeshStandardMaterial({ color: '#c8a46a', roughness: 0.25, metalness: 1 }),
  ceramicHob: new THREE.MeshStandardMaterial({ color: '#111112', roughness: 0.18, metalness: 0 }),
  burner: new THREE.MeshStandardMaterial({ color: '#4a4a4c', roughness: 0.5, metalness: 0.2 }),
  ovenGlass: new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.05, metalness: 0.3 }),
  showerGlass: new THREE.MeshPhysicalMaterial({ color: '#e6eef0', roughness: 0.02, metalness: 0, transparent: true, opacity: 0.18, depthWrite: false }),
  shadowGap: new THREE.MeshStandardMaterial({ color: '#2a2724', roughness: 0.9 }),
  linenWhite: new THREE.MeshStandardMaterial({ color: '#f4f1ec', roughness: 0.95 }),
  sinkInner: new THREE.MeshStandardMaterial({ color: '#b9bab8', roughness: 0.28, metalness: 1, side: THREE.BackSide }),
  bathInner: new THREE.MeshStandardMaterial({ color: '#f7f7f5', roughness: 0.12, side: THREE.BackSide }),
}

/**
 * Start every fixture surface download at once. A fixture uses several surfaces; fetched on demand,
 * each suspension delayed the next request (the walnut on a bed's legs was requested ~5 s late).
 */
export function preloadSurfaces() {
  const sets = new Set<string>([...Object.values(SURFACES).map((s) => s.texture), 'plastered_wall_04', 'rough_linen', 'curly_teddy_natural'])
  for (const t of sets) useTexture.preload(files(t))
}
