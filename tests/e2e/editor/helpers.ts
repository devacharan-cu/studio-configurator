import { expect, type Page } from '@playwright/test'

/** The canonical project as autosaved by the editor (the same document a reload restores). */
export interface SavedProject {
  id: string
  name: string
  nodes: Record<string, { id: string; x: number; y: number }>
  walls: Record<string, { id: string; a: string; b: string; thickness: number }>
  rooms: Record<string, { id: string; name: string; boundary: string[]; floorFinish: string }>
  openings: Record<string, { id: string; wall: string; kind: string; offset: number; width: number }>
  items: Record<string, { id: string; asset: string; x: number; y: number; rotation: number; variant?: string; z?: number }>
}

export const STORAGE_KEY = 'roomset.editor.v1.project'

export function watchProblems(page: Page) {
  const problems: string[] = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`http ${r.status()}: ${r.url()}`))
  return problems
}

/** Open the editor with a fresh template project. */
export async function openFresh(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByTestId('plan-view')).toBeVisible()
  await expect(page.locator('[data-room-label]')).toHaveCount(6)
  await expect(page.getByTestId('scene-view').locator('canvas')).toBeVisible()
  await page.waitForTimeout(2500) // textures + models
}

/** Wait for autosave, then read the canonical project. */
export async function saved(page: Page): Promise<SavedProject> {
  await expect(page.getByTestId('save-state')).toHaveText('Saved in this browser')
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), STORAGE_KEY)
}

/** Plan coordinates (metres) → screen pixels, from the SVG viewBox. */
export async function planToScreen(page: Page, x: number, y: number) {
  return page.evaluate(
    ([x, y]) => {
      const svg = document.querySelector('[data-testid=plan-view] svg')!
      const r = svg.getBoundingClientRect()
      const [vx, vy, vw] = svg.getAttribute('viewBox')!.split(' ').map(Number)
      const s = r.width / vw
      return { x: r.left + (x - vx) * s, y: r.top + (y - vy) * s }
    },
    [x, y],
  )
}

export async function dragPlan(page: Page, from: [number, number], to: [number, number]) {
  const a = await planToScreen(page, ...from)
  const b = await planToScreen(page, ...to)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 10 })
  await page.mouse.up()
}

export async function clickPlan(page: Page, x: number, y: number) {
  const a = await planToScreen(page, x, y)
  await page.mouse.click(a.x, a.y)
}

export async function sceneShot(page: Page) {
  await page.waitForTimeout(700)
  return page.getByTestId('scene-view').locator('canvas').screenshot()
}

/** Fraction of noticeably different pixels between two PNGs (decoded in the page). */
export async function pixelDiff(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(
    async ([a64, b64]) => {
      const load = async (s: string) => createImageBitmap(await (await fetch(`data:image/png;base64,${s}`)).blob())
      const [ia, ib] = await Promise.all([load(a64), load(b64)])
      const w = Math.min(ia.width, ib.width)
      const h = Math.min(ia.height, ib.height)
      const px = (img: ImageBitmap) => {
        const c = new OffscreenCanvas(w, h)
        const ctx = c.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        return ctx.getImageData(0, 0, w, h).data
      }
      const [da, db] = [px(ia), px(ib)]
      let n = 0
      for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) n++
      return n / (w * h)
    },
    [a.toString('base64'), b.toString('base64')],
  )
}

export const nodeAt = (p: SavedProject, x: number, y: number) => Object.values(p.nodes).find((n) => Math.abs(n.x - x) < 1e-6 && Math.abs(n.y - y) < 1e-6)
export const roomNamed = (p: SavedProject, name: string) => Object.values(p.rooms).find((r) => r.name === name)!

/** Mean colour (0–255) of a region of a PNG, given as fractions of its width and height. */
export async function regionColour(page: Page, png: Buffer, r: { x0: number; y0: number; x1: number; y1: number }) {
  return page.evaluate(
    async ([b64, r]) => {
      const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
      const c = new OffscreenCanvas(img.width, img.height)
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const x = Math.floor(r.x0 * img.width)
      const y = Math.floor(r.y0 * img.height)
      const d = ctx.getImageData(x, y, Math.max(1, Math.floor((r.x1 - r.x0) * img.width)), Math.max(1, Math.floor((r.y1 - r.y0) * img.height))).data
      const sum = [0, 0, 0]
      for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) sum[k] += d[i + k]
      const n = d.length / 4
      return { r: sum[0] / n, g: sum[1] / n, b: sum[2] / n }
    },
    [png.toString('base64'), r] as const,
  )
}
