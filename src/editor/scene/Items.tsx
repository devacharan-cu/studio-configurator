import { useGLTF, useTexture } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { Component, memo, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { getAsset, type AssetDef } from '../../engine/assets/catalog'
import type { Item, Project } from '../../engine/model/types'
import { useEditor } from '../store'
import type { PickHandlers } from './Building'
import { Bath, MirrorRect, Shower, Vanity, Wc } from './fixtures/bathroom'
import { Bed, DiningTable, Desk, Wardrobe } from './fixtures/bedroom'
import { CookerHood, FridgeSteel, KitchenIsland, KitchenRun, KitchenTallFridge, KitchenWallUnits } from './fixtures/kitchen'
import { MATS } from './materials'

/* ---------- glTF assets ---------- */

const useModel = (url: string) => useGLTF(url, false, true)

/** A glTF asset normalised to the catalogue convention: footprint centred at the origin, on the floor, facing +Z. */
function GltfAsset({ asset }: { asset: AssetDef }) {
  const gltf = useModel(asset.url!)
  const object = useMemo(() => {
    const root = gltf.scene.clone(true)
    root.traverse((o) => {
      if ((o as THREE.Light).isLight) o.visible = false
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
        // Glass with no factors set defaults to glTF metalness 1 (a dark metal sheet over the artwork):
        // make it a thin, clear, non-metallic pane that doesn't cast shadows.
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat?.name?.toLowerCase().includes('glass')) {
          const g = mat.clone()
          g.metalness = 0
          g.roughness = 0.05
          g.transparent = true
          g.opacity = 0.12
          g.depthWrite = false
          m.material = g
          m.castShadow = false
        }
      }
    })
    root.rotation.y = asset.yaw ?? 0
    root.scale.setScalar(asset.scale ?? 1)
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    const c = box.getCenter(new THREE.Vector3())
    root.position.set(-c.x, -box.min.y, -c.z)
    const pivot = new THREE.Group()
    pivot.add(root)
    return pivot
  }, [gltf, asset])

  // KHR_materials_variants (velvet sofa colourways)
  const [ready, setReady] = useState(!asset.variant)
  useEffect(() => {
    if (!asset.variant) return
    const ext = gltf.userData?.gltfExtensions?.KHR_materials_variants as { variants: { name: string }[] } | undefined
    const index = ext?.variants.findIndex((v) => v.name === asset.variant) ?? -1
    const jobs: Promise<void>[] = []
    object.traverse((o) => {
      const mesh = o as THREE.Mesh
      const def = mesh.userData?.gltfExtensions?.KHR_materials_variants as { mappings: { material: number; variants: number[] }[] } | undefined
      const map = def?.mappings.find((x) => x.variants.includes(index))
      if (mesh.isMesh && map)
        jobs.push(
          gltf.parser.getDependency('material', map.material).then((mat: THREE.Material) => {
            mesh.material = mat
            gltf.parser.assignFinalMaterial(mesh)
          }),
        )
    })
    Promise.all(jobs).finally(() => setReady(true))
  }, [gltf, object, asset.variant])
  return <primitive object={object} visible={ready} />
}

/* ---------- Procedural (studio-modelled) assets ---------- */

const linenMat = new THREE.MeshStandardMaterial({ color: '#d8cdbc', roughness: 1 })
const rugMat = new THREE.MeshStandardMaterial({ color: '#d9cfbf', roughness: 1 })

function useFabric(texture: string, tint: string, tile: number, base: THREE.MeshStandardMaterial) {
  const [color, normal] = useTexture([`/assets/textures/${texture}/color.webp`, `/assets/textures/${texture}/normal.webp`])
  return useMemo(() => {
    const prep = (t: THREE.Texture, srgb: boolean) => {
      const c = t.clone()
      c.wrapS = c.wrapT = THREE.RepeatWrapping
      c.repeat.set(1 / tile, 1 / tile)
      c.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
      c.needsUpdate = true
      return c
    }
    const m = base.clone()
    m.map = prep(color, true)
    m.normalMap = prep(normal, false)
    m.color = new THREE.Color(tint)
    return m
  }, [color, normal, tint, tile, base])
}

const rbox = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) - 0.001)

function Block({ size, pos, mat, r = 0.04 }: { size: [number, number, number]; pos: [number, number, number]; mat: THREE.Material; r?: number }) {
  const g = useMemo(() => rbox(size[0], size[1], size[2], r), [size, r])
  return <mesh geometry={g} material={mat} position={pos} castShadow receiveShadow />
}

/** The tint of the chosen finish variant (first variant when none is set). */
const tintOf = (a: AssetDef, variant: string | undefined, fallback: string) => (a.variants?.find((v) => v.id === variant) ?? a.variants?.[0])?.tint ?? fallback

