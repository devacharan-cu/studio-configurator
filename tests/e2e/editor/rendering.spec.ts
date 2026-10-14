import { expect, test, type Page } from '@playwright/test'
import { openFresh, regionColour, sceneShot, watchProblems } from './helpers'

/* Rendering (Phase 2 M2): the outdoor scene, roof, quality levels and arrival view, checked in the
 * production build on the real GPU. Colour checks sample regions of the canvas, so they assert what
 * the scene shows (sky above, lawn below, a roof from the air), not how it is implemented. */

async function viewpoint(page: Page, name: string) {
  await page.getByTestId('fly-viewpoints').click()
  await page.getByRole('menuitem', { name }).click()
  await page.waitForTimeout(1600) // glide
}

const desktopOnly = () => test.skip(test.info().project.name !== 'desktop', 'desktop rendering checks')

/** Device pixels per CSS pixel of the 3D canvas. */
const canvasRatio = (page: Page) =>
  page.getByTestId('scene-view').locator('canvas').evaluate((c: HTMLCanvasElement) => Math.round((c.width / c.clientWidth) * 100) / 100)

test.describe('rendering: site, sky, roof and quality levels', () => {
  test.beforeEach(desktopOnly)

  test('the home stands in a real outdoor scene: sky above, lawn below, a roof from the air', async ({ page }) => {
    const problems = watchProblems(page)
    const sky = page.waitForResponse((r) => r.url().endsWith('/assets/env/meadow_2_bg_2k.jpg') && r.ok())
    const ibl = page.waitForResponse((r) => r.url().endsWith('/assets/env/meadow_2_ibl_1k.hdr') && r.ok())
    await openFresh(page)
    await Promise.all([sky, ibl])
    await expect(page.getByTestId('scene-view')).toHaveAttribute('data-quality', 'balanced')

    await page.getByRole('button', { name: 'Free camera' }).click()
    await viewpoint(page, 'Street view (front)')
    const street = await sceneShot(page)
    const top = await regionColour(page, street, { x0: 0.35, y0: 0.02, x1: 0.65, y1: 0.12 })
    expect(top.b, `sky ${JSON.stringify(top)}`).toBeGreaterThan(top.r + 25)
    const lawn = await regionColour(page, street, { x0: 0.02, y0: 0.9, x1: 0.15, y1: 0.98 })
    expect(lawn.g, `lawn ${JSON.stringify(lawn)}`).toBeGreaterThan(lawn.b + 20)

    // from the air the house has a roof (neutral grey), not an open box of rooms
    await viewpoint(page, 'Aerial overview')
    const aerial = await sceneShot(page)
    const roof = await regionColour(page, aerial, { x0: 0.46, y0: 0.4, x1: 0.54, y1: 0.48 })
    const spread = Math.max(roof.r, roof.g, roof.b) - Math.min(roof.r, roof.g, roof.b)
    expect(spread, `roof ${JSON.stringify(roof)}`).toBeLessThan(25)

    // back in the editor the roof is gone again (the cut-away shows the rooms)
    await page.getByRole('button', { name: 'Exit free camera' }).click()
    await page.waitForTimeout(1500)
    expect(problems).toEqual([])
  })

  test('the walkthrough starts inside the front door, looking down the hall', async ({ page }) => {
    await openFresh(page)
    await page.getByRole('button', { name: 'Walk through' }).click()
    const hud = page.getByTestId('walk-hud')
    await expect(page.getByTestId('walk-room')).toHaveText('Hall')
    await page.waitForTimeout(1000)
    const [x, y] = ((await hud.getAttribute('data-walk-pos')) ?? '').split(',').map(Number)
    const [yaw] = ((await hud.getAttribute('data-walk-look')) ?? '').split(',').map(Number)
    // front door centre is (4.55, 8.2) on a 25 cm wall; the visitor stands ~1 m inside it
    expect(x).toBeCloseTo(4.55, 1)
    expect(y).toBeGreaterThan(7.0)
    expect(y).toBeLessThan(7.6)
    expect(-Math.cos(yaw)).toBeLessThan(-0.7) // facing north, into the house
  })
})

test.describe('rendering: quality levels on a high-density screen', () => {
  test.use({ deviceScaleFactor: 2 })
  test.beforeEach(desktopOnly)

  test('Performance / Balanced / Quality change the render resolution and persist for this viewer', async ({ page }) => {
    const problems = watchProblems(page)
    await openFresh(page)
    const scene = page.getByTestId('scene-view')
    await expect(scene).toHaveAttribute('data-quality', 'balanced')
    await expect.poll(() => canvasRatio(page)).toBe(1.25)

    const pick = async (label: string) => {
      await page.getByRole('button', { name: 'Views' }).click()
      await page.getByTestId('quality-picker').getByRole('radio', { name: label }).click()
      await page.getByRole('button', { name: 'Views' }).click() // close the menu
    }
    await pick('Performance')
    await expect(scene).toHaveAttribute('data-quality', 'performance')
    await expect.poll(() => canvasRatio(page)).toBe(1)
    const hiRes = page.waitForResponse((r) => r.url().endsWith('/assets/env/meadow_2_bg_4k.jpg') && r.ok())
    await pick('Quality')
    await expect(scene).toHaveAttribute('data-quality', 'quality')
    await expect.poll(() => canvasRatio(page)).toBe(2)
    await hiRes // the 4K sky

    // kept for this viewer only (not in the project)
    await page.reload()
    await expect(scene).toHaveAttribute('data-quality', 'quality')
    const project = await page.evaluate(() => localStorage.getItem('roomset.editor.v1.project') ?? '')
    expect(project).not.toContain('quality')

    // also adjustable from the walkthrough settings
    await page.getByRole('button', { name: 'Walk through' }).click()
    await page.getByTestId('nav-settings').click()
    const picker = page.getByTestId('quality-picker')
    await expect(picker.getByRole('radio', { name: 'Quality' })).toHaveAttribute('aria-checked', 'true')
    await picker.getByRole('radio', { name: 'Balanced' }).click()
    await expect.poll(() => canvasRatio(page)).toBe(1.25)
    expect(problems).toEqual([])
  })
})
