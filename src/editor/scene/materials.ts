import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { finishById, getExteriorFinish, type FinishDef } from '../../engine/assets/finishes'
import type { Project } from '../../engine/model/types'

/**
 * Materials are shared by finish id across every mesh (one material per finish, not per wall), so a
 * whole house uses a handful of materials and textures regardless of how many walls it has.
 * Textures are fetched only for finishes actually in use (the library has ~30), on first use.
 * Geometry carries UVs in metres; textures repeat at 1 / tileSize.
 */

const paths = (t: string) => [`/assets/textures/${t}/color.webp`, `/assets/textures/${t}/normal.webp`, `/assets/textures/${t}/rough.webp`]
const cache = new Map<string, THREE.MeshStandardMaterial>()

/** Start fetching the textures of the finishes a project uses (floors, walls, facade) in parallel. */
export function preloadProjectFinishes(p: Project) {
  const ids = new Set<string>([getExteriorFinish(p.facade).id])
  for (const r of Object.values(p.rooms)) ids.add(r.floorFinish).add(r.wallFinish)
  for (const id of ids) {
    const f = finishById(id)
    if (f) useTexture.preload(paths(f.texture))
  }
}

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
