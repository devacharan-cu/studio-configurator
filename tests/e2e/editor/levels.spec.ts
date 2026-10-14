import { expect, test, type Page } from '@playwright/test'
import { dragPlan, openFresh, pixelDiff, saved, sceneShot, watchProblems } from './helpers'

/* Multi-storey (Phase 3 M5): floors in 2D and 3D, stairs as an editable element, and a visitor who
 * climbs them with the keyboard — all in the production build. */

const floorRadios = (page: Page) => page.getByRole('radiogroup', { name: 'Floor' }).getByRole('radio')

async function openTemplate(page: Page, id: string) {
  await page.getByRole('button', { name: 'Designs' }).click()
  await page.locator(`[data-template="${id}"]`).click()
  await page.getByRole('button', { name: 'Create a project from this design' }).click()
}

async function hud(page: Page) {
  const h = page.getByTestId('walk-hud')
  const [x, y] = (await h.getAttribute('data-walk-pos'))!.split(',').map(Number)
  const [yaw] = (await h.getAttribute('data-walk-look'))!.split(',').map(Number)
  return { x, y, yaw, level: (await h.getAttribute('data-walk-level'))!, height: Number(await h.getAttribute('data-walk-height')) }
}

/**
 * Walk to plan points with the keyboard only, like a visitor: turn with the arrow keys towards the next
 * point, then walk forward with W in short bursts, reading position and heading back from the HUD.
 */
async function walkVia(page: Page, points: [number, number][]) {
  for (const [tx, ty] of points) {
    for (let i = 0; i < 60; i++) {
      const s = await hud(page)
      const dx = tx - s.x
      const dy = ty - s.y
      const dist = Math.hypot(dx, dy)
      if (dist < 0.2) break
      // camera forward is plan (−sin yaw, −cos yaw)
      const want = Math.atan2(-dx, -dy)
      const err = Math.atan2(Math.sin(want - s.yaw), Math.cos(want - s.yaw))
      if (Math.abs(err) > 0.08) {
        const key = err > 0 ? 'ArrowLeft' : 'ArrowRight'
        await page.keyboard.down(key)
        await page.waitForTimeout(Math.min(600, (Math.abs(err) / 1.8) * 1000))
        await page.keyboard.up(key)
        await page.waitForTimeout(200)
        continue
      }
      await page.keyboard.down('w')
      await page.waitForTimeout(Math.min(500, Math.max(120, (dist / 1.4) * 1000)))
      await page.keyboard.up('w')
      await page.waitForTimeout(250)
    }
  }
}

