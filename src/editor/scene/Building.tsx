import type { ThreeEvent } from '@react-three/fiber'
import { memo, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { openingCenter, wallSides, wallSolid, type Face } from '../../engine/geometry/walls'
import { openingsOnWall, roomPolygon, wallFrame, wallsAtNode } from '../../engine/model/query'
import type { Id, Opening, Project, Room, Wall } from '../../engine/model/types'
import { useEditor, type Selection } from '../store'
import { facesToGeometry, polygonGeometry } from './buildGeometry'
import { MATS, useFloorMaterials, useWallMaterials } from './materials'

export interface PickHandlers {
  onPick: (s: Selection, e: ThreeEvent<PointerEvent>) => void
  onHover: (s: Selection | null) => void
}

/** Everything that can change a wall's derived geometry or materials — used as its memo key. */
function wallSignature(p: Project, w: Wall, sides: { left?: Id; right?: Id }, display: number): string {
  const n = (id: Id) => `${p.nodes[id].x.toFixed(4)},${p.nodes[id].y.toFixed(4)}`
  const neighbours = [w.a, w.b]
    .flatMap((id) => wallsAtNode(p, id).map((x) => `${x.id}:${n(x.a)}-${n(x.b)}:${x.thickness}`))
    .join('|')
  const ops = openingsOnWall(p, w.id)
    .map((o) => `${o.offset.toFixed(4)}/${o.width}/${o.height}/${o.sill}/${o.kind}`)
    .join('|')
  const finish = (id?: Id) => (id ? p.rooms[id]?.wallFinish : 'ext')
  return `${w.thickness}/${w.height}/${display}/${neighbours}/${ops}/${finish(sides.left)}/${finish(sides.right)}`
}

const WallMesh = memo(function WallMesh({
  project,
  wall,
  sides,
  display,
  elevation,
  selected,
  signature,
  handlers,
}: {
  project: Project
  wall: Wall
  sides: { left?: Id; right?: Id }
  display: number
  elevation: number
  selected: boolean
  signature: string
  handlers: PickHandlers
}) {
  const materials = useWallMaterials()
  const { geometry, groupsMats } = useMemo(() => {
    const solid = wallSolid(project, wall, elevation, display)
    const finishOf = (room?: Id) => (room ? project.rooms[room]?.wallFinish ?? 'chalk-white' : 'exterior-render')
    const buckets: { key: string; faces: Face[]; mat: THREE.Material }[] = []
    const put = (key: string, mat: THREE.Material, f: Face) => {
      let b = buckets.find((x) => x.key === key)
      if (!b) buckets.push((b = { key, faces: [], mat }))
      b.faces.push(f)
    }
    for (const f of solid.faces) {
      if (f.role === 'left') put(`L${finishOf(sides.left)}`, materials.get(finishOf(sides.left))!, f)
      else if (f.role === 'right') put(`R${finishOf(sides.right)}`, materials.get(finishOf(sides.right))!, f)
      else if (f.role === 'top') put('top', display < wall.height ? MATS.wallTop : MATS.trim, f)
      else put('trim', MATS.trim, f)
    }
    // one geometry with groups → one mesh, a few draw calls
    const parts = buckets.map((b) => facesToGeometry(b.faces))
    const merged = new THREE.BufferGeometry()
    const attrs = ['position', 'normal', 'uv'] as const
    for (const a of attrs) {
      const arrays = parts.map((g) => g.getAttribute(a).array as Float32Array)
      const out = new Float32Array(arrays.reduce((s, x) => s + x.length, 0))
      let o = 0
      for (const arr of arrays) {
        out.set(arr, o)
        o += arr.length
      }
      merged.setAttribute(a, new THREE.BufferAttribute(out, a === 'uv' ? 2 : 3))
    }
    let start = 0
    parts.forEach((g, i) => {
      const count = g.getAttribute('position').count
      merged.addGroup(start, count, i)
      start += count
      g.dispose()
    })
    merged.computeBoundingSphere()
    return { geometry: merged, groupsMats: buckets.map((b) => b.mat) }
    // `signature` captures every project dependency of this wall's geometry (corners, neighbours, openings, finishes)
  }, [materials, elevation, display, signature]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <group>
      <mesh
        geometry={geometry}
        material={groupsMats}
        castShadow
        receiveShadow
        name={`wall:${wall.id}`}
        onPointerDown={(e) => handlers.onPick({ kind: 'wall', id: wall.id }, e)}
        onPointerOver={(e) => {
          e.stopPropagation()
          handlers.onHover({ kind: 'wall', id: wall.id })
        }}
        onPointerOut={() => handlers.onHover(null)}
      />
      {selected && <mesh geometry={geometry} material={MATS.selection} raycast={() => null} renderOrder={2} />}
    </group>
  )
}, (a, b) => a.signature === b.signature && a.selected === b.selected && a.elevation === b.elevation && a.handlers === b.handlers)

function Floor({ project, room, elevation, handlers, selected }: { project: Project; room: Room; elevation: number; handlers: PickHandlers; selected: boolean }) {
  const mats = useFloorMaterials()
  const key = room.boundary.map((id) => `${project.nodes[id].x},${project.nodes[id].y}`).join('|')
  const geometry = useMemo(() => polygonGeometry(roomPolygon(project, room), elevation, true), [key, elevation]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <group>
      <mesh
        geometry={geometry}
        material={mats.get(room.floorFinish) ?? mats.values().next().value}
        receiveShadow
        name={`floor:${room.id}`}
        onPointerDown={(e) => handlers.onPick({ kind: 'room', id: room.id }, e)}
        onPointerOver={(e) => {
          e.stopPropagation()
          handlers.onHover({ kind: 'room', id: room.id })
        }}
        onPointerOut={() => handlers.onHover(null)}
      />
      {selected && <mesh geometry={geometry} material={MATS.selection} position-y={0.002} raycast={() => null} />}
    </group>
  )
}

function Ceiling({ project, room, y }: { project: Project; room: Room; y: number }) {
  const key = room.boundary.map((id) => `${project.nodes[id].x},${project.nodes[id].y}`).join('|')
  const geometry = useMemo(() => polygonGeometry(roomPolygon(project, room), y, false), [key, y]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={MATS.ceiling} receiveShadow castShadow raycast={() => null} />
}

/** Door leaves, frames and window glazing — parametric, from each opening's model data. */
function OpeningFixtures({ project, o, elevation, display, handlers, selected }: { project: Project; o: Opening; elevation: number; display: number; handlers: PickHandlers; selected: boolean }) {
  const w = project.walls[o.wall]
  const { dir } = wallFrame(project, w)
  const c = openingCenter(project, o)
  const angle = Math.atan2(dir.y, dir.x)
  const t = w.thickness
  const top = o.sill + o.height
  if (o.sill >= display) return null
  const frame = 0.045
  const pick = {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => handlers.onPick({ kind: 'opening', id: o.id }, e),
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      handlers.onHover({ kind: 'opening', id: o.id })
    },
    onPointerOut: () => handlers.onHover(null),
  }
  const showTop = top <= display
  const visibleTop = Math.min(top, display)
  const mat = selected ? MATS.selection : null
  return (
    // local frame: x along the wall, z across it (+z = wall's left side), y up
    <group position={[c.x, elevation, c.y]} rotation-y={-angle} name={`opening:${o.id}`}>
      {o.kind !== 'passage' && (
        <>
          {/* jamb linings */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[(s * (o.width - frame)) / 2, o.sill + Math.min(o.height, display - o.sill) / 2, 0]} material={mat ?? (o.kind === 'door' ? MATS.oak : MATS.frame)} castShadow {...pick}>
              <boxGeometry args={[frame, Math.min(o.height, display - o.sill), t + 0.02]} />
            </mesh>
          ))}
          {showTop && (
            <mesh position={[0, top - frame / 2, 0]} material={mat ?? (o.kind === 'door' ? MATS.oak : MATS.frame)} castShadow {...pick}>
              <boxGeometry args={[o.width, frame, t + 0.02]} />
            </mesh>
          )}
        </>
      )}
      {o.kind === 'window' && (
        <>
          {/* glazing is clipped to the displayed (cut-away) wall height */}
          <mesh position={[0, o.sill + (visibleTop - o.sill) / 2, 0]} material={MATS.glass} {...pick}>
            <boxGeometry args={[o.width - frame * 2, Math.max(0.01, visibleTop - o.sill - (showTop ? frame * 2 : frame)), 0.012]} />
          </mesh>
          <mesh position={[0, o.sill - 0.015, 0]} material={MATS.trim} castShadow receiveShadow>
            <boxGeometry args={[o.width + 0.06, 0.03, t + 0.08]} />
          </mesh>
          {o.width > 1.0 && (
            <mesh position={[0, o.sill + (visibleTop - o.sill) / 2, 0]} material={MATS.frame}>
              <boxGeometry args={[0.035, Math.max(0.01, visibleTop - o.sill - frame), 0.05]} />
            </mesh>
          )}
        </>
      )}
      {o.kind === 'door' && showTop && <DoorLeaf o={o} t={t} />}
      {o.kind === 'passage' && <mesh position={[0, o.sill + o.height / 2, 0]} visible={false} {...pick}><boxGeometry args={[o.width, o.height, t]} /></mesh>}
    </group>
  )
}

