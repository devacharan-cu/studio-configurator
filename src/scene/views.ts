import type { ViewId } from '../state/store'

export interface CameraView {
  label: string
  position: [number, number, number]
  target: [number, number, number]
}

/** Named viewpoints. Group views frame the object being customised; on narrow screens we pull back. */
export const VIEWS: Record<ViewId, CameraView> = {
  overview: { label: 'Overview', position: [2.35, 1.62, 2.3], target: [-0.55, 0.6, -1.05] },
  window: { label: 'Window', position: [2.7, 1.45, 1.9], target: [-2.6, 1.0, -0.6] },
  plan: { label: 'Plan', position: [0, 9.2, 0.35], target: [0, 0, -0.15] },
  sofa: { label: 'Sofa', position: [1.25, 1.35, 1.45], target: [0, 0.48, -1.85] },
  coffeeTable: { label: 'Coffee table', position: [1.35, 1.55, 0.75], target: [-0.1, 0.22, -0.8] },
  rug: { label: 'Rug', position: [2.0, 3.4, 1.5], target: [-0.1, 0, -0.75] },
  flooring: { label: 'Flooring', position: [2.4, 1.05, 2.1], target: [-1.2, 0.0, -0.9] },
  wallFinish: { label: 'Walls', position: [2.0, 1.25, 2.6], target: [-0.7, 1.1, -2.4] },
  // Tight framings used only to render option thumbnails (scripts/render-thumbnails).
  thumbSofa: { label: 'Sofa (thumbnail)', position: [0.9, 1.25, 0.25], target: [0.15, 0.42, -1.95] },
  thumbTable: { label: 'Table (thumbnail)', position: [0.95, 1.35, 0.55], target: [-0.1, 0.2, -0.62] },
}

export const PRESET_VIEWS: ViewId[] = ['overview', 'window', 'plan']
