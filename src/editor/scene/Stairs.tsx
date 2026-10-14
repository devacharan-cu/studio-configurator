import { memo, useEffect, useMemo } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'
import { roomAt, roomInnerPolygon } from '../../engine/commands/structure'
import { pointInPolygon } from '../../engine/geometry/polygon'
import { add, lerp, scale, type V2 } from '../../engine/geometry/vec'
import { stairGeometry, stairsOf, type StairGeometry } from '../../engine/model/stairs'
import type { Id, Project, Stair } from '../../engine/model/types'
import { useEditor } from '../store'
import type { PickHandlers } from './Building'
import { getFloorFinish } from '../../engine/assets/finishes'
import { MATS, useFinishMaterial } from './materials'

/** Balustrade glass: clearer and less mirror-like than window glazing, which reads blue when seen edge-on indoors. */
const RAIL_GLASS = new THREE.MeshPhysicalMaterial({ color: '#eef2f0', roughness: 0.08, metalness: 0, ior: 1.5, envMapIntensity: 0.35, transparent: true, opacity: 0.16, depthWrite: false })

const SLAB = 0.3
const RAIL_H = 0.9
const GUARD_H = 1.0

/** True if a side of the flight (or stairwell) runs along a wall: sampled just outside that side. */
function againstWall(p: Project, level: Id, from: V2, to: V2, outward: V2): boolean {
  const room = roomAt(p, level, lerp(from, to, 0.5))
  if (!room) return false
  const inner = roomInnerPolygon(p, room.id)
  return [0.15, 0.5, 0.85].every((t) => !pointInPolygon(add(lerp(from, to, t), scale(outward, 0.12)), inner))
}

/** A box whose UVs are in metres on every face, so a tiling finish keeps its real scale. */
function meterBox(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d)
  const uv = g.getAttribute('uv')
  // BoxGeometry faces: +x, −x, +y, −y, +z, −z (four vertices each)
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  for (let f = 0; f < 6; f++)
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i
      uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1])
    }
  return g
}

/** Solid timber steps, one merged mesh per flight (planks run across the tread, at their real size). */
function Steps({ risers, riser, going, width, material }: { risers: number; riser: number; going: number; width: number; material: THREE.Material }) {
  const geometry = useMemo(() => {
    const parts = Array.from({ length: risers }, (_, i) => meterBox(going + 0.002, riser, width).translate((i + 0.5) * going, (i + 0.5) * riser, 0))
    const merged = mergeGeometries(parts)
    for (const p of parts) p.dispose()
    return merged
  }, [risers, riser, going, width])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />
}

/** A box in the flight's frame: u along the run, h up from the lower floor, v across (centred). */
function Part({ u, h, v = 0, size, tilt = 0, material, shadow = true }: { u: number; h: number; v?: number; size: [number, number, number]; tilt?: number; material: THREE.Material; shadow?: boolean }) {
  return (
    <mesh position={[u, h, v]} rotation-z={tilt} material={material} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  )
}

/**
 * One flight, built from its derived numbers: solid timber steps on a plastered concrete waist (the
 * underside reads as a soffit), a glass balustrade with a steel handrail on each open side, and a
 * wall-mounted handrail where the flight runs along a wall.
 */
function Flight({ g, walls, tread }: { g: StairGeometry; walls: [boolean, boolean]; tread: THREE.Material }) {
  const { stair: s, risers, riser, going, rise } = g
  const L = s.length
  const W = s.width
  const pitch = Math.atan2(rise, L)
  const hyp = Math.hypot(L, rise)
  const waist = 0.16
  const sides: [number, boolean][] = [
    [-1, walls[0]],
    [1, walls[1]],
  ]
  return (
    <group>
      <Steps risers={risers} riser={riser} going={going} width={W} material={tread} />
      {/* waist slab under the steps: its top runs through every step's inner corner */}
      <Part u={L / 2 + Math.sin(pitch) * (waist / 2)} h={rise / 2 - Math.cos(pitch) * (waist / 2)} size={[hyp, waist, W]} tilt={pitch} material={MATS.trim} />
      {sides.map(([side, wall]) => {
        const v = side * (W / 2 - 0.035)
        const railU = L / 2
        const railH = rise / 2 + riser / 2 + RAIL_H
        return wall ? (
          // wall rail on brackets, 6 cm off the wall
          <group key={side}>
            <Part u={railU} h={railH} v={side * (W / 2 - 0.06)} size={[hyp, 0.045, 0.045]} tilt={pitch} material={MATS.oak} />
          </group>
        ) : (
          <group key={side}>
            <Part u={railU} h={rise / 2 + riser / 2 + RAIL_H / 2} v={v} size={[hyp, RAIL_H - 0.05, 0.012]} tilt={pitch} material={RAIL_GLASS} shadow={false} />
            <Part u={railU} h={railH} v={v} size={[hyp, 0.05, 0.05]} tilt={pitch} material={MATS.steel} />
          </group>
        )
      })}
    </group>
  )
}

