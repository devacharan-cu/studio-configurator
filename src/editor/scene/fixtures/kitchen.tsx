import type * as THREE from 'three'
import type { AssetDef } from '../../../engine/assets/catalog'
import { BarHandle, Box, GooseneckTap, Slab } from './parts'
import { paint, PLAIN, SURFACES, useSurface, type SurfaceSpec } from './surfaces'

/**
 * Parametric kitchen: base run, island, wall units, tall fridge housing, freestanding fridge, hood.
 * Built like real cabinetry: a recessed plinth, carcasses, separate doors and drawer fronts with 3 mm
 * shadow gaps, bar handles, a 40 mm worktop with real cut-outs for an undermount sink, a ceramic hob,
 * a gooseneck tap and a built-in oven. Finish variants set fronts, worktop and handles together.
 */

interface KitchenFinish {
  front: SurfaceSpec
  top: SurfaceSpec
  handle: keyof typeof PLAIN
}

const KITCHEN_FINISHES: Record<string, KitchenFinish> = {
  'sage-quartz': { front: paint('#8b9a80'), top: SURFACES.quartz, handle: 'brass' },
  'white-oak': { front: paint('#ecebe6'), top: SURFACES.butcherBlock, handle: 'blackSteel' },
  'walnut-terrazzo': { front: SURFACES.walnut, top: SURFACES.terrazzo, handle: 'blackSteel' },
  'charcoal-concrete': { front: paint('#3e3e3c'), top: SURFACES.concrete, handle: 'brushedSteel' },
  'oak-quartz': { front: SURFACES.oak, top: SURFACES.quartz, handle: 'brushedSteel' },
}
const finishOf = (variant?: string) => KITCHEN_FINISHES[variant ?? ''] ?? KITCHEN_FINISHES['sage-quartz']

type Props = { a: AssetDef; variant?: string }

const GAP = 0.003
const FRONT_T = 0.019
const PLINTH = 0.1
const TOP_T = 0.04
const COUNTER = 0.9

/** One base-unit front (doors, drawers, oven or integrated appliance) across the run's width. */
function BaseFront({ kind, x, w, z, front, handle }: { kind: 'drawers' | 'door' | 'doors' | 'oven' | 'panel'; x: number; w: number; z: number; front: THREE.Material; handle: THREE.Material }) {
  const y0 = PLINTH + GAP
  const H = COUNTER - TOP_T - PLINTH - GAP * 2
  const fw = w - GAP * 2
  const fz = z + FRONT_T / 2
  if (kind === 'drawers') {
    const hs = [0.2, 0.26, H - 0.46 - GAP * 2].reverse()
    // bottom of each drawer: cumulative heights from the plinth up
    const bottoms = hs.map((_, i) => y0 + hs.slice(0, i).reduce((s, h) => s + h + GAP, 0))
    return (
      <>
        {hs.map((h, i) => {
          const cy = bottoms[i] + h / 2
          return (
            <group key={i}>
              <Box size={[fw, h, FRONT_T]} at={[x, cy, fz]} mat={front} r={0.002} />
              <BarHandle at={[x, cy + h / 2 - 0.045, z + FRONT_T]} length={Math.min(0.32, fw * 0.55)} mat={handle} />
            </group>
          )
        })}
      </>
    )
  }
  if (kind === 'oven') {
    const drawer = 0.14
    const ovenH = H - drawer - GAP
    return (
      <>
        <Box size={[fw, ovenH, FRONT_T]} at={[x, y0 + drawer + GAP + ovenH / 2, fz]} mat={PLAIN.blackSteel} r={0.002} />
        <Box size={[fw - 0.06, ovenH - 0.17, 0.004]} at={[x, y0 + drawer + GAP + ovenH / 2 - 0.03, fz + FRONT_T / 2 + 0.002]} mat={PLAIN.ovenGlass} shadow={false} />
        <BarHandle at={[x, y0 + drawer + GAP + ovenH - 0.05, z + FRONT_T]} length={fw * 0.8} mat={PLAIN.brushedSteel} />
        <Box size={[fw, drawer, FRONT_T]} at={[x, y0 + drawer / 2, fz]} mat={front} r={0.002} />
        <BarHandle at={[x, y0 + drawer - 0.04, z + FRONT_T]} length={Math.min(0.32, fw * 0.55)} mat={handle} />
      </>
    )
  }
  if (kind === 'doors') {
    const lw = (fw - GAP) / 2
    return (
      <>
        {[-1, 1].map((s) => (
          <group key={s}>
            <Box size={[lw, H, FRONT_T]} at={[x + s * (lw / 2 + GAP / 2), y0 + H / 2, fz]} mat={front} r={0.002} />
            <BarHandle at={[x + s * (GAP / 2 + 0.035), y0 + H - 0.12, z + FRONT_T]} length={0.16} vertical mat={handle} />
          </group>
        ))}
      </>
    )
  }
  return (
    <>
      <Box size={[fw, H, FRONT_T]} at={[x, y0 + H / 2, fz]} mat={front} r={0.002} />
      {kind === 'door' ? <BarHandle at={[x + fw / 2 - 0.04, y0 + H - 0.12, z + FRONT_T]} length={0.16} vertical mat={handle} /> : <BarHandle at={[x, y0 + H - 0.045, z + FRONT_T]} length={fw * 0.55} mat={handle} />}
    </>
  )
}

