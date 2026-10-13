import { CameraControls, Environment, type CameraControlsImpl } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getAsset } from '../../engine/assets/catalog'
import { addItem, addOpening } from '../../engine/commands/elements'
import { itemCorners } from '../../engine/commands/structure'
import { wallFrame } from '../../engine/model/query'
import { snapLength } from '../plan/snap'
import type { Project } from '../../engine/model/types'
import { planBounds } from './bounds'
import { useEditor, useProject, type Selection } from '../store'
import { Building, type PickHandlers } from './Building'
import { Items } from './Items'
import { preloadAsset } from './preload'
import { MATS, preloadFinishTextures } from './materials'
import { Manipulator, type DragState } from './Manipulator'
import { Walkthrough } from './Walkthrough'
import { FreeFly } from './FreeFly'
import { framePose, ORBIT_FOV, presetPose, type ViewPreset } from './framing'

preloadFinishTextures()

function Lights({ project, level }: { project: Project; level: string }) {
  const b = planBounds(project, level)
  const cx = (b.x0 + b.x1) / 2
  const cz = (b.y0 + b.y1) / 2
  const r = Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2 + 2
  const target = useMemo(() => new THREE.Object3D(), [])
  target.position.set(cx, 0, cz)
  return (
    <>
      <Environment files="/assets/env/small_empty_room_1_1k.hdr" environmentIntensity={0.7} />
      <hemisphereLight args={['#f5f1ea', '#b3a28d', 0.55]} />
      <primitive object={target} />
      <directionalLight
        position={[cx - r * 0.9, r * 1.6, cz - r * 0.6]}
        target={target}
        intensity={2.6}
        color="#ffe9cc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-r}
        shadow-camera-right={r}
        shadow-camera-top={r}
        shadow-camera-bottom={-r}
        shadow-camera-near={0.5}
        shadow-camera-far={r * 5}
      />
    </>
  )
}

/** The orbit pose to come back to after walking or flying (module state: survives the rig unmounting). */
let savedOrbit: { position: THREE.Vector3; target: THREE.Vector3 } | null = null
/** The last automatically framed overview position; if the camera is still there, the user hasn't moved it. */
let autoPose: THREE.Vector3 | null = null

function wallHeight(p: Project, level: string) {
  return Math.max(2.4, ...Object.values(p.walls).filter((w) => w.level === level).map((w) => w.height))
}

/** A bounding sphere for the selected element, for "frame selection". */
function selectionSphere(p: Project, sel: Selection): { center: [number, number, number]; radius: number } | null {
  const pts: [number, number, number][] = []
  if (sel.kind === 'room' && p.rooms[sel.id]) for (const id of p.rooms[sel.id].boundary) pts.push([p.nodes[id].x, 1.2, p.nodes[id].y])
  if (sel.kind === 'wall' && p.walls[sel.id]) {
    const w = p.walls[sel.id]
    for (const id of [w.a, w.b]) pts.push([p.nodes[id].x, 0, p.nodes[id].y], [p.nodes[id].x, w.height, p.nodes[id].y])
  }
  if (sel.kind === 'node' && p.nodes[sel.id]) pts.push([p.nodes[sel.id].x, 1.2, p.nodes[sel.id].y])
  if (sel.kind === 'opening' && p.openings[sel.id]) {
    const o = p.openings[sel.id]
    const { a, dir } = wallFrame(p, p.walls[o.wall])
    for (const t of [o.offset - o.width / 2, o.offset + o.width / 2]) pts.push([a.x + dir.x * t, o.sill, a.y + dir.y * t], [a.x + dir.x * t, o.sill + o.height, a.y + dir.y * t])
  }
  if (sel.kind === 'item' && p.items[sel.id]) {
    const it = p.items[sel.id]
    const h = getAsset(it.asset)?.footprint.h ?? 1
    for (const c of itemCorners(it)) pts.push([c.x, 0, c.y], [c.x, h, c.y])
  }
  if (!pts.length) return null
  const box = new THREE.Box3().setFromPoints(pts.map((q) => new THREE.Vector3(...q)))
  const sphere = box.getBoundingSphere(new THREE.Sphere())
  return { center: sphere.center.toArray() as [number, number, number], radius: sphere.radius }
}

/**
 * Orbit / inspection camera. Frames the whole building on load; presets (overview, top, elevations)
 * and "frame selection" come from the UI through the store. Returning from walk/fly glides back to the
 * orbit view the user left, from wherever the first-person camera ended up.
 */
