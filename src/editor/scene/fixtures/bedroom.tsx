import type { AssetDef } from '../../../engine/assets/catalog'
import { BarHandle, Box } from './parts'
import { fabric, paint, PLAIN, SURFACES, useSurface, type SurfaceSpec } from './surfaces'

/**
 * Parametric bedroom and study pieces: upholstered beds (any size), wardrobes (any width; doors at
 * ~0.6 m), a desk with a drawer pedestal, a rectangular dining table.
 */

type Props = { a: AssetDef; variant?: string }

const tintOf = (a: AssetDef, variant: string | undefined, fallback: string) => (a.variants?.find((v) => v.id === variant) ?? a.variants?.[0])?.tint ?? fallback

/** Bed: upholstered base and channel-tufted headboard, mattress, fitted sheet, folded duvet, pillows. */
export function Bed({ a, variant }: Props) {
  const upholstery = useSurface(fabric(tintOf(a, variant, '#d9d2c5'), 'curly_teddy_natural', 0.4))
  const duvet = useSurface(fabric('#f2efe9', 'rough_linen', 0.6))
  const throwMat = useSurface(fabric('#9a8a74', 'rough_linen', 0.35))
  const legs = useSurface(SURFACES.walnut)
  const { w, d } = a.footprint
  const head = 0.09
  const md = d - head - 0.04 // mattress depth
  const mz = -d / 2 + head + md / 2 + 0.02
  const channels = Math.max(4, Math.round(w / 0.24))
  const cw = w / channels
  const pillows = w > 1.2 ? 2 : 1
  return (
    <group>
      {/* base on short legs */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Box key={`${sx}${sz}`} size={[0.05, 0.08, 0.05]} at={[sx * (w / 2 - 0.08), 0.04, mz + sz * (md / 2 - 0.08)]} mat={legs} r={0.005} />),
      )}
      <Box size={[w, 0.24, md + 0.02]} at={[0, 0.08 + 0.12, mz]} mat={upholstery} r={0.03} />
      {/* headboard: vertical channels */}
      {Array.from({ length: channels }, (_, i) => (
        <Box key={i} size={[cw - 0.004, 0.95, head]} at={[-w / 2 + cw * (i + 0.5), 0.08 + 0.475, -d / 2 + head / 2]} mat={upholstery} r={0.035} />
      ))}
      {/* mattress, fitted sheet */}
      <Box size={[w - 0.06, 0.22, md - 0.04]} at={[0, 0.32 + 0.11, mz]} mat={PLAIN.linenWhite} r={0.05} />
      {/* duvet over the lower two-thirds, folded back at the top edge, with a throw at the foot */}
      <Box size={[w - 0.02, 0.07, md * 0.68]} at={[0, 0.54 + 0.03, mz + md * 0.16]} mat={duvet} r={0.03} />
      <Box size={[w - 0.04, 0.05, 0.22]} at={[0, 0.6, mz - md * 0.16 + 0.06]} mat={duvet} r={0.025} />
      <Box size={[w - 0.02, 0.03, 0.42]} at={[0, 0.62, mz + md / 2 - 0.26]} mat={throwMat} r={0.015} />
      {/* pillows */}
      {Array.from({ length: pillows }, (_, i) => {
        const pw = (w - 0.2) / pillows - 0.04
        const px = pillows === 1 ? 0 : (i === 0 ? -1 : 1) * (pw / 2 + 0.03)
        return <Box key={i} size={[pw, 0.14, 0.4]} at={[px, 0.6, -d / 2 + head + 0.28]} mat={PLAIN.linenWhite} r={0.065} />
      })}
    </group>
  )
}

const CABINET_FINISHES: Record<string, SurfaceSpec> = {
  white: paint('#efeee9'),
  oak: SURFACES.oak,
  walnut: SURFACES.walnut,
  sage: paint('#8b9a80'),
  greige: paint('#cfc5b6'),
}

/** Wardrobe: carcass, doors at ~0.6 m with shadow gaps and long bar handles, plinth. */
export function Wardrobe({ a, variant }: Props) {
  const front = useSurface(CABINET_FINISHES[variant ?? 'white'] ?? CABINET_FINISHES.white)
  const { w, d, h } = a.footprint
  const n = Math.max(2, Math.round(w / 0.6))
  const dw = w / n
  const plinth = 0.08
  return (
    <group>
      <Box size={[w - 0.02, plinth, d - 0.06]} at={[0, plinth / 2, -0.03]} mat={PLAIN.shadowGap} r={0} />
      <Box size={[w, h - plinth, d - 0.02]} at={[0, plinth + (h - plinth) / 2, -0.01]} mat={front} r={0.002} />
      {Array.from({ length: n }, (_, i) => {
        const x = -w / 2 + dw * (i + 0.5)
        const side = i % 2 === 0 ? 1 : -1 // handles meet in pairs
        return (
          <group key={i}>
            <Box size={[dw - 0.004, h - plinth - 0.006, 0.019]} at={[x, plinth + (h - plinth) / 2, d / 2 - 0.0095]} mat={front} r={0.002} />
            <BarHandle at={[x + side * (dw / 2 - 0.045), plinth + (h - plinth) * 0.52, d / 2]} length={0.5} vertical mat={PLAIN.brushedSteel} />
          </group>
        )
      })}
    </group>
  )
}

/** Desk: 30 mm top, a three-drawer pedestal on the right, slim steel legs on the left. */
export function Desk({ a, variant }: Props) {
  const top = useSurface(CABINET_FINISHES[variant ?? 'oak'] ?? CABINET_FINISHES.oak)
  const { w, d, h } = a.footprint
  const pw = 0.42
  return (
    <group>
      <Box size={[w, 0.03, d]} at={[0, h - 0.015, 0]} mat={top} r={0.004} />
      <Box size={[pw, h - 0.03, d - 0.04]} at={[w / 2 - pw / 2 - 0.01, (h - 0.03) / 2, 0]} mat={top} r={0.002} />
      {[0.12, 0.33, 0.56].map((y) => (
        <group key={y}>
          <Box size={[pw - 0.01, 0.002, 0.002]} at={[w / 2 - pw / 2 - 0.01, y + 0.1, d / 2 - 0.019]} mat={PLAIN.shadowGap} shadow={false} />
          <BarHandle at={[w / 2 - pw / 2 - 0.01, y, d / 2 - 0.02]} length={0.16} mat={PLAIN.blackSteel} />
        </group>
      ))}
      {[-1, 1].map((sz) => (
        <Box key={sz} size={[0.025, h - 0.03, 0.025]} at={[-w / 2 + 0.05, (h - 0.03) / 2, sz * (d / 2 - 0.05)]} mat={PLAIN.blackSteel} />
      ))}
    </group>
  )
}

/** Rectangular dining table: thick top on four square legs set in from the corners. */
export function DiningTable({ a, variant }: Props) {
  const wood = useSurface(CABINET_FINISHES[variant ?? 'oak'] ?? CABINET_FINISHES.oak)
  const { w, d, h } = a.footprint
  return (
    <group>
      <Box size={[w, 0.04, d]} at={[0, h - 0.02, 0]} mat={wood} r={0.006} />
      <Box size={[w - 0.2, 0.08, d - 0.2]} at={[0, h - 0.08, 0]} mat={wood} r={0.002} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Box key={`${sx}${sz}`} size={[0.07, h - 0.04, 0.07]} at={[sx * (w / 2 - 0.12), (h - 0.04) / 2, sz * (d / 2 - 0.12)]} mat={wood} r={0.004} />),
      )}
    </group>
  )
}
