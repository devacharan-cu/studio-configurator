import type { ThreeEvent } from '@react-three/fiber'
import type { ReactNode } from 'react'
import type { GroupId } from '../domain/types'
import { useStore } from '../state/store'

/** Pixels the pointer may travel between down and up and still count as a click (not an orbit drag). */
const CLICK_TOLERANCE = 6

/** Makes everything inside clickable: a click opens that customisation group and frames it. */
export function Interactive({ group, children }: { group: GroupId; children: ReactNode }) {
  const setActiveGroup = useStore((s) => s.setActiveGroup)
  const setHoveredGroup = useStore((s) => s.setHoveredGroup)
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        if (e.delta > CLICK_TOLERANCE) return
        setActiveGroup(group, { focus: true })
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        if (e.pointerType === 'mouse') setHoveredGroup(group)
      }}
      onPointerOut={() => setHoveredGroup(null)}
    >
      {children}
    </group>
  )
}
