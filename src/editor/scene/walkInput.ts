/**
 * Navigation input shared by the in-canvas controllers (walk and fly) and the DOM overlays
 * (touch joystick, look pad, up/down buttons). `move` is in the viewer's frame:
 * x = strafe right, y = forward, each in [-1, 1]; `vertical` is up (+) / down (−) for the free camera.
 */
export const walkInput = {
  keys: new Set<string>(),
  move: { x: 0, y: 0 },
  vertical: 0,
  /** Accumulated look delta in radians, consumed each frame. */
  look: { yaw: 0, pitch: 0 },
  /** Accumulated wheel steps (free-camera speed), consumed each frame. */
  wheel: 0,
  run: false,
}

export function resetWalkInput() {
  walkInput.keys.clear()
  walkInput.move = { x: 0, y: 0 }
  walkInput.vertical = 0
  walkInput.look = { yaw: 0, pitch: 0 }
  walkInput.wheel = 0
  walkInput.run = false
}

/** Keys the navigation controllers consume (lower-case `KeyboardEvent.key`, plus `code` for space). */
export const NAV_KEYS = ['w', 'a', 's', 'd', 'q', 'e', ' ', 'c', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'pageup', 'pagedown']

/** Map the pressed keys to a movement intent (forward, strafe, vertical) in [-1, 1]. */
export function keyIntent(k: Set<string>) {
  const f = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0)
  const s = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0)
  const v = (k.has('e') || k.has(' ') || k.has('pageup') ? 1 : 0) - (k.has('q') || k.has('c') || k.has('pagedown') ? 1 : 0)
  return { f, s, v }
}

/** Frame-rate-independent exponential approach: the fraction of the gap to close this frame. */
export const approach = (rate: number, dt: number) => 1 - Math.exp(-rate * dt)