function OrbitRig({ frameKey }: { frameKey: number }) {
  const ref = useRef<CameraControlsImpl>(null)
  const getThree = useThree((s) => s.get)
  const level = useEditor((s) => s.level)
  const viewCmd = useEditor((s) => s.viewCmd)

  const aspect = () => {
    const { width, height } = getThree().size
    return width / Math.max(1, height)
  }
  const goPreset = (preset: ViewPreset, smooth: boolean) => {
    const c = ref.current
    if (!c) return
    const p = useEditor.getState().history.present
    const pose = presetPose(planBounds(p, level), wallHeight(p, level), aspect(), preset)
    c.setLookAt(...pose.position, ...pose.target, smooth)
    autoPose = preset === 'overview' ? new THREE.Vector3(...pose.position) : null
  }

  // The viewport changed shape (split ↔ 3D, window resize): keep an untouched overview fitted to it.
  const size = useThree((s) => s.size)
  const lastSize = useRef<string | null>(null)
  useEffect(() => {
    const c = ref.current
    const key = `${size.width}x${size.height}`
    // only real changes after mount (a remount after walk/fly sees the stale full-screen size first)
    const changed = lastSize.current !== null && lastSize.current !== key
    lastSize.current = key
    if (!changed || !c || !autoPose || useEditor.getState().camera !== 'orbit') return
    if (c.getPosition(new THREE.Vector3()).distanceTo(autoPose) < 0.01) goPreset('overview', true)
  }, [size.width, size.height]) // eslint-disable-line react-hooks/exhaustive-deps

  // mount: come back to the saved orbit pose (after walk/fly) or frame the building
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const cam = getThree().camera
    if (savedOrbit) {
      const ahead = new THREE.Vector3(0, 0, -2).applyQuaternion(cam.quaternion).add(cam.position)
      c.setLookAt(cam.position.x, cam.position.y, cam.position.z, ahead.x, ahead.y, ahead.z, false)
      c.setLookAt(savedOrbit.position.x, savedOrbit.position.y, savedOrbit.position.z, savedOrbit.target.x, savedOrbit.target.y, savedOrbit.target.z, true)
    } else goPreset('overview', false)
    return () => {
      savedOrbit = { position: c.getPosition(new THREE.Vector3()), target: c.getTarget(new THREE.Vector3()) }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // a new project or level reframes; remounting (returning from walk/fly) must not override the restored pose
  const framedFor = useRef({ level, frameKey })
  useEffect(() => {
    if (framedFor.current.level === level && framedFor.current.frameKey === frameKey) return
    framedFor.current = { level, frameKey }
    goPreset('overview', true)
  }, [level, frameKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const c = ref.current
    if (!viewCmd || !c) return
    if (viewCmd.kind === 'preset') return goPreset(viewCmd.preset, true)
    const st = useEditor.getState()
    const sphere = st.selection ? selectionSphere(st.history.present, st.selection) : null
    if (!sphere) return goPreset('overview', true)
    const pos = c.getPosition(new THREE.Vector3())
    const tgt = c.getTarget(new THREE.Vector3())
    const pose = framePose(sphere.center, sphere.radius, aspect(), pos.sub(tgt).toArray() as [number, number, number])
    c.setLookAt(...pose.position, ...pose.target, true)
  }, [viewCmd]) // eslint-disable-line react-hooks/exhaustive-deps

  // ease the field of view back to the orbit lens after first person
  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - ORBIT_FOV) > 0.01) {
      cam.fov += (ORBIT_FOV - cam.fov) * Math.min(1, dt * 6)
      if (Math.abs(cam.fov - ORBIT_FOV) <= 0.05) cam.fov = ORBIT_FOV
      cam.updateProjectionMatrix()
      state.invalidate()
    }
  })

  return <CameraControls ref={ref} makeDefault minDistance={0.6} maxDistance={90} maxPolarAngle={Math.PI / 2 - 0.02} dollyToCursor smoothTime={0.35} />
}

function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow raycast={() => null}>
      <circleGeometry args={[60, 48]} />
      <primitive object={MATS.ground} attach="material" />
    </mesh>
  )
}

