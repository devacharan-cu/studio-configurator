import { useTexture } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { QUALITY, type Quality } from './quality'

/** Lighting copy of Poly Haven "Meadow 2" (CC0) with the sun disc clamped out — the sun is a real light. */
const SKY_HDR = '/assets/env/meadow_2_ibl_1k.hdr'

/** Direction to the sun in the HDRI (pixel u = 0.600, v = 0.350 → azimuth 36°, elevation 27°). */
export const SUN_DIR = new THREE.Vector3(0.721, 0.454, 0.524).normalize()

export function useSkyTextures(backgroundUrl: string) {
  const hdr = useLoader(HDRLoader, SKY_HDR)
  const jpg = useTexture(backgroundUrl)
  return useMemo(() => {
    const environment = hdr.clone()
    environment.mapping = THREE.EquirectangularReflectionMapping
    environment.needsUpdate = true
    const background = jpg.clone()
    background.mapping = THREE.EquirectangularReflectionMapping
    background.colorSpace = THREE.SRGBColorSpace
    background.needsUpdate = true
    return { environment, background }
  }, [hdr, jpg])
}

export function preloadSky(quality: Quality) {
  useLoader.preload(HDRLoader, SKY_HDR)
  useTexture.preload(QUALITY[quality].background)
}