function Hob({ x, z }: { x: number; z: number }) {
  const rings: [number, number, number][] = [
    [-0.14, -0.1, 0.09],
    [0.14, -0.1, 0.07],
    [-0.14, 0.12, 0.07],
    [0.14, 0.12, 0.1],
  ]
  return (
    <group position={[x, COUNTER, z]}>
      <Box size={[0.58, 0.006, 0.51]} at={[0, 0.003, 0]} mat={PLAIN.ceramicHob} r={0.002} shadow={false} />
      {rings.map(([rx, rz, r], i) => (
        <mesh key={i} position={[rx, 0.0065, rz]} rotation-x={-Math.PI / 2} material={PLAIN.burner}>
          <ringGeometry args={[r - 0.006, r, 40]} />
        </mesh>
      ))}
    </group>
  )
}

function Sink({ x, z, w = 0.5, d = 0.4 }: { x: number; z: number; w?: number; d?: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* undermount bowl, seen through the worktop cut-out */}
      <mesh position={[0, COUNTER - TOP_T - 0.09, 0]} material={PLAIN.sinkInner}>
        <boxGeometry args={[w, 0.2, d]} />
      </mesh>
      <mesh position={[0, COUNTER - TOP_T - 0.188, 0]} rotation-x={-Math.PI / 2} material={PLAIN.blackSteel}>
        <circleGeometry args={[0.035, 24]} />
      </mesh>
    </group>
  )
}

/** Unit layout for a run of width w: ~600 mm units; sink in the second, oven under the hob near the end. */
function layout(w: number) {
  const n = Math.max(1, Math.round(w / 0.6))
  const uw = w / n
  const kinds = Array.from({ length: n }, (_, i): 'drawers' | 'door' | 'doors' | 'oven' | 'panel' => {
    if (n >= 3 && i === 1) return 'doors'
    if (n >= 4 && i === n - 2) return 'oven'
    if (n >= 5 && i === 2) return 'panel' // integrated dishwasher
    return i % 2 === 0 ? 'drawers' : 'door'
  })
  return { n, uw, kinds }
}