/** Stairwell on the floor above: slab-edge lining around the void, and a glass guard on every side but the arrival edge. */
function Stairwell({ g, open }: { g: StairGeometry; open: boolean[] }) {
  const [bl, br, tr, tl] = g.corners
  const y = g.to!.elevation
  // edges: left side, right side, bottom (all guarded unless against a wall); the top edge is where you arrive
  const edges: [V2, V2, boolean][] = [
    [bl, tl, open[0]],
    [br, tr, open[1]],
    [bl, br, open[2]],
    [tl, tr, false],
  ]
  return (
    <group>
      {edges.map(([a, b, guard], i) => {
        const mid = lerp(a, b, 0.5)
        const len = Math.hypot(b.x - a.x, b.y - a.y)
        const ang = -Math.atan2(b.y - a.y, b.x - a.x)
        return (
          <group key={i} position={[mid.x, y, mid.y]} rotation-y={ang}>
            <mesh position={[0, -SLAB / 2, 0]} material={MATS.trim} receiveShadow>
              <boxGeometry args={[len, SLAB - 0.01, 0.02]} />
            </mesh>
            {guard && (
              <>
                <mesh position={[0, GUARD_H / 2, 0]} material={RAIL_GLASS}>
                  <boxGeometry args={[len, GUARD_H - 0.05, 0.012]} />
                </mesh>
                <mesh position={[0, GUARD_H, 0]} material={MATS.steel} castShadow>
                  <boxGeometry args={[len + 0.05, 0.05, 0.05]} />
                </mesh>
                <mesh position={[0, 0.03, 0]} material={MATS.steel}>
                  <boxGeometry args={[len, 0.06, 0.04]} />
                </mesh>
              </>
            )}
          </group>
        )
      })}
    </group>
  )
}

const StairObject = memo(function StairObject({ project, stair, showFlight, showWell, selected, handlers }: { project: Project; stair: Stair; showFlight: boolean; showWell: boolean; selected: boolean; handlers: PickHandlers }) {
  const tread = useFinishMaterial(getFloorFinish('light-oak-plank'))
  const g = useMemo(() => stairGeometry(project, stair), [project, stair])
  const { walls, open } = useMemo(() => {
    const [bl, br, tr, tl] = g.corners
    const left = scale(g.side, -1)
    const below: [boolean, boolean] = [againstWall(project, stair.level, bl, tl, left), againstWall(project, stair.level, br, tr, g.side)]
    const up = g.to?.id
    const open = up ? [!againstWall(project, up, bl, tl, left), !againstWall(project, up, br, tr, g.side), !againstWall(project, up, bl, br, scale(g.dir, -1))] : [true, true, true]
    return { walls: below, open }
  }, [project, stair, g])
  const pick = {
    onPointerDown: (e: Parameters<PickHandlers['onPick']>[1]) => handlers.onPick({ kind: 'stair', id: stair.id }, e),
    onPointerOver: (e: Parameters<PickHandlers['onPick']>[1]) => {
      e.stopPropagation()
      handlers.onHover({ kind: 'stair', id: stair.id })
    },
    onPointerOut: () => handlers.onHover(null),
  }
  return (
    <group name={`stair:${stair.id}`}>
      {showFlight && (
        <group position={[g.bottomMid.x, g.from.elevation, g.bottomMid.y]} rotation-y={stair.rotation} {...pick}>
          <Flight g={g} walls={walls} tread={tread} />
          {selected && (
            <mesh position={[stair.length / 2, g.rise / 2, 0]} rotation-z={Math.atan2(g.rise, stair.length)} material={MATS.selection} raycast={() => null}>
              <boxGeometry args={[Math.hypot(stair.length, g.rise), 0.02, stair.width + 0.02]} />
            </mesh>
          )}
        </group>
      )}
      {showWell && g.to && <Stairwell g={g} open={open} />}
    </group>
  )
})

/** Every flight whose lower floor is shown, and every stairwell on a shown floor. */
export function Stairs({ project, levels, handlers }: { project: Project; levels: Set<Id>; handlers: PickHandlers }) {
  const selection = useEditor((s) => s.selection)
  return (
    <>
      {stairsOf(project).map((s) => {
        const up = stairGeometry(project, s).to?.id
        const showWell = !!up && levels.has(up)
        if (!levels.has(s.level) && !showWell) return null
        return <StairObject key={s.id} project={project} stair={s} showFlight={levels.has(s.level)} showWell={showWell} selected={selection?.kind === 'stair' && selection.id === s.id} handlers={handlers} />
      })}
    </>
  )
}