/** Leaf opened ~85° into the swing side so the walkthrough can pass. */
function DoorLeaf({ o, t }: { o: Opening; t: number }) {
  const leafW = o.width - 0.09
  const hingeX = (o.hinge === 'a' ? -1 : 1) * (leafW / 2)
  const side = o.swing === 'left' ? 1 : -1
  const open = (85 * Math.PI) / 180
  // rotate about the hinge; leaf extends from hinge toward the other jamb when closed
  const rot = (o.hinge === 'a' ? -1 : 1) * side * open
  return (
    <group position={[hingeX, 0, (side * t) / 2]} rotation-y={rot}>
      <mesh position={[(o.hinge === 'a' ? 1 : -1) * (leafW / 2), o.height / 2 - 0.02, 0]} material={MATS.door} castShadow receiveShadow>
        <boxGeometry args={[leafW, o.height - 0.04, 0.04]} />
      </mesh>
      <mesh position={[(o.hinge === 'a' ? 1 : -1) * (leafW - 0.08), 1.0, 0.035 * side]} material={MATS.steel}>
        <boxGeometry args={[0.12, 0.02, 0.02]} />
      </mesh>
    </group>
  )
}

export function Building({ project, level, cutaway, ceilings, handlers }: { project: Project; level: Id; cutaway: boolean; ceilings: boolean; handlers: PickHandlers }) {
  const selection = useEditor((s) => s.selection)
  const lv = project.levels[level]
  const sides = useMemo(() => wallSides(project), [project])
  if (!lv) return null
  const display = cutaway ? 1.15 : Infinity
  const walls = Object.values(project.walls).filter((w) => w.level === level)
  const rooms = Object.values(project.rooms).filter((r) => r.level === level)
  return (
    <group>
      {walls.map((w) => {
        const s = sides[w.id] ?? {}
        const disp = Math.min(w.height, display)
        return (
          <WallMesh
            key={w.id}
            project={project}
            wall={w}
            sides={s}
            display={disp}
            elevation={lv.elevation}
            selected={selection?.kind === 'wall' && selection.id === w.id}
            signature={wallSignature(project, w, s, disp)}
            handlers={handlers}
          />
        )
      })}
      {rooms.map((r) => (
        <Floor key={r.id} project={project} room={r} elevation={lv.elevation} handlers={handlers} selected={selection?.kind === 'room' && selection.id === r.id} />
      ))}
      {ceilings && !cutaway && rooms.map((r) => <Ceiling key={`c-${r.id}`} project={project} room={r} y={lv.elevation + lv.height} />)}
      {Object.values(project.openings)
        .filter((o) => project.walls[o.wall]?.level === level)
        .map((o) => (
          <OpeningFixtures
            key={o.id}
            project={project}
            o={o}
            elevation={lv.elevation}
            display={Math.min(project.walls[o.wall].height, display)}
            handlers={handlers}
            selected={selection?.kind === 'opening' && selection.id === o.id}
          />
        ))}
    </group>
  )
}
