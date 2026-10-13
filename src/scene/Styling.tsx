import { useMemo } from 'react'
import * as THREE from 'three'
import { ROOM } from './layout'
import { Model } from './Model'
import { preloadModel } from './models'

/**
 * Fixed styling that completes the room but isn't part of the client's choices.
 * Positions are hand-composed for the default camera.
 */
const PIECES = {
  chair: '/assets/models/mid_century_lounge_chair.glb',
  side: '/assets/models/side_table_01.glb',
  plant: '/assets/models/potted_plant_02.glb',
  console: '/assets/models/modern_wooden_cabinet.glb',
  vaseTall: '/assets/models/ceramic_vase_04.glb',
  vaseWide: '/assets/models/ceramic_vase_02.glb',
}
Object.values(PIECES).forEach(preloadModel)

/**
 * An original abstract artwork drawn at runtime (no third-party imagery):
 * layered earth-tone forms on a warm ground, in a slim oak frame.
 */
function Artwork({ position, rotationY = 0, width = 1.3, height = 0.95 }: { position: [number, number, number]; rotationY?: number; width?: number; height?: number }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 650
    c.height = 475
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#e7dfd2'
    ctx.fillRect(0, 0, c.width, c.height)
    const blob = (x: number, y: number, rx: number, ry: number, rot: number, color: string, alpha = 1) => {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(x, y)
      ctx.rotate(rot)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    blob(230, 260, 170, 140, 0.2, '#c4865f', 0.92)
    blob(410, 200, 150, 120, -0.4, '#3f4a44', 0.88)
    blob(330, 330, 110, 60, 0.1, '#d9b98f', 0.85)
    ctx.fillStyle = '#1f2224'
    ctx.fillRect(470, 300, 6, 120)
    ctx.beginPath()
    ctx.arc(150, 120, 26, 0, Math.PI * 2)
    ctx.fill()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [])
  const frame = 0.035
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh castShadow position-z={0.015}>
        <boxGeometry args={[width + frame * 2, height + frame * 2, 0.03]} />
        <meshStandardMaterial color="#b89470" roughness={0.6} />
      </mesh>
      <mesh position-z={0.031}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
    </group>
  )
}

export function Styling() {
  const consoleX = ROOM.maxX - 0.27
  return (
    <group>
      {/* Lounge chair by the window, angled toward the sofa */}
      <group position={[-1.75, 0, 0.35]} rotation-y={2.35}>
        <Model url={PIECES.chair} />
      </group>
      {/* Side table at the sofa's left arm */}
      <group position={[-1.72, 0, ROOM.backZ + 0.42]}>
        <Model url={PIECES.side} />
      </group>
      <group position={[-1.66, 0.548, ROOM.backZ + 0.4]}>
        <Model url={PIECES.vaseWide} shadow={false} />
      </group>
      {/* Plant in the window corner */}
      <group position={[ROOM.minX + 0.42, 0, ROOM.backZ + 0.42]} rotation-y={0.6}>
        <Model url={PIECES.plant} />
      </group>
      {/* Media console on the right wall, with a vase */}
      <group position={[consoleX, 0, -0.55]} rotation-y={-Math.PI / 2}>
        <Model url={PIECES.console} />
      </group>
      <group position={[consoleX, 0.68, -1.3]}>
        <Model url={PIECES.vaseTall} shadow={false} />
      </group>
      <Artwork position={[0, 1.62, ROOM.backZ + 0.02]} width={1.3} height={0.9} />
    </group>
  )
}
