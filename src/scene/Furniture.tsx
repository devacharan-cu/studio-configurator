import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { getOption } from '../domain/catalog'
import type { CoffeeTableSpec, RugSpec, SofaSpec, SurfaceSpec } from '../domain/types'
import { Interactive } from './Interactive'
import { ANCHORS } from './layout'
import { ContactShadow } from './ContactShadow'
import { Model } from './Model'
import { boxProjectUVs, useSurfaceMaterial } from './surfaces'

/* ---------- Upholstery helpers ---------- */

interface Block {
  size: [number, number, number]
  pos: [number, number, number]
  radius: number
  rotX?: number
}

/** A rounded upholstered block whose fabric UVs are projected in metres from its room position. */
function Upholstery({ block, material }: { block: Block; material: THREE.Material }) {
  const geometry = useMemo(() => {
    const [w, h, d] = block.size
    const g = new RoundedBoxGeometry(w, h, d, 4, Math.min(block.radius, w / 2, h / 2, d / 2) - 0.001)
    return boxProjectUVs(g, new THREE.Vector3(...block.pos))
  }, [block])
  return (
    <mesh geometry={geometry} material={material} position={block.pos} rotation-x={block.rotX ?? 0} castShadow receiveShadow />
  )
}

/**
 * Parametric "Arlo" sofa: built from rounded upholstered blocks, so it can be configured
 * (straight or corner) and re-covered in any approved fabric. Sofa front faces +Z, back at z = 0.
 */
function ModularSofa({ layout, fabric, legs }: { layout: 'straight' | 'corner'; fabric: SurfaceSpec; legs: string }) {
  const material = useSurfaceMaterial(fabric)
  const legMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: legs, roughness: 0.55 }), [legs])

  const blocks = useMemo(() => {
    const out: Block[] = []
    const W = layout === 'corner' ? 2.95 : 2.3
    const D = 0.98
    const arm = 0.2
    const baseH = 0.24
    const plinth = 0.07
    const seatY = plinth + baseH
    const backT = 0.2
    const chaiseD = 1.7
    const chaiseW = 0.9

    // Seat base (frame), back rest frame and arms
    out.push({ size: [W, baseH, D], pos: [0, plinth + baseH / 2, D / 2], radius: 0.04 })
    out.push({ size: [W, 0.46, backT], pos: [0, seatY + 0.23, backT / 2], radius: 0.06 })
    out.push({ size: [arm, 0.3, D], pos: [-W / 2 + arm / 2, seatY + 0.15, D / 2], radius: 0.07 })

    const seatX0 = -W / 2 + arm
    if (layout === 'straight') {
      out.push({ size: [arm, 0.3, D], pos: [W / 2 - arm / 2, seatY + 0.15, D / 2], radius: 0.07 })
      const inner = W - arm * 2
      const n = 3
      const cw = inner / n
      for (let i = 0; i < n; i++) {
        const cx = seatX0 + cw * (i + 0.5)
        out.push({ size: [cw - 0.012, 0.15, D - backT - 0.02], pos: [cx, seatY + 0.075, backT + (D - backT) / 2], radius: 0.06 })
        out.push({ size: [cw - 0.02, 0.44, 0.19], pos: [cx, seatY + 0.36, backT + 0.09], radius: 0.08, rotX: -0.12 })
      }
    } else {
      // Chaise on the right: extended base, long cushion and a low arm along its outer side.
      out.push({ size: [chaiseW + arm, baseH, chaiseD - D], pos: [W / 2 - (chaiseW + arm) / 2, plinth + baseH / 2, D + (chaiseD - D) / 2], radius: 0.04 })
      out.push({ size: [arm, 0.3, chaiseD], pos: [W / 2 - arm / 2, seatY + 0.15, chaiseD / 2], radius: 0.07 })
      const inner = W - arm * 2 - chaiseW
      const n = 2
      const cw = inner / n
      for (let i = 0; i < n; i++) {
        const cx = seatX0 + cw * (i + 0.5)
        out.push({ size: [cw - 0.012, 0.15, D - backT - 0.02], pos: [cx, seatY + 0.075, backT + (D - backT) / 2], radius: 0.06 })
        out.push({ size: [cw - 0.02, 0.44, 0.19], pos: [cx, seatY + 0.36, backT + 0.09], radius: 0.08, rotX: -0.12 })
      }
      const chaiseX = W / 2 - arm - chaiseW / 2
      out.push({ size: [chaiseW - 0.012, 0.15, chaiseD - backT - 0.02], pos: [chaiseX, seatY + 0.075, backT + (chaiseD - backT) / 2], radius: 0.06 })
      out.push({ size: [chaiseW - 0.02, 0.44, 0.19], pos: [chaiseX, seatY + 0.36, backT + 0.09], radius: 0.08, rotX: -0.12 })
    }
    return { blocks: out, W, D, chaise: layout === 'corner' ? { w: chaiseW + arm, d: chaiseD } : null }
  }, [layout])

  return (
    <group>
      <ContactShadow width={blocks.W} depth={blocks.D} z={blocks.D / 2} opacity={0.5} />
      {blocks.chaise && (
        <ContactShadow width={blocks.chaise.w} depth={blocks.chaise.d} x={blocks.W / 2 - blocks.chaise.w / 2} z={blocks.chaise.d / 2} opacity={0.4} />
      )}
      {blocks.blocks.map((b, i) => (
        <Upholstery key={i} block={b} material={material} />
      ))}
      {/* Recessed plinth "legs" — reads as floating on a shadow line */}
      <mesh material={legMaterial} position={[0, 0.035, blocks.D / 2]} castShadow receiveShadow>
        <boxGeometry args={[blocks.W - 0.16, 0.07, blocks.D - 0.16]} />
      </mesh>
      {blocks.chaise && (
        <mesh
          material={legMaterial}
          position={[blocks.W / 2 - blocks.chaise.w / 2, 0.035, blocks.D + (blocks.chaise.d - blocks.D) / 2 - 0.08]}
          castShadow
        >
          <boxGeometry args={[blocks.chaise.w - 0.16, 0.07, blocks.chaise.d - blocks.D]} />
        </mesh>
      )}
    </group>
  )
}

