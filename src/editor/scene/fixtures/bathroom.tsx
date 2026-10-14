import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import type { AssetDef } from '../../../engine/assets/catalog'
import { useEditor } from '../../store'
import { BarHandle, Box, GooseneckTap, Slab } from './parts'
import { paint, PLAIN, SURFACES, useSurface } from './surfaces'

/**
 * Parametric bathroom: freestanding bath (a real hollow shell with a rolled rim), wall-hung vanity
 * with a vessel basin and wall spout, wall-hung WC with concealed cistern plate, walk-in shower.
 */

type Props = { a: AssetDef; variant?: string }

/** Rounded-rectangle outline as points (for lathe-free hollow shells). */
function roundedRectShape(w: number, d: number, r: number, path: THREE.Shape | THREE.Path) {
  const x = -w / 2
  const y = -d / 2
  path.moveTo(x + r, y)
  path.lineTo(x + w - r, y)
  path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  path.lineTo(x + w, y + d - r)
  path.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false)
  path.lineTo(x + r, y + d)
  path.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false)
  path.lineTo(x, y + r)
  path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
}

/** Freestanding bath: outer shell with a rim (extruded ring) and an inner basin seen from inside. */
export function Bath({ a }: Props) {
  const ceramic = useSurface(SURFACES.ceramic)
  const { w, d, h } = a.footprint
  const { shell, basin } = useMemo(() => {
    const rim = 0.045
    const outer = new THREE.Shape()
    roundedRectShape(w, d, Math.min(d / 2 - 0.01, 0.34), outer)
    const hole = new THREE.Path()
    roundedRectShape(w - rim * 2, d - rim * 2, Math.min(d / 2 - rim - 0.01, 0.3), hole)
    outer.holes.push(hole)
    const shell = new THREE.ExtrudeGeometry(outer, { depth: h - 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 4, curveSegments: 24 })
    shell.rotateX(-Math.PI / 2)
    shell.translate(0, 0.02, 0)
    const inner = new THREE.Shape()
    roundedRectShape(w - rim * 2, d - rim * 2, Math.min(d / 2 - rim - 0.01, 0.3), inner)
    const basin = new THREE.ShapeGeometry(inner, 24)
    basin.rotateX(-Math.PI / 2)
    basin.translate(0, 0.08, 0)
    return { shell, basin }
  }, [w, d, h])
  useEffect(
    () => () => {
      shell.dispose()
      basin.dispose()
    },
    [shell, basin],
  )
  return (
    <group>
      <mesh geometry={shell} material={ceramic} castShadow receiveShadow />
      <mesh geometry={basin} material={ceramic} receiveShadow />
      {/* floor-standing mixer at the tap end */}
      <GooseneckTap at={[w / 2 + 0.12, 0, 0]} height={0.9} reach={0.22} mat={PLAIN.chrome} />
    </group>
  )
}

const VANITY_FINISHES = {
  oak: SURFACES.oak,
  white: paint('#efeee9'),
  walnut: SURFACES.walnut,
  sage: paint('#8b9a80'),
}

/** Wall-hung vanity: drawer cabinet, stone top with a vessel basin, wall-mounted spout. */
export function Vanity({ a, variant }: Props) {
  const front = useSurface(VANITY_FINISHES[(variant ?? 'oak') as keyof typeof VANITY_FINISHES] ?? VANITY_FINISHES.oak)
  const top = useSurface(SURFACES.terrazzo)
  const ceramic = useSurface(SURFACES.ceramic)
  const { w, d, h } = a.footprint
  const cab = 0.45
  const base = h - 0.03 - cab // wall-hung: underside above the floor
  const bowl = useMemo(() => {
    const pts = [
      [0, 0],
      [0.13, 0],
      [0.19, 0.04],
      [0.21, 0.12],
      [0.2, 0.125],
      [0.18, 0.04],
      [0.12, 0.012],
      [0, 0.012],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 40)
  }, [])
  useEffect(() => () => bowl.dispose(), [bowl])
  return (
    <group position-z={-d / 2}>
      <Box size={[w, cab, d - 0.02]} at={[0, base + cab / 2, (d - 0.02) / 2]} mat={front} r={0.004} />
      <Box size={[w - 0.006, 0.004, 0.004]} at={[0, base + cab / 2, d - 0.02]} mat={PLAIN.shadowGap} shadow={false} />
      <BarHandle at={[0, base + cab * 0.78, d - 0.02]} length={0.22} mat={PLAIN.brushedSteel} />
      <BarHandle at={[0, base + cab * 0.28, d - 0.02]} length={0.22} mat={PLAIN.brushedSteel} />
      <Slab w={w + 0.02} d={d} t={0.03} top={h} mat={top} at={[0, 0, d / 2]} />
      <mesh geometry={bowl} material={ceramic} position={[0, h, d / 2 + 0.02]} castShadow receiveShadow />
      {/* wall spout */}
      <mesh material={PLAIN.chrome} position={[0, h + 0.3, 0.09]} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.18, 12]} />
      </mesh>
      <mesh material={PLAIN.chrome} position={[0.1, h + 0.3, 0.01]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 20]} />
      </mesh>
    </group>
  )
}