function SceneContent({ frameKey }: { frameKey: number }) {
  const project = useProject()
  const level = useEditor((s) => s.level)
  const camera = useEditor((s) => s.camera)
  const cutaway = useEditor((s) => s.cutaway)
  const invalidate = useThree((s) => s.invalidate)
  const drag = useRef<DragState | null>(null)

  useEffect(() => invalidate(), [project, invalidate])
  const gl = useThree((s) => s.gl)
  const getThree = useThree((s) => s.get)
  useEffect(() => {
    // Development-only renderer handle for draw-call measurements; stripped from production builds.
    if (import.meta.env.DEV) Object.assign(window, { __gl: gl, __three: getThree })
  }, [gl, getThree])

  // Warm the cache for every library asset once the scene is up.
  useEffect(() => {
    const t = setTimeout(() => {
      for (const id of Object.values(project.items).map((i) => i.asset)) {
        const a = getAsset(id)
        if (a) preloadAsset(a)
      }
    }, 300)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlers: PickHandlers = useMemo(
    () => ({
      onPick: (s: Selection, e: ThreeEvent<PointerEvent>) => {
        const st = useEditor.getState()
        if (st.camera !== 'orbit' || e.button !== 0) return
        const p = st.history.present
        // Tools work in 3D too: openings on the clicked wall, furniture at the clicked floor point.
        if ((st.tool === 'door' || st.tool === 'window' || st.tool === 'passage') && s.kind === 'wall') {
          e.stopPropagation()
          const { a, dir } = wallFrame(p, p.walls[s.id])
          const offset = snapLength((e.point.x - a.x) * dir.x + (e.point.z - a.y) * dir.y)
          if (st.run(addOpening(p, { wall: s.id, kind: st.tool, offset }))) {
            const created = Object.keys(useEditor.getState().history.present.openings).find((id) => !p.openings[id])
            if (created) st.select({ kind: 'opening', id: created })
          }
          return
        }
        if (st.tool === 'place' && st.placeAsset && s.kind === 'room') {
          e.stopPropagation()
          if (st.run(addItem(p, { asset: st.placeAsset, level: st.level, x: snapLength(e.point.x), y: snapLength(e.point.z) }))) {
            const created = Object.keys(useEditor.getState().history.present.items).find((id) => !p.items[id])
            if (created) st.select({ kind: 'item', id: created })
            st.setTool('select')
          }
          return
        }
        if (st.tool !== 'select') return
        e.stopPropagation()
        const already = st.selection?.kind === s.kind && st.selection.id === s.id
        st.select(s)
        // First click selects (the camera stays free to orbit); dragging an already-selected
        // wall, opening or item edits it. This prevents accidental structural edits while looking around.
        if (already && s.kind !== 'room') {
          const controls = getThree().controls as unknown as { enabled: boolean } | null
          if (controls) controls.enabled = false
          drag.current = { selection: s, startPoint: e.point.clone(), pointerId: e.pointerId, base: p, moved: false }
        }
      },
      onHover: (s: Selection | null) => useEditor.getState().setHover(s),
    }),
    [getThree],
  )

  const firstPerson = camera !== 'orbit'
  return (
    <>
      <Lights project={project} level={level} />
      <Ground />
      <Building project={project} level={level} cutaway={!firstPerson && cutaway} ceilings={firstPerson} handlers={handlers} />
      <Items project={project} level={level} handlers={handlers} />
      {camera === 'walk' && <Walkthrough />}
      {camera === 'fly' && <FreeFly />}
      {camera === 'orbit' && <OrbitRig frameKey={frameKey} />}
      {camera === 'orbit' && <Manipulator drag={drag} />}
    </>
  )
}

export function Scene3D({ frameKey }: { frameKey: number }) {
  const camera = useEditor((s) => s.camera)
  return (
    <div className="relative h-full w-full bg-[#ebe7e0]" data-testid="scene-view">
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        frameloop={camera === 'orbit' ? 'demand' : 'always'}
        camera={{ fov: ORBIT_FOV, near: 0.05, far: 200, position: [14, 10, 14] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping
        }}
        onPointerMissed={() => {
          if (useEditor.getState().tool === 'select' && useEditor.getState().camera === 'orbit') useEditor.getState().select(null)
        }}
        aria-label="3D view of the building"
      >
        {/* a pale sky outside the windows in first person; the studio backdrop while editing */}
        <color attach="background" args={[camera === 'orbit' ? '#ebe7e0' : '#dde5ea']} />
        <Suspense fallback={null}>
          <SceneContent frameKey={frameKey} />
        </Suspense>
      </Canvas>
    </div>
  )
}
