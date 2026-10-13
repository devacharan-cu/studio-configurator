import { CameraControls, type CameraControlsImpl } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { ROOM } from './layout'
import { VIEWS } from './views'

/**
 * Orbit / zoom / pan camera with smooth transitions to named views.
 * The orbit target is boxed inside the room and the camera can't dip below the floor,
 * so clients can explore freely without getting lost.
 */
export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null)
  const view = useStore((s) => s.view)
  const getThree = useThree((s) => s.get)

  useEffect(() => {
    const controls = ref.current
    if (!controls) return
    controls.setBoundary(
      new THREE.Box3(new THREE.Vector3(ROOM.minX + 0.3, 0, ROOM.backZ + 0.3), new THREE.Vector3(ROOM.maxX - 0.3, 2.2, ROOM.frontZ)),
    )
  }, [])

  useEffect(() => {
    const controls = ref.current
    if (!controls) return
    const v = VIEWS[view.id]
    const [px, py, pz] = v.position
    const [tx, ty, tz] = v.target
    // Views are composed for a 16:10 viewport; narrower viewports step back along the view ray to keep
    // the same width in frame. Measured only when a view is requested, so resizing never yanks the camera.
    const { width, height } = getThree().size
    const fit = Math.min(1.9, Math.max(1, 1.6 / (width / Math.max(1, height))) ** 0.85)
    const k = view.id === 'plan' ? Math.max(1, fit * 0.9) : fit
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    controls.setLookAt(tx + (px - tx) * k, ty + (py - ty) * k, tz + (pz - tz) * k, tx, ty, tz, view.nonce > 0 && !reduceMotion)
  }, [view, getThree])

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={0.9}
      maxDistance={11}
      maxPolarAngle={Math.PI * 0.49}
      minPolarAngle={0}
      dollyToCursor
      smoothTime={0.45}
      draggingSmoothTime={0.12}
    />
  )
}
