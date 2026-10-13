import type { MutableRefObject } from 'react'
import type * as THREE from 'three'
import type { Project } from '../../engine/model/types'
import type { Selection } from '../store'

export interface DragState {
  selection: Selection
  startPoint: THREE.Vector3
  pointerId: number
  base: Project
  moved: boolean
}

/** Direct 3D manipulation — implemented in M3. Selection already works through picking. */
export function Manipulator({ drag }: { drag: MutableRefObject<DragState | null> }) {
  void drag
  return null
}
