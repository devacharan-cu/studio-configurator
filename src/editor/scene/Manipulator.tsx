import { useThree } from '@react-three/fiber'
import { useEffect, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { getAsset } from '../../engine/assets/catalog'
import { moveItem, moveOpening } from '../../engine/commands/elements'
import { updateStair } from '../../engine/commands/stairs'
import { moveWall } from '../../engine/commands/structure'
import { openingCenter } from '../../engine/geometry/walls'
import { wallFrame } from '../../engine/model/query'
import type { Project } from '../../engine/model/types'
import { snapLength } from '../plan/snap'
import { useEditor, useProject, type Selection } from '../store'

export interface DragState {
  selection: Selection
  /** World point where the drag started (on the picked surface). */
  startPoint: THREE.Vector3
  pointerId: number
  base: Project
  moved: boolean
}

const LABELS = { wall: 'Move wall', opening: 'Move opening', item: 'Move item', stair: 'Move stairs' } as const

/**
 * Direct manipulation in 3D. Pointer rays are intersected with a horizontal plane through the grab
 * point; the plan-space delta is turned into the *same* commands the 2D editor uses
 * (moveWall / moveOpening / moveItem), so both views edit one model and cannot diverge.
 */
export function Manipulator({ drag }: { drag: MutableRefObject<DragState | null> }) {
  const { camera, gl, raycaster, controls, invalidate } = useThree()

  useEffect(() => {
    const el = gl.domElement
    const plane = new THREE.Plane()
    const hit = new THREE.Vector3()
    const ndc = new THREE.Vector2()
    const setControls = (on: boolean) => {
      if (controls) (controls as unknown as { enabled: boolean }).enabled = on
    }

    const toPlane = (e: PointerEvent, y: number) => {
      const r = el.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      plane.set(new THREE.Vector3(0, 1, 0), -y)
      return raycaster.ray.intersectPlane(plane, hit) ? hit.clone() : null
    }

    const onMove = (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      const p = toPlane(e, d.startPoint.y)
      if (!p) return
      const dx = p.x - d.startPoint.x
      const dz = p.z - d.startPoint.z
      if (!d.moved && Math.hypot(dx, dz) < 0.02) return
      d.moved = true
      const st = useEditor.getState()
      const s = d.selection
      if (s.kind === 'wall') {
        const { normal } = wallFrame(d.base, d.base.walls[s.id])
        const dist = snapLength(dx * normal.x + dz * normal.y)
        st.setPreview(dist === 0 ? null : moveWall(d.base, { wall: s.id, distance: dist }))
      } else if (s.kind === 'opening') {
        const o = d.base.openings[s.id]
        const { dir } = wallFrame(d.base, d.base.walls[o.wall])
        st.setPreview(moveOpening(d.base, { opening: s.id, offset: snapLength(o.offset + dx * dir.x + dz * dir.y) }))
      } else if (s.kind === 'item') {
        const it = d.base.items[s.id]
        st.setPreview(moveItem(d.base, { item: s.id, x: snapLength(it.x + dx), y: snapLength(it.y + dz) }))
      } else if (s.kind === 'stair' && d.base.stairs?.[s.id]) {
        const sr = d.base.stairs[s.id]
        st.setPreview(updateStair(d.base, { stair: s.id, x: snapLength(sr.x + dx), y: snapLength(sr.y + dz) }))
      }
      invalidate()
    }

    const onUp = (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      drag.current = null
      setControls(true)
      if (d.moved && d.selection.kind in LABELS) useEditor.getState().commitPreview(LABELS[d.selection.kind as keyof typeof LABELS])
      else useEditor.getState().cancelPreview()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [camera, gl, raycaster, controls, drag, invalidate])

  return <SelectionGizmo />
}

/** Visual affordance on the selected element: arrows across a wall, a ring under furniture, a bar along an opening. */
function SelectionGizmo() {
  const project = useProject()
  const selection = useEditor((s) => s.selection)
  const level = useEditor((s) => s.level)
  const lv = project.levels[level]
  if (!selection || !lv) return null
  const y0 = lv.elevation

  if (selection.kind === 'wall' && project.walls[selection.id]) {
    const w = project.walls[selection.id]
    const { a, b, normal } = wallFrame(project, w)
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const angle = Math.atan2(normal.y, normal.x)
    const h = Math.min(w.height, useEditor.getState().cutaway ? 1.15 : w.height) + 0.25
    return (
      <group position={[mid.x, y0 + h, mid.y]} rotation-y={-angle} raycast={() => null}>
        {[1, -1].map((s) => (
          <group key={s} rotation-y={s === 1 ? 0 : Math.PI}>
            <mesh position={[w.thickness / 2 + 0.42, 0, 0]} rotation-z={-Math.PI / 2}>
              <coneGeometry args={[0.17, 0.34, 20]} />
              <meshBasicMaterial color="#c0623c" depthTest={false} transparent opacity={0.95} />
            </mesh>
            <mesh position={[w.thickness / 2 + 0.13, 0, 0]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.04, 0.04, 0.26, 10]} />
              <meshBasicMaterial color="#c0623c" depthTest={false} transparent opacity={0.95} />
            </mesh>
          </group>
        ))}
      </group>
    )
  }
  if (selection.kind === 'item' && project.items[selection.id]) {
    const it = project.items[selection.id]
    const a = getAsset(it.asset)
    const r = a ? Math.hypot(a.footprint.w, a.footprint.d) / 2 + 0.1 : 0.6
    return (
      <mesh position={[it.x, y0 + 0.025, it.y]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <ringGeometry args={[r, r + 0.04, 64]} />
        <meshBasicMaterial color="#c0623c" transparent opacity={0.9} depthWrite={false} />
      </mesh>
    )
  }
  if (selection.kind === 'opening' && project.openings[selection.id]) {
    const o = project.openings[selection.id]
    const w = project.walls[o.wall]
    const c = openingCenter(project, o)
    const { dir } = wallFrame(project, w)
    return (
      <mesh position={[c.x, y0 + 0.03, c.y]} rotation-y={-Math.atan2(dir.y, dir.x)} raycast={() => null}>
        <boxGeometry args={[o.width + 0.4, 0.02, w.thickness + 0.25]} />
        <meshBasicMaterial color="#c0623c" transparent opacity={0.55} depthWrite={false} />
      </mesh>
    )
  }
  return null
}
