import { useGLTF } from '@react-three/drei'

/** drei's useGLTF, with Draco off (none of our assets use it, and it would fetch a decoder from a CDN). */
export function useModel(url: string) {
  return useGLTF(url, false, true)
}
export function preloadModel(url: string) {
  useGLTF.preload(url, false, true)
}
