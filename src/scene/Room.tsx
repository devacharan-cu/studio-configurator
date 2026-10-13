import { useMemo } from 'react'
import * as THREE from 'three'
import { getOption } from '../domain/catalog'
import type { FloorOption, WallOption } from '../domain/types'
import { Interactive } from './Interactive'
import { ROOM, WINDOW } from './layout'
import { makeFluteNormalMap, metricPlane, useSurfaceMaterial } from './surfaces'

const SKIRTING = 0.09

function Floor({ option }: { option: FloorOption }) {
  const material = useSurfaceMaterial(option.spec.surface)
  const geometry = useMemo(() => metricPlane(ROOM.width, ROOM.depth), [])
  return (
    <Interactive group="flooring">
      <mesh geometry={geometry} material={material} rotation-x={-Math.PI / 2} receiveShadow name="floor" />
    </Interactive>
  )
}

/**
 * Walls are single-sided planes facing into the room, so when the camera orbits outside a wall
 * the wall is culled and the room opens up like a dollhouse — no clipping into geometry.
 * They still cast shadows (shadowSide = DoubleSide), so sunlight only enters through the window.
 */
function Walls({ option }: { option: WallOption }) {
  const flute = useMemo(() => (option.spec.fluted ? makeFluteNormalMap(26) : null), [option.spec.fluted])
  const paint = useSurfaceMaterial(option.spec.surface)
  const feature = useSurfaceMaterial(option.spec.fluted ?? option.spec.surface, { normalMap: flute })
  const { width: W, depth: D, height: H } = ROOM

  const geo = useMemo(() => {
    const winW = WINDOW.z1 - WINDOW.z0
    return {
      back: metricPlane(W, H, 0, 0),
      right: metricPlane(D, H, 0, 0),
      // Left wall is built around the window opening.
      leftBack: metricPlane(WINDOW.z0 - ROOM.backZ, H, 0, 0),
      leftFront: metricPlane(ROOM.frontZ - WINDOW.z1, H, WINDOW.z1 - ROOM.backZ, 0),
      leftTop: metricPlane(winW, H - WINDOW.top, WINDOW.z0 - ROOM.backZ, WINDOW.top),
      ceiling: new THREE.PlaneGeometry(W, D),
    }
  }, [W, D, H])

  const leftBackW = WINDOW.z0 - ROOM.backZ
  const leftFrontW = ROOM.frontZ - WINDOW.z1

  return (
    <Interactive group="wallFinish">
      {/* back (feature) wall */}
      <mesh geometry={geo.back} material={feature} position={[0, H / 2, ROOM.backZ]} receiveShadow castShadow name="wall-back" />
      {/* right wall */}
      <mesh geometry={geo.right} material={paint} position={[ROOM.maxX, H / 2, 0]} rotation-y={-Math.PI / 2} receiveShadow castShadow name="wall-right" />
      {/* left wall pieces around the window */}
      <group position={[ROOM.minX, 0, 0]} rotation-y={Math.PI / 2}>
        <mesh geometry={geo.leftBack} material={paint} position={[-(ROOM.backZ + leftBackW / 2), H / 2, 0]} receiveShadow castShadow />
        <mesh geometry={geo.leftFront} material={paint} position={[-(WINDOW.z1 + leftFrontW / 2), H / 2, 0]} receiveShadow castShadow />
        <mesh
          geometry={geo.leftTop}
          material={paint}
          position={[-(WINDOW.z0 + WINDOW.z1) / 2, WINDOW.top + (H - WINDOW.top) / 2, 0]}
          receiveShadow
          castShadow
        />
      </group>
      {/* ceiling: faces down, so it disappears from above for the plan view */}
      <mesh geometry={geo.ceiling} position={[0, H, 0]} rotation-x={Math.PI / 2} castShadow receiveShadow>
        <meshStandardMaterial color="#f4f1ec" roughness={1} shadowSide={THREE.DoubleSide} />
      </mesh>
      <Skirting />
    </Interactive>
  )
}

