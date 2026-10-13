import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useEditor } from '../store'
import { NAV_KEYS, resetWalkInput, walkInput } from './walkInput'

/** Radians of look per pixel of mouse movement at sensitivity 1. */
export const LOOK_RATE = 0.0022

/**
 * Keyboard, mouse-look and pointer-lock handling shared by the walk and fly controllers.
 * - Clicking the canvas acquires pointer lock (raw mouse input where the browser supports it).
 * - Without pointer lock, dragging looks around (left drag in walk, left or right drag in fly).
 * - Esc releases pointer lock (browser behaviour); Esc while unlocked returns to the editor.
 */
export function useNavInput() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    resetWalkInput()
    let lastUnlock = 0
    let dragging = false

    const lock = () => {
      if (document.pointerLockElement === el || !el.requestPointerLock) return
      // unadjustedMovement gives raw mouse deltas (no OS acceleration); fall back if unsupported
      try {
        const r = el.requestPointerLock({ unadjustedMovement: true }) as unknown as Promise<void> | undefined
        r?.catch?.(() => {
          try {
            ;(el.requestPointerLock() as unknown as Promise<void> | undefined)?.catch?.(() => undefined)
          } catch {
            /* pointer lock unavailable: drag-to-look still works */
          }
        })
      } catch {
        /* ignore */
      }
    }
    // Overlays (e.g. "click to look around") ask for the lock through this event.
    const onRequest = () => lock()

    const onLockChange = () => {
      const locked = document.pointerLockElement === el
      if (!locked) {
        lastUnlock = performance.now()
        walkInput.keys.clear()
      }
      useEditor.getState().setPointerLocked(locked)
    }

    const keyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, [role=dialog]')) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'escape') {
        // the Esc that released pointer lock shouldn't also leave the walkthrough
        if (document.pointerLockElement !== el && performance.now() - lastUnlock > 250) useEditor.getState().exitWalk()
        return
      }
      if (NAV_KEYS.includes(k)) {
        walkInput.keys.add(k)
        e.preventDefault()
      }
    }
    const keyUp = (e: KeyboardEvent) => {
      walkInput.keys.delete(e.key.toLowerCase())
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      dragging = true
      if (e.button === 0) lock()
    }
    const up = () => (dragging = false)
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (document.pointerLockElement !== el && !dragging) return
      const { look, invertY } = useEditor.getState().nav
      // clamp the occasional large spike some platforms report on lock/unlock
      const dx = Math.max(-200, Math.min(200, e.movementX))
      const dy = Math.max(-200, Math.min(200, e.movementY))
      walkInput.look.yaw -= dx * LOOK_RATE * look
      walkInput.look.pitch -= dy * LOOK_RATE * look * (invertY ? -1 : 1)
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      walkInput.wheel += Math.sign(e.deltaY)
    }
    const blur = () => walkInput.keys.clear()
    const context = (e: MouseEvent) => e.preventDefault()

    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', blur)
    window.addEventListener('nav:lock', onRequest)
    document.addEventListener('pointerlockchange', onLockChange)
    el.addEventListener('pointerdown', down)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('contextmenu', context)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointermove', move)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', blur)
      window.removeEventListener('nav:lock', onRequest)
      document.removeEventListener('pointerlockchange', onLockChange)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('contextmenu', context)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointermove', move)
      if (document.pointerLockElement === el) document.exitPointerLock()
      useEditor.getState().setPointerLocked(false)
      resetWalkInput()
    }
  }, [gl])
}

/** Ask the active controller to take pointer lock (from a DOM overlay click — a user gesture). */
export const requestNavLock = () => window.dispatchEvent(new Event('nav:lock'))
