/**
 * Rendering quality levels. Each one only changes settings whose cost was measured (see TESTING.md):
 * pixel ratio, sun shadow resolution and softness, background resolution and the room light.
 * Measured on an integrated GPU (Radeon 610M), walking: pixel ratio dominates (1× → 1.5× doubled the
 * frame time), the sun shadow costs ~4 ms, the single room light ~0. There is no post-processing at
 * any level (D7: SSAO caused frame spikes on integrated GPUs).
 */
export type Quality = 'performance' | 'balanced' | 'quality'

export interface QualityPreset {
  label: string
  hint: string
  /** Device pixel ratio range for the canvas. */
  dpr: [number, number]
  /** Sun shadow map size (square). */
  shadowMap: number
  /** PCF filter radius in shadow texels: larger is softer. */
  shadowRadius: number
  background: string
  /** Warm ceiling lights in every room (walkthrough and free camera). */
  interiorLights: boolean
}

export const QUALITY: Record<Quality, QualityPreset> = {
  performance: {
    label: 'Performance',
    hint: 'Older laptops and phones: native resolution, lighter shadows, no room lights',
    dpr: [1, 1],
    shadowMap: 1024,
    shadowRadius: 2,
    background: '/assets/env/meadow_2_bg_2k.jpg',
    interiorLights: false,
  },
  balanced: {
    label: 'Balanced',
    hint: 'Smooth on most laptops: slightly sharper image, soft sun shadows, room lights',
    dpr: [1, 1.25],
    shadowMap: 2048,
    shadowRadius: 3,
    background: '/assets/env/meadow_2_bg_2k.jpg',
    interiorLights: true,
  },
  quality: {
    label: 'Quality',
    hint: 'Full screen resolution, finest shadows, 4K sky — best with a dedicated graphics card',
    dpr: [1, 2],
    shadowMap: 4096,
    shadowRadius: 4,
    background: '/assets/env/meadow_2_bg_4k.jpg',
    interiorLights: true,
  },
}

export const QUALITY_LEVELS = Object.keys(QUALITY) as Quality[]
/** Validates untrusted input (own keys only: `'constructor' in QUALITY` is true). */
export const isQuality = (v: unknown): v is Quality => typeof v === 'string' && Object.hasOwn(QUALITY, v)
