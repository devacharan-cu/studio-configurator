import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Draws its static children as one mesh per material. Joinery is built from many small parts (a window
 * is ~9 boxes); drawn one by one they were half the draw calls of a two-storey house (measured: P3-M5).
 * The children stay mounted, hidden and unpickable, so they remain plain declarative JSX; the merged
 * meshes take over drawing and picking. `signature` must change whenever the children's shape does.
 */
export function MergedParts({ signature, children }: { signature: string; children: ReactNode }) {
  const src = useRef<THREE.Group>(null)
  const [merged, setMerged] = useState<THREE.Mesh[]>([])

  useLayoutEffect(() => {
    const root = src.current
    if (!root) return
    root.updateWorldMatrix(true, true)
    const toLocal = root.matrixWorld.clone().invert()
    const byMaterial = new Map<THREE.Material, { parts: THREE.BufferGeometry[]; shadow: boolean }>()
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || Array.isArray(m.material)) return
      // invisible helpers (e.g. a passage's pick volume) keep their own behaviour; parts hidden by an
      // earlier merge are merged again
      if (!m.visible && !m.userData.mergedPart) return
      m.userData.mergedPart = true
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
      g.applyMatrix4(toLocal.clone().multiply(m.matrixWorld))
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name)
      const bucket = byMaterial.get(m.material) ?? { parts: [], shadow: false }
      bucket.parts.push(g)
      bucket.shadow ||= m.castShadow
      byMaterial.set(m.material, bucket)
      m.visible = false
      m.raycast = () => undefined
    })
    const meshes = [...byMaterial].map(([material, { parts, shadow }]) => {
      const mesh = new THREE.Mesh(mergeGeometries(parts) ?? new THREE.BufferGeometry(), material)
      for (const p of parts) p.dispose()
      mesh.castShadow = shadow
      mesh.receiveShadow = true
      return mesh
    })
    setMerged(meshes)
    return () => {
      for (const m of meshes) m.geometry.dispose()
    }
  }, [signature])

  return (
    <>
      <group ref={src}>{children}</group>
      {merged.map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
    </>
  )
}