/** Wall-hung WC: elongated lathed bowl, seat ring and lid, concealed cistern with a flush plate. */
export function Wc({ a }: Props) {
  const ceramic = useSurface(SURFACES.ceramic)
  const { d } = a.footprint
  const { bowl, seat, lid } = useMemo(() => {
    const prof = [
      [0, 0],
      [0.1, 0],
      [0.15, 0.06],
      [0.178, 0.15],
      [0.185, 0.2],
      [0.17, 0.205],
      [0, 0.205],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    const bowl = new THREE.LatheGeometry(prof, 40)
    bowl.scale(1, 1, 1.45)
    const seat = new THREE.TorusGeometry(0.155, 0.022, 10, 40)
    seat.rotateX(Math.PI / 2)
    seat.scale(1, 0.6, 1.45)
    const lid = new THREE.CylinderGeometry(0.19, 0.19, 0.018, 40)
    lid.scale(1, 1, 1.42)
    return { bowl, seat, lid }
  }, [])
  useEffect(
    () => () => {
      bowl.dispose()
      seat.dispose()
      lid.dispose()
    },
    [bowl, seat, lid],
  )
  const zc = 0.1 + 0.185 * 1.45 // bowl centre: its back touches the carrier box
  return (
    <group position-z={-d / 2}>
      {/* boxed-in carrier with the flush plate */}
      <Box size={[0.42, 0.85, 0.1]} at={[0, 0.425, 0.05]} mat={ceramic} r={0.01} />
      <Box size={[0.24, 0.16, 0.012]} at={[0, 0.98, 0.106]} mat={PLAIN.chrome} r={0.004} />
      <mesh geometry={bowl} material={ceramic} position={[0, 0.2, zc]} castShadow receiveShadow />
      <mesh geometry={seat} material={ceramic} position={[0, 0.418, zc]} castShadow />
      <mesh geometry={lid} material={ceramic} position={[0, 0.438, zc]} castShadow />
    </group>
  )
}

/** Walk-in shower: low stone tray, fixed glass screen with a slim chrome frame, rain head and mixer. */
export function Shower({ a }: Props) {
  const tray = useSurface(SURFACES.ceramic)
  const { w, d, h } = a.footprint
  return (
    <group position-z={-d / 2}>
      <Box size={[w, 0.04, d]} at={[0, 0.02, d / 2]} mat={tray} r={0.006} />
      <mesh position={[0, 0.042, d / 2]} rotation-x={-Math.PI / 2} material={PLAIN.brushedSteel}>
        <planeGeometry args={[w * 0.6, 0.06]} />
      </mesh>
      {/* glass screen along the open side (front), leaving a 0.6 m entry */}
      <mesh position={[-0.3, h / 2 + 0.04, d - 0.02]} material={PLAIN.showerGlass}>
        <boxGeometry args={[w - 0.6, h - 0.08, 0.008]} />
      </mesh>
      <Box size={[w - 0.6, 0.02, 0.02]} at={[-0.3, h, d - 0.02]} mat={PLAIN.chrome} />
      <Box size={[0.02, h - 0.04, 0.02]} at={[-w / 2 + 0.01, h / 2 + 0.02, d - 0.02]} mat={PLAIN.chrome} />
      {/* rain head on an arm from the back wall, and the mixer */}
      <mesh position={[0, h - 0.05, 0.2]} rotation-x={Math.PI / 2} material={PLAIN.chrome}>
        <cylinderGeometry args={[0.008, 0.008, 0.4, 10]} />
      </mesh>
      <mesh position={[0, h - 0.07, 0.4]} material={PLAIN.chrome}>
        <cylinderGeometry args={[0.13, 0.13, 0.012, 32]} />
      </mesh>
      <Box size={[0.14, 0.14, 0.03]} at={[0, 1.1, 0.015]} mat={PLAIN.chrome} r={0.01} />
    </group>
  )
}

/**
 * Rectangular bathroom mirror. At the Quality level it is a true planar reflection (three's Reflector:
 * one extra render of the scene at 512 px while the camera is within 6 m of it); otherwise a
 * low-roughness metal that reflects the environment map, which costs nothing extra (D21).
 */
export function MirrorRect({ a }: Props) {
  const quality = useEditor((s) => s.nav.quality)
  const { w, d, h } = a.footprint
  const real = quality === 'quality'
  const reflector = useMemo(() => {
    if (!real) return null
    const r = new Reflector(new THREE.PlaneGeometry(w - 0.03, h - 0.03), { textureWidth: 512, textureHeight: Math.round((512 * h) / w), color: 0xc8cccc, multisample: 0 })
    return r
  }, [real, w, h])
  useEffect(
    () => () => {
      reflector?.geometry.dispose()
      reflector?.dispose()
    },
    [reflector],
  )
  const group = useRef<THREE.Group>(null)
  const tmp = useRef(new THREE.Vector3())
  useFrame((state) => {
    const r = group.current?.getObjectByName('reflection')
    const fallback = group.current?.getObjectByName('mirror-fallback')
    if (!r || !fallback) return
    const near = r.getWorldPosition(tmp.current).distanceTo(state.camera.position) < 6
    r.visible = near
    fallback.visible = !near
  })
  return (
    <group position-z={-d / 2} ref={group}>
      <Box size={[w, h, 0.012]} at={[0, h / 2, 0.006]} mat={PLAIN.brushedSteel} r={0.004} />
      {reflector && <primitive object={reflector} name="reflection" position={[0, h / 2, 0.0135]} />}
      <mesh name="mirror-fallback" position={[0, h / 2, 0.0132]} material={MIRROR} visible={!reflector}>
        <planeGeometry args={[w - 0.03, h - 0.03]} />
      </mesh>
    </group>
  )
}

const MIRROR = new THREE.MeshStandardMaterial({ color: '#dfe3e3', roughness: 0.02, metalness: 1 })
