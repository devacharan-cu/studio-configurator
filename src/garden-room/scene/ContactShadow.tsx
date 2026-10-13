import { useMemo } from 'react'
import * as THREE from 'three'

let texture: THREE.Texture | null = null
/** One shared soft, rounded-rectangle shadow texture, stretched to each object's footprint. */
function shadowTexture() {
  if (texture) return texture
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.filter = 'blur(14px)'
    ctx.fillStyle = 'rgba(0,0,0,1)'
    ctx.beginPath()
    ctx.roundRect(26, 26, size - 52, size - 52, 18)
    ctx.fill()
  }
  texture = new THREE.CanvasTexture(c)
  return texture
}

/**
 * Cheap ambient contact shadow under a piece of furniture. Replaces screen-space AO, which caused
 * 500–700 ms GPU stalls at the start of every camera move on integrated GPUs (see docs/TESTING.md).
 * Sits just above the rug so pieces read as grounded on both rug and floor.
 */
export function ContactShadow({ width, depth, x = 0, z = 0, opacity = 0.42 }: { width: number; depth: number; x?: number; z?: number; opacity?: number }) {
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: shadowTexture(),
        color: '#1c140d',
        transparent: true,
        opacity,
        depthWrite: false,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [opacity],
  )
  // The texture's blurred edge occupies ~20% each side, so oversize the plane to keep the core under the object.
  return (
    <mesh position={[x, 0.0195, z]} rotation-x={-Math.PI / 2} material={material} renderOrder={1} raycast={() => null}>
      <planeGeometry args={[width * 1.45, depth * 1.45]} />
    </mesh>
  )
}
