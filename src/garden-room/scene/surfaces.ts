import { useTexture } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { SurfaceSpec } from '../domain/types'

export const texturePaths = (id: string) => [
  `/assets/textures/${id}/color.webp`,
  `/assets/textures/${id}/normal.webp`,
  `/assets/textures/${id}/rough.webp`,
]

/**
 * Builds a PBR material for a tiling surface. Geometry using it must carry UVs in metres
 * (see `boxProjectUVs` / `metricPlane`) so a texture tiles at its true physical size.
 * Suspends while textures load.
 */
export function useSurfaceMaterial(spec: SurfaceSpec, overrides?: { normalMap?: THREE.Texture | null }) {
  const [color, normal, rough] = useTexture(texturePaths(spec.texture))
  const material = useMemo(() => {
    const repeat = 1 / spec.tileSize
    const prep = (t: THREE.Texture, srgb: boolean) => {
      const c = t.clone()
      c.wrapS = c.wrapT = THREE.RepeatWrapping
      c.repeat.set(repeat, repeat)
      c.rotation = spec.rotate ? Math.PI / 2 : 0
      c.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
      c.anisotropy = 8
      c.needsUpdate = true
      return c
    }
    const ns = spec.normalScale ?? 1
    const params: THREE.MeshPhysicalMaterialParameters = {
      map: prep(color, true),
      normalMap: overrides?.normalMap ?? prep(normal, false),
      roughnessMap: prep(rough, false),
      color: new THREE.Color(spec.tint),
      roughness: spec.roughness ?? 1,
      metalness: 0,
      normalScale: new THREE.Vector2(ns, ns),
    }
    const m = spec.sheen
      ? new THREE.MeshPhysicalMaterial({
          ...params,
          sheen: spec.sheen,
          sheenRoughness: 0.75,
          sheenColor: new THREE.Color(spec.tint).lerp(new THREE.Color('#ffffff'), 0.35),
        })
      : new THREE.MeshStandardMaterial(params)
    m.shadowSide = THREE.DoubleSide
    return m
  }, [color, normal, rough, spec, overrides?.normalMap])

  useEffect(
    () => () => {
      material.map?.dispose()
      material.roughnessMap?.dispose()
      if (material.normalMap !== overrides?.normalMap) material.normalMap?.dispose()
      material.dispose()
    },
    [material, overrides?.normalMap],
  )
  return material
}

/**
 * Replace a geometry's UVs with a box projection in world units (metres): each vertex is
 * projected onto the plane its normal faces most. Lets fabrics and stone tile at true scale
 * across rounded boxes without per-face stretching.
 */
export function boxProjectUVs(geometry: THREE.BufferGeometry, offset = new THREE.Vector3()) {
  const pos = geometry.getAttribute('position')
  const nrm = geometry.getAttribute('normal')
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + offset.x
    const y = pos.getY(i) + offset.y
    const z = pos.getZ(i) + offset.z
    const ax = Math.abs(nrm.getX(i))
    const ay = Math.abs(nrm.getY(i))
    const az = Math.abs(nrm.getZ(i))
    if (ay >= ax && ay >= az) {
      uv[i * 2] = x
      uv[i * 2 + 1] = z
    } else if (ax >= az) {
      uv[i * 2] = z
      uv[i * 2 + 1] = y
    } else {
      uv[i * 2] = x
      uv[i * 2 + 1] = y
    }
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geometry
}

/** A plane whose UVs are in metres, offset so adjacent planes line up. */
export function metricPlane(width: number, height: number, u0 = 0, v0 = 0) {
  const g = new THREE.PlaneGeometry(width, height)
  const uv = g.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * width, v0 + uv.getY(i) * height)
  return g
}

/** Procedural normal map of vertical half-round flutes, for the fluted oak wall. */
export function makeFluteNormalMap(flutesPerMetre: number) {
  const w = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = 4
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const img = ctx.createImageData(w, 4)
  for (let x = 0; x < w; x++) {
    // Each texture repeat contains 8 flutes; slope of a rounded profile with a crisp groove.
    const t = ((x / w) * 8) % 1
    const slope = Math.sin((t - 0.5) * Math.PI) * 0.85
    const nx = Math.round((slope * 0.5 + 0.5) * 255)
    const nz = Math.round((Math.sqrt(1 - slope * slope) * 0.5 + 0.5) * 255)
    for (let y = 0; y < 4; y++) {
      const i = (y * w + x) * 4
      img.data[i] = nx
      img.data[i + 1] = 128
      img.data[i + 2] = nz
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.NoColorSpace
  tex.repeat.set(flutesPerMetre / 8, 1)
  return tex
}