export function KitchenRun({ a, variant }: Props) {
  const f = finishOf(variant)
  const front = useSurface(f.front)
  const top = useSurface(f.top)
  const handle = PLAIN[f.handle]
  const { w, d } = a.footprint
  const { uw, kinds } = layout(w)
  const xOf = (i: number) => -w / 2 + uw * (i + 0.5)
  const sinkI = kinds.indexOf('doors')
  const hobI = kinds.indexOf('oven')
  const frontZ = d / 2 - 0.02 - FRONT_T
  const holes = sinkI >= 0 ? [{ x: xOf(sinkI), z: 0.02, w: 0.5, d: 0.4, r: 0.025 }] : []
  return (
    <group>
      <Box size={[w - 0.02, PLINTH, d - 0.1]} at={[0, PLINTH / 2, -0.05]} mat={PLAIN.shadowGap} r={0} />
      <Box size={[w, COUNTER - TOP_T - PLINTH, d - 0.02 - FRONT_T]} at={[0, PLINTH + (COUNTER - TOP_T - PLINTH) / 2, -(0.02 + FRONT_T) / 2]} mat={front} r={0} />
      {kinds.map((k, i) => (
        <BaseFront key={i} kind={k} x={xOf(i)} w={uw} z={frontZ} front={front} handle={handle} />
      ))}
      <Slab w={w} d={d} t={TOP_T} top={COUNTER} holes={holes} mat={top} />
      {sinkI >= 0 && (
        <>
          <Sink x={xOf(sinkI)} z={0.02} />
          <GooseneckTap at={[xOf(sinkI), COUNTER, -d / 2 + 0.07]} mat={PLAIN.chrome} />
        </>
      )}
      {hobI >= 0 && <Hob x={xOf(hobI)} z={0.02} />}
    </group>
  )
}

/** Island with a seating overhang on its front (+z) and waterfall ends; cabinets face the back. */
export function KitchenIsland({ a, variant }: Props) {
  const f = finishOf(variant)
  const front = useSurface(f.front)
  const top = useSurface(f.top)
  const handle = PLAIN[f.handle]
  const { w, d } = a.footprint
  const overhang = Math.min(0.3, d * 0.33)
  const cw = w - 0.08 // between the waterfall ends
  const cd = d - overhang - FRONT_T - 0.01
  const n = Math.max(1, Math.round(cw / 0.6))
  const uw = cw / n
  return (
    <group>
      <Slab w={w} d={d} t={TOP_T} top={COUNTER} mat={top} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[TOP_T, COUNTER - TOP_T, d]} at={[s * (w / 2 - TOP_T / 2), (COUNTER - TOP_T) / 2, 0]} mat={top} r={0.002} />
      ))}
      <group position-z={-d / 2 + FRONT_T + cd / 2}>
        <Box size={[cw, PLINTH, cd - 0.08]} at={[0, PLINTH / 2, 0.04]} mat={PLAIN.shadowGap} r={0} />
        <Box size={[cw, COUNTER - TOP_T - PLINTH, cd]} at={[0, PLINTH + (COUNTER - TOP_T - PLINTH) / 2, 0]} mat={front} r={0} />
        {/* fronts on the working (back, −z) side */}
        <group rotation-y={Math.PI}>
          {Array.from({ length: n }, (_, i) => (
            <BaseFront key={i} kind={i % 2 === 0 ? 'drawers' : 'door'} x={-cw / 2 + uw * (i + 0.5)} w={uw} z={cd / 2} front={front} handle={handle} />
          ))}
        </group>
      </group>
    </group>
  )
}

/** Wall cabinets (wall-mounted asset): doors with handles near the bottom edge. */
export function KitchenWallUnits({ a, variant }: Props) {
  const f = finishOf(variant)
  const front = useSurface(f.front)
  const handle = PLAIN[f.handle]
  const { w, d, h } = a.footprint
  const n = Math.max(1, Math.round(w / 0.6))
  const uw = w / n
  return (
    <group position-z={-d / 2}>
      <Box size={[w, h, d - FRONT_T]} at={[0, h / 2, (d - FRONT_T) / 2]} mat={front} r={0} />
      {Array.from({ length: n }, (_, i) => {
        const x = -w / 2 + uw * (i + 0.5)
        return (
          <group key={i}>
            <Box size={[uw - GAP * 2, h - GAP * 2, FRONT_T]} at={[x, h / 2, d - FRONT_T / 2]} mat={front} r={0.002} />
            <BarHandle at={[x + (i % 2 ? -1 : 1) * (uw / 2 - 0.05), 0.12, d]} length={0.14} vertical mat={handle} />
          </group>
        )
      })}
    </group>
  )
}