function Skirting() {
  const { width: W, depth: D } = ROOM
  return (
    <group>
      <mesh position={[0, SKIRTING / 2, ROOM.backZ + 0.008]} castShadow receiveShadow>
        <boxGeometry args={[W, SKIRTING, 0.016]} />
        <meshStandardMaterial color="#efebe4" roughness={0.6} />
      </mesh>
      <mesh position={[ROOM.maxX - 0.008, SKIRTING / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.016, SKIRTING, D]} />
        <meshStandardMaterial color="#efebe4" roughness={0.6} />
      </mesh>
      <mesh position={[ROOM.minX + 0.008, SKIRTING / 2, (ROOM.backZ + WINDOW.z0) / 2]} castShadow receiveShadow>
        <boxGeometry args={[0.016, SKIRTING, WINDOW.z0 - ROOM.backZ]} />
        <meshStandardMaterial color="#efebe4" roughness={0.6} />
      </mesh>
    </group>
  )
}

/** Slim black steel glazing frame with mullions. */
function WindowFrame() {
  const depth = 0.12
  const bar = 0.045
  const width = WINDOW.z1 - WINDOW.z0
  const mullions = 3
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1d1d1f', roughness: 0.45, metalness: 0.6 }), [])
  const cz = (WINDOW.z0 + WINDOW.z1) / 2
  const x = ROOM.minX
  return (
    <group>
      {/* head, sill, jambs */}
      <mesh material={steel} position={[x, WINDOW.top - bar / 2, cz]} castShadow>
        <boxGeometry args={[depth, bar, width]} />
      </mesh>
      <mesh material={steel} position={[x, bar / 2, cz]} castShadow>
        <boxGeometry args={[depth, bar, width]} />
      </mesh>
      {[WINDOW.z0 + bar / 2, WINDOW.z1 - bar / 2].map((z) => (
        <mesh key={z} material={steel} position={[x, WINDOW.top / 2, z]} castShadow>
          <boxGeometry args={[depth, WINDOW.top, bar]} />
        </mesh>
      ))}
      {Array.from({ length: mullions }, (_, i) => WINDOW.z0 + (width * (i + 1)) / (mullions + 1)).map((z) => (
        <mesh key={z} material={steel} position={[x, WINDOW.top / 2, z]} castShadow>
          <boxGeometry args={[depth * 0.6, WINDOW.top, bar * 0.6]} />
        </mesh>
      ))}
      {/* transom */}
      <mesh material={steel} position={[x, 2.0, cz]} castShadow>
        <boxGeometry args={[depth * 0.6, bar * 0.6, width]} />
      </mesh>
      {/* deep reveal so the opening reads as a real wall thickness */}
      <mesh position={[x - 0.1, WINDOW.top + 0.002, cz]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[0.2, width]} />
        <meshStandardMaterial color="#e9e5de" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** A soft, overexposed garden view outside the glazing — deliberately abstract, like an architectural render. */
function Exterior() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 16
    c.height = 256
    const ctx = c.getContext('2d')
    if (!ctx) return null
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#f4f6f6')
    g.addColorStop(0.45, '#eef1ea')
    g.addColorStop(0.62, '#c9d3bd')
    g.addColorStop(0.8, '#a9b79a')
    g.addColorStop(1, '#c8c2b2')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 16, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <mesh position={[ROOM.minX - 3, 1.6, (WINDOW.z0 + WINDOW.z1) / 2]} rotation-y={Math.PI / 2}>
      <planeGeometry args={[14, 7]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

export function Flooring({ optionId }: { optionId: string }) {
  const option = getOption('flooring', optionId)
  return option ? <Floor option={option} /> : null
}

export function WallFinish({ optionId }: { optionId: string }) {
  const option = getOption('wallFinish', optionId)
  return option ? <Walls option={option} /> : null
}

/** Fixed architecture: glazing and the view outside. */
export function RoomShell() {
  return (
    <group>
      <WindowFrame />
      <Exterior />
    </group>
  )
}
