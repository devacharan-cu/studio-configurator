import { useGLTF } from '@react-three/drei'
import type { AssetDef } from '../../engine/assets/catalog'

/** Warm the model cache (same loader options as rendering: no Draco CDN, meshopt on). */
export const preloadAsset = (a: AssetDef) => a.url && useGLTF.preload(a.url, false, true)