function Sofa({ a, variant }: ProcProps) {
  const mat = useFabric('rough_linen', tintOf(a, variant, '#d6cab8'), 0.6, linenMat)
  const { w, d } = a.footprint
  const arm = 0.2
  const inner = w - arm * 2
  return (
    <group position-z={-d / 2}>
      <Block size={[w - 0.16, 0.07, d - 0.16]} pos={[0, 0.035, d / 2]} mat={MATS.walnut} r={0.01} />
      <Block size={[w, 0.24, d]} pos={[0, 0.19, d / 2]} mat={mat} />
      <Block size={[w, 0.46, 0.2]} pos={[0, 0.54, 0.1]} mat={mat} r={0.06} />
      {[-1, 1].map((s) => (
        <Block key={s} size={[arm, 0.3, d]} pos={[s * (w / 2 - arm / 2), 0.46, d / 2]} mat={mat} r={0.07} />
      ))}
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <Block size={[inner / 3 - 0.012, 0.15, d - 0.22]} pos={[-inner / 2 + (inner / 3) * (i + 0.5), 0.385, 0.2 + (d - 0.2) / 2]} mat={mat} r={0.06} />
        </group>
      ))}
    </group>
  )
}

function Rug({ a, variant }: ProcProps) {
  const mat = useFabric('curly_teddy_natural', tintOf(a, variant, '#dfd5c4'), 0.22, rugMat)
  const g = useMemo(() => rbox(a.footprint.w, a.footprint.h, a.footprint.d, 0.006), [a])
  return <mesh geometry={g} material={mat} position-y={a.footprint.h / 2 + 0.001} receiveShadow />
}

type ProcProps = { a: AssetDef; variant?: string }
const PROCEDURAL: Record<string, (p: ProcProps) => ReactNode> = {
  'sofa-arlo': Sofa,
  'bed-double': Bed,
  'bed-single': Bed,
  'bed-king': Bed,
  wardrobe: Wardrobe,
  'wardrobe-3door': Wardrobe,
  'kitchen-run': KitchenRun,
  'kitchen-run-short': KitchenRun,
  'kitchen-island': KitchenIsland,
  'kitchen-wall-units': KitchenWallUnits,
  'kitchen-tall-fridge': KitchenTallFridge,
  'fridge-steel': FridgeSteel,
  'cooker-hood': CookerHood,
  desk: Desk,
  'table-dining-rect': DiningTable,
  'table-dining-rect-small': DiningTable,
  bath: Bath,
  vanity: Vanity,
  wc: Wc,
  shower: Shower,
  'mirror-rect': MirrorRect,
  'rug-wool': Rug,
}

/* ---------- placement, picking, failure isolation ---------- */

class AssetBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(e: unknown) {
    console.error('[assets] failed to load', e)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Neutral placeholder showing the footprint while loading or if an asset fails. */
function Placeholder({ a, failed }: { a: AssetDef; failed?: boolean }) {
  return (
    <mesh position-y={Math.min(a.footprint.h, 0.9) / 2}>
      <boxGeometry args={[a.footprint.w, Math.min(a.footprint.h, 0.9), a.footprint.d]} />
      <meshStandardMaterial color={failed ? '#c98d70' : '#d8d2c8'} transparent opacity={0.45} />
    </mesh>
  )
}

const ItemObject = memo(function ItemObject({ item, elevation, ceiling, selected, handlers }: { item: Item; elevation: number; ceiling: number; selected: boolean; handlers: PickHandlers }) {
  const a = getAsset(item.asset)
  if (!a) return null
  const Proc = PROCEDURAL[a.id]
  // base height: hung from the ceiling, on a wall, on a table, or on the floor
  const base = a.mount === 'ceiling' ? ceiling - a.footprint.h : (item.z ?? 0)
  const grounded = base === 0
  return (
    <group
      position={[item.x, elevation + base, item.y]}
      rotation-y={item.rotation}
      name={`item:${item.id}`}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => handlers.onPick({ kind: 'item', id: item.id }, e)}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        handlers.onHover({ kind: 'item', id: item.id })
      }}
      onPointerOut={() => handlers.onHover(null)}
    >
      <AssetBoundary fallback={<Placeholder a={a} failed />}>
        <Suspense fallback={<Placeholder a={a} />}>{Proc ? <Proc a={a} variant={item.variant} /> : <GltfAsset asset={a} />}</Suspense>
      </AssetBoundary>
      {/* soft contact shadow */}
      {grounded && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.02} raycast={() => null} renderOrder={1}>
          <planeGeometry args={[a.footprint.w * 1.25, a.footprint.d * 1.25]} />
          <meshBasicMaterial map={contactTexture()} color="#1c140d" transparent opacity={a.walkable ? 0 : 0.38} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {selected && (
        <mesh position-y={a.footprint.h / 2} raycast={() => null}>
          <boxGeometry args={[a.footprint.w + 0.04, a.footprint.h + 0.04, a.footprint.d + 0.04]} />
          <meshBasicMaterial color="#c0623c" wireframe transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
})

let contact: THREE.Texture | null = null
function contactTexture() {
  if (contact) return contact
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.filter = 'blur(7px)'
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.roundRect(12, 12, 40, 40, 8)
    ctx.fill()
  }
  contact = new THREE.CanvasTexture(c)
  return contact
}

export function Items({ project, level, handlers }: { project: Project; level: string; handlers: PickHandlers }) {
  const selection = useEditor((s) => s.selection)
  const lv = project.levels[level]
  if (!lv) return null
  return (
    <group>
      {Object.values(project.items)
        .filter((i) => i.level === level)
        .map((i) => (
          <ItemObject key={i.id} item={i} elevation={lv.elevation} ceiling={lv.height} selected={selection?.kind === 'item' && selection.id === i.id} handlers={handlers} />
        ))}
    </group>
  )
}