function SofaBody({ spec }: { spec: SofaSpec }) {
  if (spec.kind === 'modular') return <ModularSofa layout={spec.layout} fabric={spec.fabric} legs={spec.legs} />
  return <Model url={spec.url} variant={spec.variant} align="back" />
}

/** Sofas are anchored by their back edge against the back wall. */
export function Sofa({ optionId }: { optionId: string }) {
  const option = getOption('sofa', optionId)
  if (!option) return null
  // The corner unit's chaise projects forward on the right; shift it so the coffee table keeps clear walkway.
  const shiftX = option.spec.kind === 'modular' && option.spec.layout === 'corner' ? 0.5 : 0
  return (
    <Interactive group="sofa">
      <group position={[ANCHORS.sofa.x + shiftX, 0, ANCHORS.sofa.z]}>
        <SofaBody spec={option.spec} />
      </group>
    </Interactive>
  )
}

/* ---------- Coffee tables ---------- */

function Plinth({ spec }: { spec: Extract<CoffeeTableSpec, { kind: 'plinth' }> }) {
  const material = useSurfaceMaterial(spec.surface)
  const geometry = useMemo(() => {
    // Lathe a softly bevelled profile, then stretch the circle into an ellipse.
    const r = 0.5
    const b = 0.018
    const h = spec.height
    const pts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(r - 0.03, 0),
      new THREE.Vector2(r - 0.028, 0.02),
      new THREE.Vector2(r - b, h - b),
      new THREE.Vector2(r - b * 0.3, h - b * 0.3),
      new THREE.Vector2(r - b, h),
      new THREE.Vector2(0, h),
    ]
    const g = new THREE.LatheGeometry(pts, 96)
    g.scale(spec.width, 1, spec.depth)
    g.computeVertexNormals()
    return boxProjectUVs(g)
  }, [spec])
  return (
    <>
      <ContactShadow width={spec.width} depth={spec.depth} opacity={0.5} />
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
    </>
  )
}

export function CoffeeTable({ optionId }: { optionId: string }) {
  const option = getOption('coffeeTable', optionId)
  if (!option) return null
  const spec = option.spec
  return (
    <Interactive group="coffeeTable">
      <group position={[ANCHORS.coffeeTable.x, 0, ANCHORS.coffeeTable.z]}>
        {spec.kind === 'plinth' ? <Plinth spec={spec} /> : <Model url={spec.url} rotationY={spec.rotationY} />}
      </group>
    </Interactive>
  )
}

/* ---------- Rugs ---------- */

const RUG_H = 0.016

function RugBody({ spec }: { spec: Extract<RugSpec, { kind: 'rug' }> }) {
  const material = useSurfaceMaterial(spec.surface)
  const borderW = spec.border ? 0.07 : 0
  const geometry = useMemo(() => {
    const g =
      spec.shape === 'round'
        ? new THREE.CylinderGeometry(spec.width / 2 - borderW, spec.width / 2 - borderW, RUG_H, 128, 1)
        : new RoundedBoxGeometry(spec.width - borderW * 2, RUG_H, spec.depth - borderW * 2, 2, 0.006)
    return boxProjectUVs(g)
  }, [spec, borderW])
  return (
    <group>
      <mesh geometry={geometry} material={material} position-y={RUG_H / 2 + 0.001} receiveShadow castShadow />
      {spec.border && (
        <mesh position-y={RUG_H / 2} receiveShadow>
          <boxGeometry args={[spec.width, RUG_H * 0.92, spec.depth]} />
          <meshStandardMaterial color={spec.border} roughness={0.95} />
        </mesh>
      )}
    </group>
  )
}

export function Rug({ optionId }: { optionId: string }) {
  const option = getOption('rug', optionId)
  if (!option || option.spec.kind === 'none') return null
  return (
    <Interactive group="rug">
      <group position={[ANCHORS.rug.x, 0, ANCHORS.rug.z]}>
        <RugBody spec={option.spec} />
      </group>
    </Interactive>
  )
}
