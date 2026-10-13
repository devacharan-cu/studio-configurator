/**
 * Walkthrough input, shared by the in-canvas controller and the DOM touch overlay.
 * `move` is in the visitor's frame: x = strafe right, y = forward, each in [-1, 1].
 */
export const walkInput = {
  keys: new Set<string>(),
  move: { x: 0, y: 0 },
  /** Accumulated look delta in radians, consumed each frame. */
  look: { yaw: 0, pitch: 0 },
  run: false,
}

export function resetWalkInput() {
  walkInput.keys.clear()
  walkInput.move = { x: 0, y: 0 }
  walkInput.look = { yaw: 0, pitch: 0 }
  walkInput.run = false
}
