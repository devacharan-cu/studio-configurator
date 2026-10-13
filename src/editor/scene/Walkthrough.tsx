import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { bestHeading, buildColliders, currentRoom, moveWithCollisions, spawnPoint } from '../../engine/walk'
import { useEditor, useProject } from '../store'
import { useNavInput } from './useNavInput'
import { approach, keyIntent, walkInput } from './walkInput'

export const EYE_HEIGHT = 1.6
export const RADIUS = 0.25
/** Vertical field of view at human scale: ~90° horizontally on a 16:10 screen. */
export const WALK_FOV = 62
export const MAX_PITCH = (85 * Math.PI) / 180
const RUN_FACTOR = 2.2
const ACCEL = 9 // 1/s — reach walking pace in ~0.3 s
const DECEL = 12 // stop a little quicker than you start
const TRANSITION = 0.8 // s

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/**
 * Grounded first-person walkthrough. The visitor is a circle in plan space resolved against the
 * engine's colliders, which are built from the building model itself (walls with gaps only where
 * doors and passages are, solid furniture). Movement is velocity-based with frame-rate-independent
 * acceleration, swept in sub-steps so even running can't tunnel through a wall. Yaw is unrestricted,
 * pitch is ±85°, and the camera never rolls (Euler YXZ with z = 0).
 */
export function Walkthrough() {
  const project = useProject()
  const level = useEditor((s) => s.level)
  const goto = useEditor((s) => s.walk.goto)
  const getThree = useThree((s) => s.get)
  const lv = project.levels[level]
  const colliders = useMemo(() => buildColliders(project, level), [project, level])
  /** Arrival views look into the home, not out through an open front door. */
  const indoors = (q: { x: number; y: number }) => !!currentRoom(project, level, q)
  useNavInput()

  const state = useRef({ x: 0, y: 0, yaw: 0, pitch: -0.04, vx: 0, vy: 0, t: 0, from: new THREE.Vector3(), fromQ: new THREE.Quaternion(), fromFov: 45, lastHud: 0 })

  // Enter: start in the hall (or first room), looking down its most open direction; glide in from the current camera.
  useEffect(() => {
    const s = state.current
    const start = spawnPoint(project, level) ?? { x: 0, y: 0 }
    const q = moveWithCollisions(start, { x: 0, y: 0 }, RADIUS, colliders)
    s.x = q.x
    s.y = q.y
    s.yaw = bestHeading(q, RADIUS, colliders, indoors)
    s.pitch = -0.04
    s.vx = s.vy = 0
    s.t = 0
    const camera = getThree().camera as THREE.PerspectiveCamera
    s.from.copy(camera.position)
    s.fromQ.copy(camera.quaternion)
    s.fromFov = camera.fov
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Teleport ("go to room"): arrive facing into the room.
  useEffect(() => {
    if (!goto) return
    const s = state.current
    const q = moveWithCollisions({ x: goto.x, y: goto.y }, { x: 0, y: 0 }, RADIUS, colliders)
    s.x = q.x
    s.y = q.y
    s.vx = s.vy = 0
    s.yaw = bestHeading(q, RADIUS, colliders, indoors)
    s.pitch = -0.04
  }, [goto, colliders]) // eslint-disable-line react-hooks/exhaustive-deps

  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), [])
  const targetQ = useMemo(() => new THREE.Quaternion(), [])
  const targetP = useMemo(() => new THREE.Vector3(), [])

  useFrame((three, rawDt) => {
    const camera = three.camera as THREE.PerspectiveCamera
    const dt = Math.min(rawDt, 0.05)
    const s = state.current
    const k = walkInput.keys
    const nav = useEditor.getState().nav
    // look
    s.yaw = wrap(s.yaw + walkInput.look.yaw)
    s.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, s.pitch + walkInput.look.pitch))
    walkInput.look.yaw = 0
    walkInput.look.pitch = 0
    walkInput.wheel = 0
    if (k.has('arrowleft')) s.yaw += 1.8 * dt * nav.look
    if (k.has('arrowright')) s.yaw -= 1.8 * dt * nav.look
    // movement intent in the visitor's frame → plan-space target velocity
    const intent = keyIntent(k)
    let fwd = walkInput.move.y + intent.f
    let str = walkInput.move.x + intent.s
    const mag = Math.hypot(fwd, str)
    if (mag > 1) {
      fwd /= mag
      str /= mag
    }
    const ready = s.t >= TRANSITION
    const speed = ready ? nav.walkSpeed * (k.has('shift') || walkInput.run ? RUN_FACTOR : 1) : 0
    const sin = Math.sin(s.yaw)
    const cos = Math.cos(s.yaw)
    const tvx = (-sin * fwd + cos * str) * speed
    const tvy = (-cos * fwd - sin * str) * speed
    const a = approach(fwd || str ? ACCEL : DECEL, dt)
    s.vx += (tvx - s.vx) * a
    s.vy += (tvy - s.vy) * a
    if (Math.hypot(s.vx, s.vy) > 1e-3) {
      const next = moveWithCollisions({ x: s.x, y: s.y }, { x: s.vx * dt, y: s.vy * dt }, RADIUS, colliders)
      // sliding along a wall keeps the tangential part of the velocity; walking into it stops you
      if (dt > 0) {
        s.vx = (next.x - s.x) / dt
        s.vy = (next.y - s.y) / dt
      }
      s.x = next.x
      s.y = next.y
    } else {
      s.vx = s.vy = 0
    }
    // camera
    euler.set(s.pitch, s.yaw, 0)
    targetQ.setFromEuler(euler)
    targetP.set(s.x, (lv?.elevation ?? 0) + EYE_HEIGHT, s.y)
    if (s.t < TRANSITION) {
      s.t += dt
      const u = Math.min(1, s.t / TRANSITION)
      const e = u * u * (3 - 2 * u)
      camera.position.lerpVectors(s.from, targetP, e)
      camera.quaternion.slerpQuaternions(s.fromQ, targetQ, e)
      camera.fov = s.fromFov + (WALK_FOV - s.fromFov) * e
      camera.updateProjectionMatrix()
    } else {
      camera.position.copy(targetP)
      camera.quaternion.copy(targetQ)
      if (camera.fov !== WALK_FOV) {
        camera.fov = WALK_FOV
        camera.updateProjectionMatrix()
      }
    }
    // HUD (throttled): current room, position and heading for the overlay, accessibility and tests
    s.lastHud += dt
    if (s.lastHud > 0.15) {
      s.lastHud = 0
      const room = currentRoom(project, level, { x: s.x, y: s.y })
      useEditor.getState().setWalkRoom(room?.name ?? null)
      const hud = document.querySelector('[data-testid=walk-hud]')
      hud?.setAttribute('data-walk-pos', `${s.x.toFixed(2)},${s.y.toFixed(2)}`)
      hud?.setAttribute('data-walk-look', `${s.yaw.toFixed(3)},${s.pitch.toFixed(3)}`)
      hud?.setAttribute('data-walk-speed', Math.hypot(s.vx, s.vy).toFixed(2))
    }
  })
  return null
}
