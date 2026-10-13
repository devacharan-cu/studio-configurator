import type { Page } from '@playwright/test'
import * as THREE from 'three'
import type { SavedProject } from './helpers'

/**
 * Reproduce the editor's initial 3D framing (OrbitRig: setLookAt from the plan bounds and viewport aspect, fov 45) so tests
 * can project world points to screen pixels and click real geometry — no test-only hooks in the app.
 * Valid until the user orbits/zooms.
 */
export async function projectToScreen(page: Page, p: SavedProject, world: [number, number, number]) {
  const canvas = page.getByTestId('scene-view').locator('canvas')
  const box = (await canvas.boundingBox())!
  const xs = Object.values(p.nodes).map((n) => n.x)
  const ys = Object.values(p.nodes).map((n) => n.y)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const cx = (x0 + x1) / 2
  const cz = (y0 + y1) / 2
  const fit = Math.max(1, Math.sqrt(1.35 / Math.max(0.3, box.width / Math.max(1, box.height))))
  const span = Math.max(x1 - x0, y1 - y0) * fit
  const cam = new THREE.PerspectiveCamera(45, box.width / box.height, 0.05, 200)
  cam.position.set(cx + span * 0.75, span * 1.25, cz + span * 1.25)
  cam.lookAt(cx, 0, cz)
  cam.updateMatrixWorld()
  const v = new THREE.Vector3(...world).project(cam)
  return { x: box.x + ((v.x + 1) / 2) * box.width, y: box.y + ((1 - v.y) / 2) * box.height }
}
