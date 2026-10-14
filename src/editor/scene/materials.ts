import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { EXTERIOR_FINISH, FLOOR_FINISHES, WALL_FINISHES, type FinishDef } from '../../engine/assets/finishes'

/**
 * Materials are shared by finish id across every mesh (one material per finish, not per wall), so a
 * whole house uses a handful of materials and textures regardless of how many walls it has.
 * Geometry carries UVs in metres; textures repeat at 1 / tileSize.
 */

const paths = (t: string) => [`/assets/textures/${t}/color.webp`, `/assets/textures/${t}/normal.webp`, `/assets/textures/${t}/rough.webp`]
const ALL = [...FLOOR_FINISHES, ...WALL_FINISHES, EXTERIOR_FINISH]
const TEXTURES = [...new Set(ALL.map((f) => f.texture).concat(['rough_linen', 'curly_teddy_natural', 'oak_veneer_01']))]

export function preloadFinishTextures() {
  for (const t of TEXTURES) useTexture.preload(paths(t))
}

const cache = new Map<string, THREE.MeshStandardMaterial>()

function build(f: FinishDef, maps: THREE.Texture[], extra?: Partial<THREE.MeshStandardMaterialParameters>) {
  const [color, normal, rough] = maps.map((t, i) => {
    const c = t.clone()
    c.wrapS = c.wrapT = THREE.RepeatWrapping
    c.repeat.set(1 / f.tileSize, 1 / f.tileSize)
    c.rotation = f.rotate ? Math.PI / 2 : 0
    c.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace
    c.anisotropy = 8
    c.needsUpdate = true
    return c
  })
  const ns = f.normalScale ?? 1
  return new THREE.MeshStandardMaterial({
    map: color,
    normalMap: normal,
    roughnessMap: rough,
    color: new THREE.Color(f.tint),
    roughness: f.roughness ?? 1,
    metalness: 0,
    normalScale: new THREE.Vector2(ns, ns),
    ...extra,
  })
}

/** Material for a finish (floor, wall or exterior). Suspends until its textures are loaded. */
export function useFinishMaterial(f: FinishDef, key: string = f.id): THREE.MeshStandardMaterial {
  const maps = useTexture(paths(f.texture))
  return useMemo(() => {
    const hit = cache.get(key)
    if (hit) return hit
    const m = build(f, maps)
    cache.set(key, m)
    return m
  }, [f, maps, key])
}

/** All wall finishes at once (walls need one per side), keyed by finish id. */
export function useWallMaterials() {
  const textures = useTexture([...WALL_FINISHES, EXTERIOR_FINISH].flatMap((f) => paths(f.texture)))
  return useMemo(() => {
    const out = new Map<string, THREE.MeshStandardMaterial>()
    ;[...WALL_FINISHES, EXTERIOR_FINISH].forEach((f, i) => {
      const key = `wall:${f.id}`
      let m = cache.get(key)
      if (!m) {
        m = build(f, textures.slice(i * 3, i * 3 + 3), { side: THREE.FrontSide })
        cache.set(key, m)
      }
      out.set(f.id, m)
    })
    return out
  }, [textures])
}

export function useFloorMaterials() {
  const textures = useTexture(FLOOR_FINISHES.flatMap((f) => paths(f.texture)))
  return useMemo(() => {
    const out = new Map<string, THREE.MeshStandardMaterial>()
    FLOOR_FINISHES.forEach((f, i) => {
      const key = `floor:${f.id}`
      let m = cache.get(key)
      if (!m) {
        m = build(f, textures.slice(i * 3, i * 3 + 3))
        cache.set(key, m)
      }
      out.set(f.id, m)
    })
    return out
  }, [textures])
}

/** Plain shared materials for trims, frames, glass and generic fixtures. */
export const MATS = {
  trim: new THREE.MeshStandardMaterial({ color: '#f1ede6', roughness: 0.85 }),
  wallTop: new THREE.MeshStandardMaterial({ color: '#3a3430', roughness: 0.9 }),
  frame: new THREE.MeshStandardMaterial({ color: '#2e2b28', roughness: 0.4, metalness: 0.6 }),
  oak: new THREE.MeshStandardMaterial({ color: '#c9ab88', roughness: 0.6 }),
  walnut: new THREE.MeshStandardMaterial({ color: '#5d4231', roughness: 0.5 }),
  door: new THREE.MeshStandardMaterial({ color: '#f0ece5', roughness: 0.55 }),
  frontDoor: new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.5 }),
  sill: new THREE.MeshStandardMaterial({ color: '#d9d3c7', roughness: 0.7 }),
  // no transmission pass (it re-renders the scene): a thin, reflective, partly transparent pane instead
  glass: new THREE.MeshPhysicalMaterial({ color: '#d4e1e3', roughness: 0.03, metalness: 0, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.6, transparent: true, opacity: 0.28, depthWrite: false }),
  ceramic: new THREE.MeshStandardMaterial({ color: '#f6f5f2', roughness: 0.25 }),
  steel: new THREE.MeshStandardMaterial({ color: '#b9b9b6', roughness: 0.3, metalness: 0.9 }),
  counter: new THREE.MeshStandardMaterial({ color: '#e8e3da', roughness: 0.35 }),
  cabinet: new THREE.MeshStandardMaterial({ color: '#56604f', roughness: 0.55 }),
  selection: new THREE.MeshBasicMaterial({ color: '#c0623c', transparent: true, opacity: 0.35, depthWrite: false }),
}