test.describe('multi-storey', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'desktop'))

  test('a two-storey house: floors switch in 2D and 3D, and the stairs can be climbed with the keyboard', async ({ page }) => {
    test.setTimeout(150_000)
    const problems = watchProblems(page)
    await openFresh(page)
    await openTemplate(page, 'duplex')
    const p = await saved(page)
    const [ground, first] = Object.values(p.levels).sort((a, b) => a.elevation - b.elevation)
    expect(first.elevation).toBeCloseTo(3.0)
    expect(Object.keys(p.stairs ?? {})).toHaveLength(1)

    // 2D: the ground floor with the flight going UP; the first floor with the guarded stairwell (DN) over a
    // dashed outline of the floor below
    await expect(floorRadios(page)).toHaveText(['First', 'Ground'])
    await expect(page.getByRole('radio', { name: 'Ground' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('[data-stair="up"]')).toHaveCount(1)
    await expect(page.locator('[data-room-label="Living room"]')).toBeVisible()
    const ground3d = await sceneShot(page)
    await page.getByRole('radio', { name: 'First' }).click()
    await expect(page.locator('[data-room-label="Master bedroom"]')).toBeVisible()
    await expect(page.locator('[data-stair="down"]')).toHaveCount(1)
    expect(await page.locator('[data-below]').count()).toBeGreaterThan(10)
    await expect(page.getByTestId('inspector')).toContainText('Rooms · First floor')
    // 3D: the first floor now stands on the ground floor
    expect(await pixelDiff(page, ground3d, await sceneShot(page))).toBeGreaterThan(0.02)

    // the stairs are an element with derived numbers
    await page.locator('[data-stair="down"]').click()
    await expect(page.getByTestId('stair-steps')).toHaveText('17 × 17.6 cm')
    await expect(page.getByTestId('stair-going')).toHaveText('25.0 cm')

    // walk: from the stair hall to the foot of the flight, then straight up it to the landing
    await page.getByRole('radio', { name: 'Ground' }).click()
    await page.getByRole('button', { name: 'Walk through' }).click()
    await page.getByRole('button', { name: 'Go to room' }).click()
    await page.getByRole('menuitem', { name: 'Stair hall', exact: true }).click()
    await expect(page.getByTestId('walk-room')).toHaveText('Stair hall')
    await page.waitForTimeout(1000)
    expect((await hud(page)).level).toBe(ground.id)
    await walkVia(page, [
      [1.75, 10.6],
      [0.66, 10.6],
      [0.66, 5.5],
    ])
    await expect.poll(async () => (await hud(page)).level).toBe(first.id)
    await expect(page.getByTestId('walk-room')).toHaveText('Landing')
    expect((await hud(page)).height).toBeCloseTo(3.0, 1)
    // the editor followed the visitor upstairs
    await page.getByRole('button', { name: 'Exit walkthrough' }).click()
    await expect(page.getByRole('radio', { name: 'First' })).toHaveAttribute('aria-checked', 'true')

    // "go to room" lists every floor and arrives at the right height
    await page.getByRole('button', { name: 'Walk through' }).click()
    await page.getByRole('button', { name: 'Go to room' }).click()
    await page.getByRole('menuitem', { name: 'Kitchen & dining', exact: true }).click()
    await expect(page.getByTestId('walk-room')).toHaveText('Kitchen & dining')
    await expect.poll(async () => (await hud(page)).height).toBeCloseTo(0, 1)
    expect(problems).toEqual([])
  })

  test('a second floor from scratch: add a floor, draw over the one below, add stairs; undo, reload and remove', async ({ page }) => {
    test.setTimeout(120_000)
    const problems = watchProblems(page)
    await openFresh(page)
    await openTemplate(page, 'blank')
    await page.getByRole('button', { name: 'Room', exact: true }).click()
    await dragPlan(page, [1, 2], [8.5, 8])
    expect(Object.keys((await saved(page)).rooms)).toHaveLength(1)

    // a floor on top: the editor switches to it and shows the floor below as a dashed outline
    await page.getByRole('button', { name: 'Floor', exact: true }).click()
    await expect(floorRadios(page)).toHaveText(['First', 'Ground'])
    await expect(page.getByRole('radio', { name: 'First' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('[data-below]')).toHaveCount(4)
    await page.getByRole('button', { name: 'Room', exact: true }).click()
    await dragPlan(page, [1, 2], [8.5, 8])
    let p = await saved(page)
    expect(Object.keys(p.levels)).toHaveLength(2)
    expect(Object.keys(p.rooms)).toHaveLength(2)

    // stairs: placed where they fit, selected, explained
    await page.getByRole('radio', { name: 'Ground' }).click()
    await page.getByRole('button', { name: 'Stairs', exact: true }).click()
    await expect(page.getByTestId('inspector')).toContainText('Straight flight from the ground floor to the first floor')
    await expect(page.locator('[data-stair="up"]')).toHaveCount(1)
    p = await saved(page)
    expect(Object.keys(p.stairs ?? {})).toHaveLength(1)

    // a too-short flight is refused with the reason
    await page.getByTestId('stair-length').fill('2.4')
    await page.getByTestId('stair-length').press('Enter')
    await expect(page.getByTestId('notice-error')).toContainText('too steep')
    expect(Object.values((await saved(page)).stairs!)[0].length).toBeGreaterThan(4)

    // undo / redo / reload
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.locator('[data-stair="up"]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Redo' }).click()
    await expect(page.locator('[data-stair="up"]')).toHaveCount(1)
    await page.reload()
    await expect(floorRadios(page)).toHaveCount(2)
    await expect(page.locator('[data-stair="up"]')).toHaveCount(1)

    // removing the top floor takes its rooms and the stairs to it; undo brings them back
    await page.getByRole('button', { name: 'More floor actions' }).click()
    await page.getByRole('menuitem', { name: 'Remove the first floor' }).click()
    await expect(floorRadios(page)).toHaveCount(1)
    p = await saved(page)
    expect(Object.keys(p.levels)).toHaveLength(1)
    expect(p.stairs).toBeUndefined()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(floorRadios(page)).toHaveCount(2)
    expect(problems).toEqual([])
  })
})
