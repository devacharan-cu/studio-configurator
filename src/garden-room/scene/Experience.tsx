import { Environment, useTexture } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, useState, useTransition, type ReactNode } from 'react'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { GROUPS } from '../domain/catalog'
import type { Configuration } from '../domain/types'
import { useStore } from '../state/store'
import { CameraRig } from './CameraRig'
import { CoffeeTable, Rug, Sofa } from './Furniture'
import { ROOM, WINDOW } from './layout'
import { preloadModel } from './models'
import { Flooring, RoomShell, WallFinish } from './Room'
import { Styling } from './Styling'
import { texturePaths } from './surfaces'

RectAreaLightUniformsLib.init()

/* ---------- Error isolation ---------- */

/**
 * Wraps one configurable slot. If its asset fails (missing file, decode error) only that
 * object disappears; the room keeps working and the option is flagged in the UI.
 */
class SlotBoundary extends Component<{ optionId: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error(`[scene] failed to render option "${this.props.optionId}"`, error)
    const store = useStore.getState()
    store.reportAssetFailure(this.props.optionId)
    const name = Object.values(GROUPS)
      .flatMap((g) => g.options as { id: string; name: string }[])
      .find((o) => o.id === this.props.optionId)?.name
    store.toast('error', `Couldn’t load “${name ?? this.props.optionId}”`, 'The rest of the room still works — try another option.')
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/* ---------- Lighting ---------- */

function Lighting() {
  const midZ = (WINDOW.z0 + WINDOW.z1) / 2
  const [target] = useState(() => {
    const o = new THREE.Object3D()
    o.position.set(0.4, 0, -0.6)
    return o
  })
  return (
    <>
      <Environment files="/assets/env/small_empty_room_1_1k.hdr" environmentIntensity={0.85} />
      <hemisphereLight args={['#f5f1ea', '#a8927a', 0.35]} />
      {/* Late-afternoon sun through the glazing */}
      <primitive object={target} />
      <directionalLight
        position={[-7.5, 5.4, 1.6]}
        target={target}
        intensity={3.4}
        color="#ffe6c4"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      {/* Soft skylight from the window opening */}
      <rectAreaLight
        width={WINDOW.z1 - WINDOW.z0}
        height={WINDOW.top}
        intensity={1.1}
        color="#eef3f6"
        position={[ROOM.minX + 0.05, WINDOW.top / 2, midZ]}
        rotation={[0, -Math.PI / 2, 0]}
      />
    </>
  )
}

/* ---------- Scene ---------- */

function ReadySignal() {
  const setSceneStatus = useStore((s) => s.setSceneStatus)
  useEffect(() => {
    setSceneStatus('ready')
    // Warm the cache for every other option so switching is instant.
    const id = window.setTimeout(() => {
      for (const group of Object.values(GROUPS)) {
        for (const o of group.options as { spec: unknown }[]) {
          const spec = o.spec as Record<string, unknown>
          if (typeof spec.url === 'string') preloadModel(spec.url)
          for (const s of [spec.surface, spec.fabric, spec.fluted]) {
            if (s && typeof s === 'object' && 'texture' in s) useTexture.preload(texturePaths((s as { texture: string }).texture))
          }
        }
      }
    }, 600)
    return () => window.clearTimeout(id)
  }, [setSceneStatus])
  return null
}

/**
 * The scene renders a *deferred* copy of the configuration, updated inside a transition:
 * while a newly chosen asset loads, the previous object stays on screen (no blank flash)
 * and the UI shows a loading state on the chosen option.
 */
function Furnishings() {
  const config = useStore((s) => s.config)
  const setScenePending = useStore((s) => s.setScenePending)
  const [shown, setShown] = useState<Configuration>(config)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(() => setShown(config))
  }, [config])
  useEffect(() => setScenePending(pending), [pending, setScenePending])

  // Runs only once the transition has committed, i.e. every asset for `shown` is loaded and in the scene.
  const invalidate = useThree((s) => s.invalidate)
  const setRendered = useStore((s) => s.setRendered)
  useEffect(() => {
    invalidate()
    setRendered(shown)
  }, [shown, invalidate, setRendered])

  return (
    <>
      <RoomShell />
      <SlotBoundary key={`f-${shown.flooring}`} optionId={shown.flooring}>
        <Flooring optionId={shown.flooring} />
      </SlotBoundary>
      <SlotBoundary key={`w-${shown.wallFinish}`} optionId={shown.wallFinish}>
        <WallFinish optionId={shown.wallFinish} />
      </SlotBoundary>
      <SlotBoundary key={`s-${shown.sofa}`} optionId={shown.sofa}>
        <Sofa optionId={shown.sofa} />
      </SlotBoundary>
      <SlotBoundary key={`t-${shown.coffeeTable}`} optionId={shown.coffeeTable}>
        <CoffeeTable optionId={shown.coffeeTable} />
      </SlotBoundary>
      <SlotBoundary key={`g-${shown.rug}`} optionId={shown.rug}>
        <Rug optionId={shown.rug} />
      </SlotBoundary>
      <SlotBoundary key="styling" optionId="styling">
        <Styling />
      </SlotBoundary>
    </>
  )
}

const CAMERA = { fov: 42, near: 0.05, far: 60, position: [2.35, 1.62, 2.3] as [number, number, number] }
// Khronos PBR Neutral tone mapping: designed for faithful product colour, so finishes look as specified.
const GL = { antialias: true, powerPreference: 'high-performance' as const }

/**
 * Hover feedback is applied to the canvas element directly. Subscribing <Canvas>'s parent to hover
 * state re-rendered the whole scene graph on every pointer enter/leave (measured 500–750 ms stalls).
 */
function HoverCursor() {
  const el = useThree((s) => s.gl.domElement)
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (s.hoveredGroup !== prev.hoveredGroup) el.style.cursor = s.hoveredGroup ? 'pointer' : 'grab'
      }),
    [el],
  )
  return null
}

export function Experience() {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      frameloop="demand"
      camera={CAMERA}
      gl={GL}
      style={{ cursor: 'grab' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
      }}
      aria-label="Interactive 3D view of the living room"
    >
      <color attach="background" args={['#e8e3db']} />
      <CameraRig />
      <HoverCursor />
      <Suspense fallback={null}>
        <Lighting />
        <Furnishings />
        <ReadySignal />
      </Suspense>
    </Canvas>
  )
}
