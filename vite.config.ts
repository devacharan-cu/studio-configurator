import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Content-Security-Policy for the built app. Everything is self-hosted: scripts, fonts, models,
 * textures and the HDR environment. 'wasm-unsafe-eval' is required by the meshopt decoder,
 * blob:/data: by GLTFLoader for embedded textures. Inline styles are used by React style props.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

export const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'X-Frame-Options': 'DENY',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The production preview serves the same headers we ship in public/_headers.
  preview: { headers: SECURITY_HEADERS },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/three') || id.includes('@react-three') ? 'three' : undefined),
      },
    },
  },
})
