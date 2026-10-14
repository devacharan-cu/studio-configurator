import { useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { FinishDef } from '../../engine/assets/finishes'
import { interiorPoint, pointInPolygon, area } from '../../engine/geometry/polygon'
import { entrances, roofPlan } from '../../engine/geometry/site'
import type { Face } from '../../engine/geometry/walls'
import { roomPolygon, roomsOnLevel } from '../../engine/model/query'
import type { Id, Project } from '../../engine/model/types'
import { planBounds } from './bounds'
import { facesToGeometry } from './buildGeometry'
import { useFinishMaterial } from './materials'
import { QUALITY, type Quality } from './quality'
import { SUN_DIR, useSkyTextures } from './sky'

/**
 * The world around the building: a real sky (CC0 HDRI, Poly Haven "Meadow 2"), a sun that matches it
 * and casts the only shadows, a lawn, a paved terrace and front path, a flat roof for first person,
 * and warm room lights.
 *
 * The HDRI's sun disc was clamped out of the lighting copy (`meadow_2_ibl_1k.hdr`) and replaced by the
 * directional light below, so sunlight is shadowed by walls and roof and only enters through openings.
 * Image-based light itself has no occlusion; it is turned down indoors so rooms aren't lit by the sky
 * through solid walls.
 */

const LAWN: FinishDef = { id: 'site-lawn', name: 'Lawn', texture: 'grass_ground', tileSize: 3.2, tint: '#b9dc8a', roughness: 1, normalScale: 0.6, swatch: '#7c8a4c' }
const PAVING: FinishDef = { id: 'site-paving', name: 'Stone paving', texture: 'rectangular_paving', tileSize: 2.0, tint: '#ece6dc', roughness: 1, normalScale: 0.8, swatch: '#bdb4a6' }
const GRAVEL: FinishDef = { id: 'site-roof-gravel', name: 'Roof gravel', texture: 'gravel_floor_03', tileSize: 1.6, tint: '#ffffff', roughness: 1, normalScale: 0.5, swatch: '#5f5b55' }

const OUTDOOR = { sky: new THREE.Color('#dfe9f5'), ground: new THREE.Color('#8a8f6a'), intensity: 0.25 }
const INDOOR = { sky: new THREE.Color('#fbf6ef'), ground: new THREE.Color('#e4dacd'), intensity: 0.8 }

const fascia = new THREE.MeshStandardMaterial({ color: '#e6e1d8', roughness: 0.9 })
const fixture = new THREE.MeshStandardMaterial({ color: '#fff4e2', emissive: '#ffdcae', emissiveIntensity: 0, roughness: 0.6 })

/** Ground disc with UVs in metres; the outer ring fades into the sky's horizon through vertex alpha. */
function groundGeometry(inner: number, outer: number, fade: boolean, cx: number, cz: number) {
  const g = fade ? new THREE.RingGeometry(inner, outer, 96, 4) : new THREE.CircleGeometry(inner, 96)
  const pos = g.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  const col = new Float32Array(pos.count * 4)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    // the disc is rotated flat: local (x, y) is world (x, −z) relative to the centre
    uv[i * 2] = x + cx
    uv[i * 2 + 1] = y - cz
    const r = Math.hypot(x, y)
    const t = fade ? Math.min(1, Math.max(0, (r - inner) / (outer - inner))) : 0
    col.set([1, 1, 1, 1 - t * t * (3 - 2 * t)], i * 4)
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  if (fade) g.setAttribute('color', new THREE.BufferAttribute(col, 4))
  return g
}

function Lawn({ cx, cz }: { cx: number; cz: number }) {
  const mat = useFinishMaterial(LAWN)
  const ring = useMemo(() => {
    const m = mat.clone()
    m.transparent = true
    m.vertexColors = true
    m.depthWrite = false
    return m
  }, [mat])
  // texture coordinates follow the world, so the grass doesn't slide when the building changes size
  const inner = useMemo(() => groundGeometry(45, 45, false, cx, cz), [cx, cz])
  const outer = useMemo(() => groundGeometry(45, 140, true, cx, cz), [cx, cz])
  useEffect(() => () => inner.dispose(), [inner])
  useEffect(() => () => outer.dispose(), [outer])
  return (
    <group position={[cx, -0.03, cz]}>
      <mesh geometry={inner} material={mat} rotation-x={-Math.PI / 2} receiveShadow raycast={() => null} />
      <mesh geometry={outer} material={ring} rotation-x={-Math.PI / 2} receiveShadow renderOrder={-1} raycast={() => null} />
    </group>
  )
}

/** A paved terrace around the house and a path from the front door. */
function Paving({ project, level }: { project: Project; level: Id }) {
  const mat = useFinishMaterial(PAVING)
  const b = planBounds(project, level)
  const front = entrances(project, level)[0]
  const geometry = useMemo(() => {
    const m = 1.4
    const faces: Face[] = [{ role: 'top', normal: [0, 1, 0], points: [[b.x0 - m, 0, b.y0 - m], [b.x1 + m, 0, b.y0 - m], [b.x1 + m, 0, b.y1 + m], [b.x0 - m, 0, b.y1 + m]] }]
    if (front) {
      const w = front.width / 2 + 0.35
      const side = { x: -front.outward.y, y: front.outward.x }
      const p0 = { x: front.at.x + front.outward.x * (m - 0.05), y: front.at.y + front.outward.y * (m - 0.05) }
      const p1 = { x: front.at.x + front.outward.x * 9, y: front.at.y + front.outward.y * 9 }
      const q = (p: { x: number; y: number }, s: number): [number, number, number] => [p.x + side.x * w * s, 0.004, p.y + side.y * w * s]
      faces.push({ role: 'top', normal: [0, 1, 0], points: [q(p0, -1), q(p0, 1), q(p1, 1), q(p1, -1)] })
    }
    return facesToGeometry(faces)
  }, [b.x0, b.x1, b.y0, b.y1, front?.at.x, front?.at.y, front?.outward.x, front?.outward.y, front?.width]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={mat} position-y={-0.014} receiveShadow raycast={() => null} />
}

/** Flat roof with gravel ballast and a rendered fascia; shown in first person and the free camera. */
function Roof({ project, level, top }: { project: Project; level: Id; top: number }) {
  const gravel = useFinishMaterial(GRAVEL)
  const T = 0.32
  const geometry = useMemo(() => {
    const plan = roofPlan(project, level, 0.3)
    const tops: Face[] = []
    const sides: Face[] = []
    const up: [number, number, number] = [0, 1, 0]
    for (const s of plan.slabs) tops.push({ role: 'top', normal: up, points: s.map((q) => [q.x, top + T, q.y]) })
    for (const { corners: c } of plan.strips) {
      tops.push({ role: 'top', normal: up, points: c.map((q) => [q.x, top + T, q.y]) })
      sides.push({ role: 'cap', normal: [0, -1, 0], points: c.map((q) => [q.x, top, q.y]) })
      for (let i = 0; i < 4; i++) {
        const a = c[i]
        const b2 = c[(i + 1) % 4]
        const d = { x: b2.x - a.x, y: b2.y - a.y }
        const l = Math.hypot(d.x, d.y) || 1
        // outward normal of a counter-clockwise or clockwise rectangle: pick the one pointing away from its centre
        const mid = { x: (c[0].x + c[2].x) / 2, y: (c[0].y + c[2].y) / 2 }
        let n = { x: d.y / l, y: -d.x / l }
        if (((a.x + b2.x) / 2 - mid.x) * n.x + ((a.y + b2.y) / 2 - mid.y) * n.y < 0) n = { x: -n.x, y: -n.y }
        sides.push({ role: 'cap', normal: [n.x, 0, n.y], points: [[a.x, top, a.y], [b2.x, top, b2.y], [b2.x, top + T, b2.y], [a.x, top + T, a.y]] })
      }
    }
    const g1 = facesToGeometry(tops)
    const g2 = facesToGeometry(sides)
    const merged = new THREE.BufferGeometry()
    for (const name of ['position', 'normal', 'uv'] as const) {
      const a = g1.getAttribute(name).array as Float32Array
      const b2 = g2.getAttribute(name).array as Float32Array
      const out = new Float32Array(a.length + b2.length)
      out.set(a)
      out.set(b2, a.length)
      merged.setAttribute(name, new THREE.BufferAttribute(out, name === 'uv' ? 2 : 3))
    }
    merged.addGroup(0, g1.getAttribute('position').count, 0)
    merged.addGroup(g1.getAttribute('position').count, g2.getAttribute('position').count, 1)
    merged.computeBoundingSphere()
    g1.dispose()
    g2.dispose()
    return merged
  }, [project, level, top])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={[gravel, fascia]} castShadow receiveShadow raycast={() => null} name="roof" />
}

/**
 * Room lighting. Every room has a ceiling fixture, but only the room the camera is in has a real light:
 * three.js shades every light on every pixel, and six point lights added 20–30 ms per frame over one
 * on an integrated GPU (D16). The single light follows you from room to room with a short fade.
 * No shadows (a point-light shadow is six extra render passes).
 */
function RoomLights({ project, level, ceiling, on }: { project: Project; level: Id; ceiling: number; on: boolean }) {
  const rooms = useMemo(
    () =>
      roomsOnLevel(project, level).map((r) => {
        const poly = roomPolygon(project, r)
        const c = interiorPoint(poly)
        const a = area(poly)
        return { id: r.id, poly, x: c.x, z: c.y, intensity: Math.min(6, 1.4 + a * 0.24), distance: Math.sqrt(a) * 1.6 + 1.2 }
      }),
    [project, level],
  )
  useEffect(() => {
    fixture.emissiveIntensity = on ? 2.2 : 0
  }, [on])
  const light = useRef<THREE.PointLight>(null)
  const current = useRef<string | null>(null)
  useFrame((state, dt) => {
    const l = light.current
    if (!l) return
    const cam = state.camera.position
    const room = on && cam.y < ceiling ? rooms.find((r) => pointInPolygon({ x: cam.x, y: cam.z }, r.poly)) : undefined
    const id = room?.id ?? null
    // fade out, jump to the new room, fade in
    if (id !== current.current) {
      l.intensity = Math.max(0, l.intensity - dt * 12)
      if (l.intensity > 0) return state.invalidate()
      current.current = id
      if (room) {
        l.position.set(room.x, ceiling - 0.45, room.z)
        l.distance = room.distance
      }
    }
    const want = room ? room.intensity : 0
    if (Math.abs(l.intensity - want) > 0.01) {
      l.intensity += (want - l.intensity) * Math.min(1, dt * 6)
      state.invalidate()
    }
  })
  return (
    <>
      <pointLight ref={light} color="#ffd9b0" intensity={0} decay={1.6} />
      {rooms.map((r) => (
        <mesh key={r.id} position={[r.x, ceiling - 0.012, r.z]} rotation-x={Math.PI / 2} material={fixture} visible={on} raycast={() => null}>
          <cylinderGeometry args={[0.16, 0.16, 0.02, 32]} />
        </mesh>
      ))}
    </>
  )
}

function Sky({ url }: { url: string }) {
  const { environment, background } = useSkyTextures(url)
  return (
    <>
      <primitive attach="environment" object={environment} />
      <primitive attach="background" object={background} />
    </>
  )
}

/** Sky, sun, ground, terrace, roof and room lights for the current level. */
export function Site({ project, level, firstPerson, quality }: { project: Project; level: Id; firstPerson: boolean; quality: Quality }) {
  const q = QUALITY[quality]
  const b = planBounds(project, level)
  const cx = (b.x0 + b.x1) / 2
  const cz = (b.y0 + b.y1) / 2
  const r = Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2 + 3
  const lv = project.levels[level]
  const top = (lv?.elevation ?? 0) + Math.max(2.4, ...Object.values(project.walls).filter((w) => w.level === level).map((w) => w.height))
  const target = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    target.position.set(cx, 0, cz)
    target.updateMatrixWorld()
  }, [target, cx, cz])
  const polys = useMemo(() => roomsOnLevel(project, level).map((rm) => roomPolygon(project, rm)), [project, level])

  // Sky light has no occlusion: indoors it is turned down and the fill becomes warm light bounced off
  // floors and walls, instead of blue sky from above and green lawn from below.
  const hemi = useRef<THREE.HemisphereLight>(null)
  useFrame((state, dt) => {
    const cam = state.camera.position
    const inside = firstPerson && cam.y < top && polys.some((poly) => pointInPolygon({ x: cam.x, y: cam.z }, poly))
    const k = Math.min(1, dt * 4)
    const s = state.scene
    const env = inside ? 0.28 : 1
    const h = hemi.current
    let moving = Math.abs(s.environmentIntensity - env) > 0.002
    s.environmentIntensity += (env - s.environmentIntensity) * k
    if (h) {
      const want = inside ? INDOOR : OUTDOOR
      moving ||= Math.abs(h.intensity - want.intensity) > 0.002
      h.intensity += (want.intensity - h.intensity) * k
      h.color.lerp(want.sky, k)
      h.groundColor.lerp(want.ground, k)
    }
    if (moving) state.invalidate()
  })

  const sun = SUN_DIR.clone().multiplyScalar(r * 2.2)
  return (
    <>
      {/* changing to the 4K sky keeps showing the (cached) 2K one while it loads, not an empty scene */}
      <Suspense fallback={<Sky url={QUALITY.balanced.background} />}>
        <Sky url={q.background} />
      </Suspense>
      <hemisphereLight ref={hemi} args={[OUTDOOR.sky, OUTDOOR.ground, OUTDOOR.intensity]} />
      <primitive object={target} />
      <directionalLight
        key={quality}
        position={[cx + sun.x, sun.y, cz + sun.z]}
        target={target}
        intensity={3.2}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[q.shadowMap, q.shadowMap]}
        shadow-radius={q.shadowRadius}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
        shadow-camera-left={-r}
        shadow-camera-right={r}
        shadow-camera-top={r}
        shadow-camera-bottom={-r}
        shadow-camera-near={0.5}
        shadow-camera-far={r * 5}
      />
      <Lawn cx={cx} cz={cz} />
      <Paving project={project} level={level} />
      {firstPerson && <Roof project={project} level={level} top={top} />}
      {q.interiorLights && <RoomLights project={project} level={level} ceiling={top} on={firstPerson} />}
    </>
  )
}
