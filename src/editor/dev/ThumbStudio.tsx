import { Environment } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import * as THREE from 'three'
import { getAsset } from '../../engine/assets/catalog'
import { addItem } from '../../engine/commands/elements'
import { emptyProject } from '../../engine/model/project'
import type { PickHandlers } from '../scene/Building'
import { Items } from '../scene/Items'

/**
 * Development-only page (`/__studio?asset=<id>`, never in production builds) that renders one
 * catalogue asset with the editor's own renderer, for `scripts/capture-thumbnails.mjs`. Thumbnails are
 * therefore pictures of the real asset as it appears in the editor, not stock photos.
 */

const noPick: PickHandlers = { onPick: () => {}, onHover: () => {} }

function Frame({ w, d, h }: { w: number; d: number; h: number }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const box = new THREE.Box3(new THREE.Vector3(-w / 2, 0, -d / 2), new THREE.Vector3(w / 2, h, d / 2))
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    const dir = new THREE.Vector3(0.62, 0.48, 1).normalize()
    const fov = (cam.fov * Math.PI) / 180
    const dist = (sphere.radius / Math.sin(Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * (size.width / size.height))) / 2)) * 0.92
    cam.position.copy(sphere.center).addScaledVector(dir, dist)
    cam.lookAt(sphere.center)
    cam.updateProjectionMatrix()
  }, [camera, size, w, d, h])
  return null
}

function Ready() {
  useEffect(() => {
    // two frames after everything suspended has resolved
    requestAnimationFrame(() => requestAnimationFrame(() => (document.body.dataset.ready = '1')))
  }, [])
  return null
}

export default function ThumbStudio() {
  const params = new URLSearchParams(window.location.search)
  const a = getAsset(params.get('asset') ?? '')
  if (!a) return <p>Unknown asset</p>
  const base = emptyProject('studio')
  const level = Object.keys(base.levels)[0]
  const r = addItem(base, { asset: a.id, level, x: 0, y: 0, rotation: 0 })
  if (!r.ok) return <p>{r.error.message}</p>
  const project = r.project
  const { w, d, h } = a.footprint
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'transparent' }} data-testid="studio">
      <Canvas shadows="percentage" dpr={1} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 30, near: 0.01, far: 100 }} onCreated={({ gl }) => (gl.toneMapping = THREE.NeutralToneMapping)}>
        <Suspense fallback={null}>
          <Environment files="/assets/env/meadow_2_ibl_1k.hdr" environmentIntensity={0.9} />
          <directionalLight position={[2, 4, 3]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-radius={4} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} />
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <shadowMaterial opacity={0.22} />
          </mesh>
          <Items project={project} level={level} handlers={noPick} />
          <Frame w={w} d={d} h={h} />
          <Ready />
        </Suspense>
      </Canvas>
    </div>
  )
}
