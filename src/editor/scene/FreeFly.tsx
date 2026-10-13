import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useEditor } from '../store'
import { useNavInput } from './useNavInput'
import { approach, keyIntent, walkInput } from './walkInput'
import { WALK_FOV } from './Walkthrough'

const MAX_PITCH = (89 * Math.PI) / 180
const FAST = 3
const ACCEL = 7
const MIN_Y = 0.12 // never below the ground plane
const GOTO = 0.9 // s

/**
 * Free camera for architectural inspection: no collisions and no gravity. WASD moves along the
 * view direction (so looking up and pressing W rises towards the ceiling), E/Space and Q/C move
 * straight up and down, Shift is faster, and the mouse wheel changes the base speed. It starts from
 * wherever the orbit camera was, so switching modes never jumps.
 */
export function FreeFly() {
  const getThree = useThree((s) => s.get)
  const flyTo = useEditor((s) => s.flyTo)
  useNavInput()
  const state = useRef({ yaw: 0, pitch: 0, lastHud: 0, go: null as null | { from: THREE.Vector3; to: THREE.Vector3; fromYaw: number; toYaw: number; fromPitch: number; toPitch: number; t: number } })

  useEffect(() => {
    const e = new THREE.Euler().setFromQuaternion(getThree().camera.quaternion, 'YXZ')
    state.current.yaw = e.y
    state.current.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, e.x))
    tmp.current.vel.set(0, 0, 0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Viewpoint requests glide the camera (shortest way round in yaw).
  useEffect(() => {
    if (!flyTo) return
    const s = state.current
    const dy = Math.atan2(Math.sin(flyTo.yaw - s.yaw), Math.cos(flyTo.yaw - s.yaw))
    s.go = { from: getThree().camera.position.clone(), to: new THREE.Vector3(...flyTo.pos), fromYaw: s.yaw, toYaw: s.yaw + dy, fromPitch: s.pitch, toPitch: flyTo.pitch, t: 0 }
    tmp.current.vel.set(0, 0, 0)
  }, [flyTo, getThree])

  // scratch objects, reused every frame
  const tmp = useRef({ euler: new THREE.Euler(0, 0, 0, 'YXZ'), fwd: new THREE.Vector3(), right: new THREE.Vector3(), target: new THREE.Vector3(), vel: new THREE.Vector3() })

  useFrame((three, rawDt) => {
    const camera = three.camera as THREE.PerspectiveCamera
    const dt = Math.min(rawDt, 0.05)
    const s = state.current
    const { euler, fwd, right, target, vel } = tmp.current
    const st = useEditor.getState()
    const nav = st.nav
    if (walkInput.wheel) {
      // wheel up = faster, geometric steps
      st.setNav({ flySpeed: Math.min(20, Math.max(0.5, +(nav.flySpeed * Math.pow(1.2, -walkInput.wheel)).toFixed(2))) })
      walkInput.wheel = 0
    }
    s.yaw += walkInput.look.yaw
    s.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, s.pitch + walkInput.look.pitch))
    walkInput.look.yaw = 0
    walkInput.look.pitch = 0
    const k = walkInput.keys
    if (k.has('arrowleft')) s.yaw += 1.8 * dt * nav.look
    if (k.has('arrowright')) s.yaw -= 1.8 * dt * nav.look

    if (s.go) {
      // scripted glide to a viewpoint; any movement key takes over
      s.go.t += dt
      const u = Math.min(1, s.go.t / GOTO)
      const e = u * u * (3 - 2 * u)
      camera.position.lerpVectors(s.go.from, s.go.to, e)
      s.yaw = s.go.fromYaw + (s.go.toYaw - s.go.fromYaw) * e
      s.pitch = s.go.fromPitch + (s.go.toPitch - s.go.fromPitch) * e
      if (u >= 1 || k.size) s.go = null
    } else {
      const intent = keyIntent(k)
      const f = intent.f + walkInput.move.y
      const r = intent.s + walkInput.move.x
      const v = intent.v + walkInput.vertical
      euler.set(s.pitch, s.yaw, 0)
      fwd.set(0, 0, -1).applyEuler(euler)
      right.set(1, 0, 0).applyEuler(euler)
      const speed = nav.flySpeed * (k.has('shift') || walkInput.run ? FAST : 1)
      target.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, r)
      target.setY(target.y + v)
      if (target.lengthSq() > 1) target.normalize()
      target.multiplyScalar(speed)
      vel.lerp(target, approach(ACCEL, dt))
      camera.position.addScaledVector(vel, dt)
      if (camera.position.y < MIN_Y) {
        camera.position.y = MIN_Y
        vel.setY(Math.max(0, vel.y))
      }
    }
    euler.set(s.pitch, s.yaw, 0)
    camera.quaternion.setFromEuler(euler)
    if (Math.abs(camera.fov - WALK_FOV) > 0.01) {
      camera.fov += (WALK_FOV - camera.fov) * approach(6, dt)
      camera.updateProjectionMatrix()
    }

    s.lastHud += dt
    if (s.lastHud > 0.15) {
      s.lastHud = 0
      const hud = document.querySelector('[data-testid=fly-hud]')
      const p = camera.position
      hud?.setAttribute('data-fly-pos', `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`)
      hud?.setAttribute('data-fly-look', `${s.yaw.toFixed(3)},${s.pitch.toFixed(3)}`)
      const h = document.querySelector('[data-testid=fly-height]')
      if (h) h.textContent = `${p.y.toFixed(1)} m above ground`
    }
  })
  return null
}
