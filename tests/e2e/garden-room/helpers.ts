import { expect, type Locator, type Page } from '@playwright/test'

export type Rendered = Record<'sofa' | 'coffeeTable' | 'flooring' | 'wallFinish' | 'rug', string>

/** Collect console errors, page errors and failed/4xx requests for the whole test. */
export function watchProblems(page: Page) {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`)
  })
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`))
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.url()}`)
  })
  return problems
}

export async function waitForScene(page: Page) {
  await expect(page.locator('main[data-scene-status="ready"]')).toBeAttached({ timeout: 45_000 })
  await expect(page.locator('main[data-rendered]')).toBeAttached()
  // allow the loader to fade and the first frames (AO, shadows) to settle
  await page.waitForTimeout(1200)
}

export async function rendered(page: Page): Promise<Rendered> {
  const attr = (await page.locator('main').getAttribute('data-rendered')) ?? ''
  return Object.fromEntries(attr.split(' ').map((kv) => kv.split(':'))) as Rendered
}

/** Wait until the 3D scene has committed the given selections. */
export async function expectRendered(page: Page, partial: Partial<Rendered>) {
  await expect.poll(async () => {
    const r = await rendered(page)
    return Object.entries(partial).every(([k, v]) => r[k as keyof Rendered] === v)
  }, { timeout: 30_000 }).toBe(true)
}

export async function canvasShot(page: Page): Promise<Buffer> {
  await page.waitForTimeout(900) // let camera damping / transitions settle
  return page.locator('main canvas').screenshot()
}

/**
 * Fraction of pixels that differ noticeably between two PNG screenshots. Decoded in the page,
 * so no image library is needed in the test runner.
 */
export async function pixelDiff(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(
    async ([a64, b64]) => {
      const load = async (b64: string) => createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
      const [ia, ib] = await Promise.all([load(a64), load(b64)])
      const w = Math.min(ia.width, ib.width)
      const h = Math.min(ia.height, ib.height)
      const px = (img: ImageBitmap) => {
        const c = new OffscreenCanvas(w, h)
        const ctx = c.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        return ctx.getImageData(0, 0, w, h).data
      }
      const da = px(ia)
      const db = px(ib)
      let changed = 0
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])
        if (d > 30) changed++
      }
      return changed / (w * h)
    },
    [a.toString('base64'), b.toString('base64')],
  )
}

export function groupHeader(page: Page, group: string): Locator {
  return page.locator(`section[data-group="${group}"] h3 button`)
}

/** Choose an option on desktop: expand its group, then click the option card. */
export async function chooseDesktop(page: Page, group: string, option: string) {
  const header = groupHeader(page, group)
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click()
  await page.locator(`section[data-group="${group}"] [data-option="${option}"]`).click()
}
