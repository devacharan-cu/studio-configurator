import { CameraControls, Environment, type CameraControlsImpl } from '@react-three/drei'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getAsset } from '../../engine/assets/catalog'
import { addItem, addOpening } from '../../engine/commands/elements'
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

/** Orbit / overhead controls; framed on the building when it first loads or the view is reset. */
function OrbitRig({ enabled, frameKey }: { enabled: boolean; frameKey: number }) {
  const ref = useRef<CameraControlsImpl>(null)
  const level = useEditor((s) => s.level)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const b = planBounds(useEditor.getState().history.present, level)
    const cx = (b.x0 + b.x1) / 2
    const cz = (b.y0 + b.y1) / 2
    const span = Math.max(b.x1 - b.x0, b.y1 - b.y0)
    c.setLookAt(cx + span * 0.75, span * 1.25, cz + span * 1.25, cx, 0, cz, frameKey > 0)
  }, [level, frameKey])
  return (
    <CameraControls
      ref={ref}
      makeDefault
      enabled={enabled}
      minDistance={1.5}
      maxDistance={60}
      maxPolarAngle={Math.PI * 0.47}
      dollyToCursor
      smoothTime={0.35}
    />
  )
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

  const getThree = useThree((s) => s.get)
  const handlers: PickHandlers = useMemo(
    () => ({
      onPick: (s: Selection, e: ThreeEvent<PointerEvent>) => {
        const st = useEditor.getState()
        if (st.camera === 'walk' || e.button !== 0) return
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

  const walking = camera === 'walk'
  return (
    <>
      <Lights project={project} level={level} />
      <Ground />
      <Building project={project} level={level} cutaway={!walking && cutaway} ceilings={walking} handlers={handlers} />
      <Items project={project} level={level} handlers={handlers} />
      {walking ? <Walkthrough /> : <OrbitRig enabled={!walking} frameKey={frameKey} />}
      {!walking && <Manipulator drag={drag} />}
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
        frameloop={camera === 'walk' ? 'always' : 'demand'}
        camera={{ fov: 45, near: 0.05, far: 200, position: [14, 10, 14] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping
        }}
        onPointerMissed={() => {
          if (useEditor.getState().tool === 'select' && useEditor.getState().camera === 'orbit') useEditor.getState().select(null)
        }}
        aria-label="3D view of the building"
      >
        <color attach="background" args={['#ebe7e0']} />
        <Suspense fallback={null}>
          <SceneContent frameKey={frameKey} />
        </Suspense>
      </Canvas>
    </div>
  )
}