/** Tall housing with an integrated fridge (upper door) and freezer (lower door). */
export function KitchenTallFridge({ a, variant }: Props) {
  const f = finishOf(variant)
  const front = useSurface(f.front)
  const handle = PLAIN[f.handle]
  const { w, d, h } = a.footprint
  const fw = w - GAP * 2
  const lower = 0.75
  const upper = h - PLINTH - lower - GAP * 3
  const fz = d / 2 - FRONT_T / 2
  return (
    <group>
      <Box size={[w - 0.02, PLINTH, d - 0.1]} at={[0, PLINTH / 2, -0.05]} mat={PLAIN.shadowGap} r={0} />
      <Box size={[w, h - PLINTH, d - FRONT_T]} at={[0, PLINTH + (h - PLINTH) / 2, -FRONT_T / 2]} mat={front} r={0} />
      <Box size={[fw, lower, FRONT_T]} at={[0, PLINTH + GAP + lower / 2, fz]} mat={front} r={0.002} />
      <Box size={[fw, upper, FRONT_T]} at={[0, PLINTH + GAP * 2 + lower + upper / 2, fz]} mat={front} r={0.002} />
      <BarHandle at={[fw / 2 - 0.045, PLINTH + lower - 0.2, d / 2]} length={0.3} vertical mat={handle} />
      <BarHandle at={[fw / 2 - 0.045, PLINTH + lower + 0.3, d / 2]} length={0.3} vertical mat={handle} />
    </group>
  )
}

/** Freestanding stainless fridge-freezer. */
export function FridgeSteel({ a }: Props) {
  const { w, d, h } = a.footprint
  const split = h * 0.62
  return (
    <group>
      <Box size={[w, h - 0.03, d - 0.04]} at={[0, (h - 0.03) / 2 + 0.03, -0.02]} mat={PLAIN.brushedSteel} r={0.02} />
      <Box size={[w - 0.01, h - split - 0.035, 0.04]} at={[0, split + (h - split) / 2 + 0.01, d / 2 - 0.02]} mat={PLAIN.brushedSteel} r={0.012} />
      <Box size={[w - 0.01, split - 0.04, 0.04]} at={[0, split / 2 + 0.02, d / 2 - 0.02]} mat={PLAIN.brushedSteel} r={0.012} />
      {[split + 0.25, split - 0.25].map((y) => (
        <BarHandle key={y} at={[-w / 2 + 0.06, y, d / 2]} length={0.4} vertical mat={PLAIN.blackSteel} />
      ))}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.04, 0.03, 0.04]} at={[s * (w / 2 - 0.05), 0.015, d / 2 - 0.06]} mat={PLAIN.blackSteel} />
      ))}
    </group>
  )
}

/** Chimney cooker hood (wall-mounted): canopy and a duct cover up to the asset's height. */
export function CookerHood({ a }: Props) {
  const { w, d, h } = a.footprint
  return (
    <group position-z={-d / 2}>
      <Box size={[w, 0.06, d]} at={[0, 0.03, d / 2]} mat={PLAIN.brushedSteel} r={0.004} />
      <mesh position={[0, 0.16, d * 0.4]} material={PLAIN.brushedSteel} castShadow>
        <cylinderGeometry args={[0.16, Math.min(w, d) * 0.55, 0.2, 4, 1, false, Math.PI / 4]} />
      </mesh>
      <Box size={[0.26, h - 0.26, 0.22]} at={[0, 0.26 + (h - 0.26) / 2, 0.11]} mat={PLAIN.brushedSteel} r={0.004} />
    </group>
  )
}
