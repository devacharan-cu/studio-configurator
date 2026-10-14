import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

/** Small building blocks for parametric fixtures. Units are metres; y up, +z = the item's front. */

type V3 = [number, number, number]

const boxCache = new Map<string, THREE.BufferGeometry>()
/** Shared geometry by size (boxes and rounded boxes are reused across every fixture). */
function sharedBox(w: number, h: number, d: number, r: number) {
  const key = `${w.toFixed(4)}|${h.toFixed(4)}|${d.toFixed(4)}|${r.toFixed(4)}`
  let g = boxCache.get(key)
  if (!g) {
    const rr = Math.min(r, w / 2, h / 2, d / 2) - 0.0005
    g = rr > 0.001 ? new RoundedBoxGeometry(w, h, d, 2, rr) : new THREE.BoxGeometry(w, h, d)
    boxCache.set(key, g)
  }
  return g
}

export function Box({ size, at, mat, r = 0, shadow = true, rot }: { size: V3; at: V3; mat: THREE.Material; r?: number; shadow?: boolean; rot?: V3 }) {
  return <mesh geometry={sharedBox(size[0], size[1], size[2], r)} material={mat} position={at} rotation={rot} castShadow={shadow} receiveShadow />
}

/** A bar pull: horizontal (drawers) or vertical (doors), standing off the front face. */
export function BarHandle({ at, length, vertical, mat }: { at: V3; length: number; vertical?: boolean; mat: THREE.Material }) {
  const bar = useMemo(() => new THREE.CylinderGeometry(0.006, 0.006, length, 12), [length])
  const post = useMemo(() => new THREE.CylinderGeometry(0.004, 0.004, 0.028, 8), [])
  useEffect(() => () => bar.dispose(), [bar])
  const off = length / 2 - 0.015
  return (
    <group position={at}>
      <mesh geometry={bar} material={mat} position-z={0.028} rotation={vertical ? [0, 0, 0] : [0, 0, Math.PI / 2]} />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={post} material={mat} position={vertical ? [0, s * off, 0.014] : [s * off, 0, 0.014]} rotation-x={Math.PI / 2} />
      ))}
    </group>
  )
}

export interface Hole {
  /** Centre (x, z) in the item's frame. */
  x: number
  z: number
  w: number
  d: number
  r?: number
}

function roundedRect(shape: THREE.Shape | THREE.Path, cx: number, cy: number, w: number, h: number, r: number) {
  const x = cx - w / 2
  const y = cy - h / 2
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r)
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
}

/**
 * A horizontal slab (worktop, vanity top, bath rim) with real cut-outs, so a sink or basin below it
 * is visible through the hole. Top at `top`, thickness `t`. UVs are in metres (textures tile at scale).
 */
function slabGeometry(w: number, d: number, t: number, holes: Hole[] = [], corner = 0.004): THREE.BufferGeometry {
  const s = new THREE.Shape()
  roundedRect(s, 0, 0, w, d, corner)
  // shape y = −z, so a hole at item z is drawn at y = −z
  for (const h of holes) {
    const p = new THREE.Path()
    roundedRect(p, h.x, -h.z, h.w, h.d, h.r ?? 0.03)
    s.holes.push(p)
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 6 })
  g.rotateX(-Math.PI / 2) // extrusion becomes +y; shape y maps to −z
  g.computeVertexNormals()
  return g
}

export function Slab({ w, d, t, top, holes, mat, corner, at = [0, 0, 0] }: { w: number; d: number; t: number; top: number; holes?: Hole[]; mat: THREE.Material; corner?: number; at?: V3 }) {
  const key = JSON.stringify([w, d, t, holes, corner])
  const g = useMemo(() => slabGeometry(w, d, t, holes, corner), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => g.dispose(), [g])
  return <mesh geometry={g} material={mat} position={[at[0], top - t + at[1], at[2]]} castShadow receiveShadow />
}

/** A gooseneck mixer tap: base, swept spout (tube), lever. */
export function GooseneckTap({ at, height = 0.32, reach = 0.2, mat }: { at: V3; height?: number; reach?: number; mat: THREE.Material }) {
  const tube = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, height * 0.82, 0),
      new THREE.Vector3(0, height, reach * 0.35),
      new THREE.Vector3(0, height * 0.94, reach * 0.85),
      new THREE.Vector3(0, height * 0.78, reach),
    ])
    return new THREE.TubeGeometry(c, 32, 0.011, 10, false)
  }, [height, reach])
  useEffect(() => () => tube.dispose(), [tube])
  return (
    <group position={at}>
      <mesh material={mat} position-y={0.03} castShadow>
        <cylinderGeometry args={[0.024, 0.028, 0.06, 20]} />
      </mesh>
      <mesh geometry={tube} material={mat} position-y={0.05} castShadow />
      <mesh material={mat} position={[0.035, 0.085, 0]} rotation-z={-0.5}>
        <cylinderGeometry args={[0.005, 0.005, 0.09, 8]} />
      </mesh>
    </group>
  )
}
