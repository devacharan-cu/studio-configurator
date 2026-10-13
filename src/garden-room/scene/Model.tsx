import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { ContactShadow } from './ContactShadow'
import { useModel } from './models'

interface VariantMapping {
  material: number
  variants: number[]
}

/**
 * Renders a glTF asset: cloned (the cache is shared), rested on the floor, centred on X/Z,
 * shadows on, embedded lights removed. Optionally selects a KHR_materials_variants variant by name.
 */
export function Model({
  url,
  variant,
  rotationY = 0,
  align = 'center',
  shadow = true,
}: {
  url: string
  variant?: string
  rotationY?: number
  /** 'back' puts the object's back face at z = 0 (for pieces placed against a wall). */
  align?: 'center' | 'back'
  /** Soft contact shadow sized to the model's footprint. */
  shadow?: boolean
}) {
  const gltf = useModel(url)

  const { pivot: object, footprint } = useMemo(() => {
    const root = gltf.scene.clone(true)
    const lights: THREE.Object3D[] = []
    root.traverse((o) => {
      if ((o as THREE.Light).isLight) lights.push(o)
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    lights.forEach((l) => l.removeFromParent())

    const pivot = new THREE.Group()
    pivot.add(root)
    root.rotation.y = rotationY
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    const centre = box.getCenter(new THREE.Vector3())
    root.position.set(-centre.x, -box.min.y, align === 'back' ? -box.min.z : -centre.z)
    const size = box.getSize(new THREE.Vector3())
    return { pivot, footprint: { w: size.x, d: size.z, z: align === 'back' ? size.z / 2 : 0 } }
  }, [gltf, rotationY, align])

  // Variant materials resolve asynchronously; keep the object hidden until the right fabric is applied
  // so the client never sees a flash of the wrong colourway.
  const [ready, setReady] = useState(!variant)
  useEffect(() => {
    if (!variant) return
    let cancelled = false
    const ext = gltf.userData?.gltfExtensions?.KHR_materials_variants as { variants: { name: string }[] } | undefined
    const index = ext?.variants.findIndex((v) => v.name.toLowerCase() === variant.toLowerCase()) ?? -1
    const jobs: Promise<void>[] = []
    object.traverse((o) => {
      const mesh = o as THREE.Mesh
      const def = mesh.userData?.gltfExtensions?.KHR_materials_variants as { mappings: VariantMapping[] } | undefined
      if (!mesh.isMesh || !def || index < 0) return
      const mapping = def.mappings.find((m) => m.variants.includes(index))
      if (!mapping) return
      jobs.push(
        gltf.parser.getDependency('material', mapping.material).then((material: THREE.Material) => {
          if (cancelled) return
          mesh.material = material
          gltf.parser.assignFinalMaterial(mesh)
        }),
      )
    })
    Promise.all(jobs).finally(() => !cancelled && setReady(true))
    return () => {
      cancelled = true
    }
  }, [gltf, object, variant])

  return (
    <>
      <primitive object={object} visible={ready} />
      {shadow && ready && <ContactShadow width={footprint.w} depth={footprint.d} z={footprint.z} />}
    </>
  )
}
