import type { Page } from '@playwright/test'
import * as THREE from 'three'
import { ORBIT_FOV, presetPose } from '../../../src/editor/scene/framing'
import type { SavedProject } from './helpers'

/**
 * Reproduce the editor's initial 3D framing (the same pure `presetPose` the orbit rig uses, from the
 * plan bounds, wall height and viewport aspect) so tests can project world points to screen pixels
 * and click real geometry — no test-only hooks in the app. Valid until the user orbits/zooms.
 */
export async function projectToScreen(page: Page, p: SavedProject, world: [number, number, number]) {
  const canvas = page.getByTestId('scene-view').locator('canvas')
  const box = (await canvas.boundingBox())!
  const xs = Object.values(p.nodes).map((n) => n.x)
  const ys = Object.values(p.nodes).map((n) => n.y)
  const bounds = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  const wallHeight = Math.max(2.4, ...Object.values(p.walls).map((w) => (w as { height?: number }).height ?? 0))
  const pose = presetPose(bounds, wallHeight, box.width / box.height, 'overview')
  const cam = new THREE.PerspectiveCamera(ORBIT_FOV, box.width / box.height, 0.05, 200)
  cam.position.set(...pose.position)
  cam.lookAt(...pose.target)
  cam.updateMatrixWorld()
  const v = new THREE.Vector3(...world).project(cam)
  return { x: box.x + ((v.x + 1) / 2) * box.width, y: box.y + ((1 - v.y) / 2) * box.height }
}
