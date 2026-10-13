import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against the production build served by `vite preview`, which applies the
 * same security headers (incl. CSP) we ship — so a CSP regression fails the suite.
 * GPU flags let headless Chromium use the real GPU for WebGL where available.
 */
const launchOptions = { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] }

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true, launchOptions }, grep: /@responsive/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions }, grep: /@responsive|@mobile/ },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
