import * as THREE from 'three'
import { triangulate } from '../../engine/geometry/polygon'
import type { Face } from '../../engine/geometry/walls'

/**
 * Turn engine faces (planar polygons in world space with outward normals) into BufferGeometry.
 * Winding is fixed against the stated normal; UVs are planar projections in metres so tiling
 * textures keep their physical scale on every face.
 */
export function facesToGeometry(faces: Face[]): THREE.BufferGeometry {
  const pos: number[] = []
  const nrm: number[] = []
  const uv: number[] = []
  for (const f of faces) {
    const n = new THREE.Vector3(...f.normal)
    const pts = f.points.map((p) => new THREE.Vector3(...p))
    // planar basis: u along the first edge (or world X for horizontal faces), v = n × u
    let u: THREE.Vector3
    if (Math.abs(n.y) > 0.9) u = new THREE.Vector3(1, 0, 0)
    else u = new THREE.Vector3(-n.z, 0, n.x).normalize() // horizontal tangent of a vertical face
    const vAxis = new THREE.Vector3().crossVectors(n, u).normalize()
    const proj = pts.map((p) => ({ x: p.dot(u), y: p.dot(vAxis) }))
    const tris = pts.length === 4 ? [[0, 1, 2], [0, 2, 3]] : triangulate(proj)
    for (const [a, b, c] of tris) {
      // fix winding so the triangle faces along n
      const e1 = new THREE.Vector3().subVectors(pts[b], pts[a])
      const e2 = new THREE.Vector3().subVectors(pts[c], pts[a])
      const order = new THREE.Vector3().crossVectors(e1, e2).dot(n) >= 0 ? [a, b, c] : [a, c, b]
      for (const i of order) {
        pos.push(pts[i].x, pts[i].y, pts[i].z)
        nrm.push(n.x, n.y, n.z)
        uv.push(proj[i].x, proj[i].y)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeBoundingSphere()
  return g
}

/** Horizontal polygon (plan points) at height y, facing up or down, with metre UVs. */
export function polygonGeometry(points: { x: number; y: number }[], y: number, up = true): THREE.BufferGeometry {
  return facesToGeometry([{ role: 'top', normal: [0, up ? 1 : -1, 0], points: points.map((p) => [p.x, y, p.y] as [number, number, number]) }])
}
