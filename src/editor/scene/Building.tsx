import type { ThreeEvent } from '@react-three/fiber'
import { memo, useEffect, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { skirtingRuns } from '../../engine/geometry/site'
import { openingCenter, wallSides, wallSolid, type Face } from '../../engine/geometry/walls'
import { openingsOnWall, roomPolygon, wallFrame, wallsAtNode } from '../../engine/model/query'
import { isOutdoor, type Id, type Opening, type Project, type Room, type Wall } from '../../engine/model/types'
import { useEditor, type Selection } from '../store'
import { facesToGeometry, polygonGeometry } from './buildGeometry'
import { finishById, getExteriorFinish, getFloorFinish, WALL_FINISHES, type FinishDef } from '../../engine/assets/finishes'
import { MATS, useFinishMaterial } from './materials'

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
  const finish = (id?: Id) => (id ? p.rooms[id]?.wallFinish : `ext:${p.facade ?? ''}`)
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
  // each face's finish: the room's wall finish, or the building's facade outside
  const finishOf = (room?: Id) => (room ? project.rooms[room]?.wallFinish ?? 'chalk-white' : getExteriorFinish(project.facade).id)
  const leftId = finishOf(sides.left)
  const rightId = finishOf(sides.right)
  const leftMat = useFinishMaterial(finishById(leftId) ?? WALL_FINISHES[0], `wall:${leftId}`)
  const rightMat = useFinishMaterial(finishById(rightId) ?? WALL_FINISHES[0], `wall:${rightId}`)
  const { geometry, groupsMats } = useMemo(() => {
    const solid = wallSolid(project, wall, elevation, display)
    const buckets: { key: string; faces: Face[]; mat: THREE.Material }[] = []
    const put = (key: string, mat: THREE.Material, f: Face) => {
      let b = buckets.find((x) => x.key === key)
      if (!b) buckets.push((b = { key, faces: [], mat }))
      b.faces.push(f)
    }
    for (const f of solid.faces) {
      if (f.role === 'left') put(`L${leftId}`, leftMat, f)
      else if (f.role === 'right') put(`R${rightId}`, rightMat, f)
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
  }, [leftMat, rightMat, elevation, display, signature]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const floor = getFloorFinish(room.floorFinish)
  const material = useFinishMaterial(floor, `floor:${floor.id}`)
  const key = room.boundary.map((id) => `${project.nodes[id].x},${project.nodes[id].y}`).join('|')
  const geometry = useMemo(() => polygonGeometry(roomPolygon(project, room), elevation, true), [key, elevation]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <group>
      <mesh
        geometry={geometry}
        material={material}
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

/** Ceilings: a fine plaster texture (the chalk-white wall plaster, scaled up and flattened). */
const CEILING: FinishDef = { id: 'ceiling', name: 'Ceiling plaster', texture: 'plastered_wall_04', tileSize: 4, tint: '#f6f3ee', normalScale: 0.15, swatch: '#f4f1ec' }

function Ceiling({ project, room, y }: { project: Project; room: Room; y: number }) {
  const material = useFinishMaterial(CEILING)
  const key = room.boundary.map((id) => `${project.nodes[id].x},${project.nodes[id].y}`).join('|')
  const geometry = useMemo(() => polygonGeometry(roomPolygon(project, room), y, false), [key, y]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} receiveShadow castShadow raycast={() => null} />
}

/** Exterior side of a wall in the opening's local frame (+z = the wall's left side), or 0 if interior. */
type ExtSide = 1 | -1 | 0

const box = (key: string, pos: [number, number, number], size: [number, number, number], material: THREE.Material, shadow = true) => (
  <mesh key={key} position={pos} material={material} castShadow={shadow} receiveShadow>
    <boxGeometry args={size} />
  </mesh>
)

/**
 * Door and window joinery, parametric from each opening's model data:
 * - windows: a slim frame and glazing bars set in the middle of the wall, glass, an external sill and an internal board;
 * - doors and passages: a lining across the wall thickness and an architrave on both faces;
 * - doors: a leaf hung on its hinge side, opened into its swing side so the walkthrough can pass, with lever handles.
 */
function OpeningFixtures({ project, o, elevation, display, ext, handlers, selected }: { project: Project; o: Opening; elevation: number; display: number; ext: ExtSide; handlers: PickHandlers; selected: boolean }) {
  const w = project.walls[o.wall]
  const { dir } = wallFrame(project, w)
  const c = openingCenter(project, o)
  const angle = Math.atan2(dir.y, dir.x)
  const t = w.thickness
  const top = o.sill + o.height
  if (o.sill >= display) return null
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
  const h = visibleTop - o.sill
  const trim = selected ? MATS.selection : MATS.trim
  const frameMat = selected ? MATS.selection : MATS.frame
  const parts: ReactNode[] = []
  if (o.kind === 'window') {
    const fw = 0.055 // frame face width
    const fd = 0.07 // frame depth
    const W = o.width
    parts.push(
      box('jl', [-(W - fw) / 2, o.sill + h / 2, 0], [fw, h, fd], frameMat),
      box('jr', [(W - fw) / 2, o.sill + h / 2, 0], [fw, h, fd], frameMat),
      box('rail', [0, o.sill + fw / 2, 0], [W, fw, fd], frameMat),
    )
    if (showTop) parts.push(box('head', [0, top - fw / 2, 0], [W, fw, fd], frameMat))
    const glassH = Math.max(0.01, h - fw - (showTop ? fw : 0))
    const glassY = o.sill + fw + glassH / 2
    if (W > 1.0) parts.push(box('mullion', [0, glassY, 0], [0.04, glassH, fd * 0.85], frameMat))
    parts.push(
      <mesh key="glass" position={[0, glassY, 0]} material={MATS.glass}>
        <boxGeometry args={[W - fw * 2, glassH, 0.012]} />
      </mesh>,
    )
    // external sill (projects past the outer face) and internal window board
    const out = ext || 1
    parts.push(box('sill-out', [0, o.sill - 0.02, out * (t / 4 + 0.03)], [W + 0.1, 0.04, t / 2 + 0.06], ext ? MATS.sill : trim))
    parts.push(box('sill-in', [0, o.sill - 0.012, -out * (t / 4 + 0.012)], [W + 0.04, 0.024, t / 2 + 0.024], trim))
  } else {
    // lining across the wall, and architraves on both faces
    const lt = 0.025
    const aw = 0.07
    const ad = 0.016
    parts.push(
      box('ll', [-(o.width - lt) / 2, h / 2, 0], [lt, h, t + 0.004], trim, false),
      box('lr', [(o.width - lt) / 2, h / 2, 0], [lt, h, t + 0.004], trim, false),
    )
    if (showTop) parts.push(box('lh', [0, top - lt / 2, 0], [o.width, lt, t + 0.004], trim, false))
    const legH = Math.min(top + aw - 0.01, display)
    for (const side of [1, -1] as const) {
      const z = side * (t / 2 + ad / 2)
      parts.push(
        box(`al${side}`, [-(o.width / 2 + aw / 2 - 0.01), legH / 2, z], [aw, legH, ad], trim, false),
        box(`ar${side}`, [o.width / 2 + aw / 2 - 0.01, legH / 2, z], [aw, legH, ad], trim, false),
      )
      if (top + aw - 0.01 <= display) parts.push(box(`ah${side}`, [0, top + aw / 2 - 0.01, z], [o.width + aw * 2 - 0.02, aw, ad], trim, false))
    }
    if (o.kind === 'passage')
      parts.push(
        <mesh key="pick" position={[0, h / 2, 0]} visible={false}>
          <boxGeometry args={[o.width, h, t]} />
        </mesh>,
      )
  }
  return (
    // local frame: x along the wall, z across it (+z = wall's left side), y up
    <group position={[c.x, elevation, c.y]} rotation-y={-angle} name={`opening:${o.id}`} {...pick}>
      {parts}
      {o.kind === 'door' && showTop && <DoorLeaf o={o} t={t} exterior={ext !== 0} selected={selected} />}
    </group>
  )
}

/** Leaf opened ~85° into the swing side so the walkthrough can pass; lever handles on both faces. */
function DoorLeaf({ o, t, exterior, selected }: { o: Opening; t: number; exterior: boolean; selected: boolean }) {
  const lt = 0.044
  const leafW = o.width - 0.05 - 0.006
  const along = o.hinge === 'a' ? 1 : -1
  const hingeX = -along * (o.width / 2 - 0.025)
  const side = o.swing === 'left' ? 1 : -1
  const open = (85 * Math.PI) / 180
  // rotate about the hinge; the leaf extends from the hinge toward the other jamb when closed
  const rot = -along * side * open
  const handleX = along * (leafW - 0.07)
  return (
    <group position={[hingeX, 0, side * (t / 2 - lt / 2 - 0.01)]} rotation-y={rot}>
      <mesh position={[along * (leafW / 2), (o.height - 0.038) / 2 + 0.008, 0]} material={selected ? MATS.selection : exterior ? MATS.frontDoor : MATS.door} castShadow receiveShadow>
        <boxGeometry args={[leafW, o.height - 0.038, lt]} />
      </mesh>
      {[1, -1].map((f) => (
        <group key={f} position={[handleX, 1.02, f * (lt / 2)]}>
          <mesh rotation-x={Math.PI / 2} position-z={f * 0.005} material={MATS.steel}>
            <cylinderGeometry args={[0.026, 0.026, 0.01, 20]} />
          </mesh>
          <mesh rotation-x={Math.PI / 2} position-z={f * 0.03} material={MATS.steel}>
            <cylinderGeometry args={[0.009, 0.009, 0.05, 12]} />
          </mesh>
          <mesh position={[-along * 0.055, 0, f * 0.055]} material={MATS.steel} castShadow>
            <boxGeometry args={[0.13, 0.018, 0.018]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Skirting boards along every room's inner wall faces (one mesh for the level), stopped at doors. */
function Skirting({ project, level }: { project: Project; level: Id }) {
  const geometry = useMemo(() => {
    const H = 0.09
    const D = 0.014
    const faces: Face[] = []
    const y0 = project.levels[level]?.elevation ?? 0
    for (const r of Object.values(project.rooms).filter((x) => x.level === level && !isOutdoor(x))) {
      for (const run of skirtingRuns(project, r)) {
        const n = run.inward
        const { a, b } = run
        const a2 = { x: a.x + n.x * D, y: a.y + n.y * D }
        const b2 = { x: b.x + n.x * D, y: b.y + n.y * D }
        const l = Math.hypot(b.x - a.x, b.y - a.y)
        const u = { x: (b.x - a.x) / l, y: (b.y - a.y) / l }
        faces.push(
          { role: 'cap', normal: [n.x, 0, n.y], points: [[a2.x, y0, a2.y], [b2.x, y0, b2.y], [b2.x, y0 + H, b2.y], [a2.x, y0 + H, a2.y]] },
          { role: 'top', normal: [0, 1, 0], points: [[a.x, y0 + H, a.y], [b.x, y0 + H, b.y], [b2.x, y0 + H, b2.y], [a2.x, y0 + H, a2.y]] },
          { role: 'cap', normal: [-u.x, 0, -u.y], points: [[a.x, y0, a.y], [a2.x, y0, a2.y], [a2.x, y0 + H, a2.y], [a.x, y0 + H, a.y]] },
          { role: 'cap', normal: [u.x, 0, u.y], points: [[b.x, y0, b.y], [b2.x, y0, b2.y], [b2.x, y0 + H, b2.y], [b.x, y0 + H, b.y]] },
        )
      }
    }
    return facesToGeometry(faces)
  }, [project, level])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={MATS.trim} receiveShadow raycast={() => null} name="skirting" />
}

const extSide = (s?: { left?: Id; right?: Id }): ExtSide => (!s || (!s.left && !s.right) || (s.left && s.right) ? 0 : s.left ? -1 : 1)

export function Building({ project, level, cutaway, ceilings, handlers }: { project: Project; level: Id; cutaway: boolean; ceilings: boolean; handlers: PickHandlers }) {
  const selection = useEditor((s) => s.selection)
  const lv = project.levels[level]
  // open-air rooms (courtyard, balcony) don't count: their walls get the facade finish and exterior sills
  const sides = useMemo(() => wallSides(project, true), [project])
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
      <Skirting project={project} level={level} />
      {ceilings && !cutaway && rooms.filter((r) => !isOutdoor(r)).map((r) => <Ceiling key={`c-${r.id}`} project={project} room={r} y={lv.elevation + lv.height} />)}
      {Object.values(project.openings)
        .filter((o) => project.walls[o.wall]?.level === level)
        .map((o) => (
          <OpeningFixtures
            key={o.id}
            project={project}
            o={o}
            elevation={lv.elevation}
            display={Math.min(project.walls[o.wall].height, display)}
            ext={extSide(sides[o.wall])}
            handlers={handlers}
            selected={selection?.kind === 'opening' && selection.id === o.id}
          />
        ))}
    </group>
  )
}
