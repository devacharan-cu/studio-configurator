import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { buildColliders, currentRoom, moveWithCollisions, spawnPoint } from '../../engine/walk'
import { useEditor, useProject } from '../store'
import { resetWalkInput, walkInput } from './walkInput'

export const EYE_HEIGHT = 1.6
export const RADIUS = 0.25
const WALK_SPEED = 1.4 // m/s
const RUN_SPEED = 3.0
const MAX_PITCH = (80 * Math.PI) / 180
const TRANSITION = 0.8 // s

/**
 * First-person walkthrough. The visitor is a circle in plan space resolved against the engine's
 * colliders (walls with doorway gaps, solid furniture), with the camera at eye height on the
 * current level. Looking: pointer lock when available, otherwise drag-to-look. Movement is
 * frame-rate independent and swept, so it can't tunnel through thin walls.
 */
export function Walkthrough() {
  const project = useProject()
  const level = useEditor((s) => s.level)
  const goto = useEditor((s) => s.walk.goto)
  const { camera, gl } = useThree()
  const lv = project.levels[level]
  const colliders = useMemo(() => buildColliders(project, level), [project, level])

  const state = useRef({ x: 0, y: 0, yaw: 0, pitch: -0.05, t: 0, from: new THREE.Vector3(), fromQ: new THREE.Quaternion(), lastHud: 0 })

  // Enter: start in the selected/hall room, facing into the building; animate from the orbit camera.
  useEffect(() => {
    resetWalkInput()
    const s = state.current
    const start = spawnPoint(project, level) ?? { x: 0, y: 0 }
    s.x = start.x
    s.y = start.y
    // face the building's centre
    const xs = Object.values(project.nodes).map((n) => n.x)
    const ys = Object.values(project.nodes).map((n) => n.y)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
    // snapped to 90° so you start looking straight down a room or corridor
    s.yaw = Math.round(Math.atan2(-(cx - s.x), -(cy - s.y)) / (Math.PI / 2)) * (Math.PI / 2)
    s.pitch = -0.05
    s.t = 0
    s.from.copy(camera.position)
    s.fromQ.copy(camera.quaternion)
    return () => resetWalkInput()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Teleport ("go to room").
  useEffect(() => {
    if (!goto) return
    const s = state.current
    const q = moveWithCollisions({ x: goto.x, y: goto.y }, { x: 0, y: 0 }, RADIUS, colliders)
    s.x = q.x
    s.y = q.y
  }, [goto, colliders])

  // Keyboard + mouse look.
  useEffect(() => {
    const el = gl.domElement
    const keyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
        walkInput.keys.add(k)
        e.preventDefault()
      }
      if (k === 'escape' && document.pointerLockElement !== el) useEditor.getState().exitWalk()
    }
    const keyUp = (e: KeyboardEvent) => walkInput.keys.delete(e.key.toLowerCase())
    let dragging = false
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      dragging = true
      el.requestPointerLock?.()?.catch?.(() => undefined)
    }
    const up = () => (dragging = false)
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (document.pointerLockElement === el || dragging) {
        walkInput.look.yaw -= e.movementX * 0.0025
        walkInput.look.pitch -= e.movementY * 0.0025
      }
    }
    const blur = () => walkInput.keys.clear()
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', blur)
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointermove', move)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', blur)
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointermove', move)
      if (document.pointerLockElement === el) document.exitPointerLock()
    }
  }, [gl])

  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), [])
  const targetQ = useMemo(() => new THREE.Quaternion(), [])
  const targetP = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = state.current
    const k = walkInput.keys
    // look
    s.yaw += walkInput.look.yaw
    s.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, s.pitch + walkInput.look.pitch))
    walkInput.look.yaw = 0
    walkInput.look.pitch = 0
    if (k.has('arrowleft')) s.yaw += 1.6 * dt
    if (k.has('arrowright')) s.yaw -= 1.6 * dt
    // move (forward is -Z in camera space → plan direction (-sin yaw, -cos yaw))
    let fwd = walkInput.move.y + (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0)
    let str = walkInput.move.x + (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0)
    const mag = Math.hypot(fwd, str)
    if (mag > 1) {
      fwd /= mag
      str /= mag
    }
    if (s.t >= TRANSITION && (fwd || str)) {
      const speed = (k.has('shift') || walkInput.run ? RUN_SPEED : WALK_SPEED) * dt
      const sin = Math.sin(s.yaw)
      const cos = Math.cos(s.yaw)
      const delta = { x: (-sin * fwd + cos * str) * speed, y: (-cos * fwd - sin * str) * speed }
      const next = moveWithCollisions({ x: s.x, y: s.y }, delta, RADIUS, colliders)
      s.x = next.x
      s.y = next.y
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
    } else {
      camera.position.copy(targetP)
      camera.quaternion.copy(targetQ)
    }
    // HUD (throttled): current room + position for accessibility/testing
    s.lastHud += dt
    if (s.lastHud > 0.2) {
      s.lastHud = 0
      const room = currentRoom(project, level, { x: s.x, y: s.y })
      useEditor.getState().setWalkRoom(room?.name ?? null)
      const hud = document.querySelector('[data-testid=walk-hud]')
      hud?.setAttribute('data-walk-pos', `${s.x.toFixed(2)},${s.y.toFixed(2)}`)
    }
  })
  return null
}
