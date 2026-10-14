import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { arrivalHeading, colliderCache, currentRoom, furnishedLevels, moveWithCollisions, SIGHT_ITEM_HEIGHT, spawnPoint, walkFloor, walkStep } from '../../engine/walk'
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
  const goto = useEditor((s) => s.walk.goto)
  const getThree = useThree((s) => s.get)
  // colliders per floor, built on first use (a walk usually stays on one or two floors)
  const colliders = useMemo(() => colliderCache(project), [project])
  const sight = useMemo(() => colliderCache(project, SIGHT_ITEM_HEIGHT), [project])
  useNavInput()

  const state = useRef({ x: 0, y: 0, level: '', stair: null as string | null, floor: 0, yaw: 0, pitch: -0.04, vx: 0, vy: 0, t: 0, from: new THREE.Vector3(), fromQ: new THREE.Quaternion(), fromFov: 45, lastHud: 0 })

  // Enter: on the floor being edited, at the front door (or in the hall), looking down the most open
  // direction; glide in from the current camera.
  useEffect(() => {
    const s = state.current
    const level = useEditor.getState().level
    const start = spawnPoint(project, level) ?? { x: 0, y: 0 }
    const q = moveWithCollisions(start, { x: 0, y: 0 }, RADIUS, colliders(level))
    s.x = q.x
    s.y = q.y
    s.level = level
    s.stair = null
    s.floor = project.levels[level]?.elevation ?? 0
    s.yaw = arrivalHeading(project, level, q, sight(level))
    s.pitch = -0.04
    s.vx = s.vy = 0
    s.t = 0
    const camera = getThree().camera as THREE.PerspectiveCamera
    s.from.copy(camera.position)
    s.fromQ.copy(camera.quaternion)
    s.fromFov = camera.fov
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Teleport ("go to room"): arrive at the room's entrance, facing in.
  useEffect(() => {
    if (!goto) return
    const s = state.current
    const level = goto.level && project.levels[goto.level] ? goto.level : s.level
    const q = moveWithCollisions({ x: goto.x, y: goto.y }, { x: 0, y: 0 }, RADIUS, colliders(level))
    s.x = q.x
    s.y = q.y
    s.level = level
    s.stair = null
    s.floor = project.levels[level]?.elevation ?? 0
    s.vx = s.vy = 0
    s.yaw = goto.yaw ?? arrivalHeading(project, level, q, sight(level))
    s.pitch = -0.04
    useEditor.getState().setLevel(level)
  }, [goto]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const next = walkStep(project, { x: s.x, y: s.y, level: s.level, stair: s.stair }, { x: s.vx * dt, y: s.vy * dt }, RADIUS, colliders)
      if (next.level !== s.level) useEditor.getState().setLevel(next.level)
      s.level = next.level
      s.stair = next.stair
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
    // the floor height follows the steps smoothly (no jolt at each riser)
    s.floor += (walkFloor(project, { x: s.x, y: s.y, level: s.level, stair: s.stair }) - s.floor) * approach(14, dt)
    targetP.set(s.x, s.floor + EYE_HEIGHT, s.y)
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
      const room = s.stair ? null : currentRoom(project, s.level, { x: s.x, y: s.y })
      useEditor.getState().setWalkRoom(s.stair ? 'Stairs' : (room?.name ?? null))
      useEditor.getState().setWalkFurnished(furnishedLevels(project, { x: s.x, y: s.y, level: s.level, stair: s.stair }))
      const hud = document.querySelector('[data-testid=walk-hud]')
      hud?.setAttribute('data-walk-pos', `${s.x.toFixed(2)},${s.y.toFixed(2)}`)
      hud?.setAttribute('data-walk-level', s.level)
      hud?.setAttribute('data-walk-height', s.floor.toFixed(2))
      hud?.setAttribute('data-walk-look', `${s.yaw.toFixed(3)},${s.pitch.toFixed(3)}`)
      hud?.setAttribute('data-walk-speed', Math.hypot(s.vx, s.vy).toFixed(2))
    }
  })
  return null
}
