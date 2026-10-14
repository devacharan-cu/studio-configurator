import { expect, test, type Page } from '@playwright/test'
import { openFresh, saved, watchProblems } from './helpers'

/* Every house template, end to end in the production build: open it from the gallery, check the plan
 * and the 3D view, walk into every room, edit it, and confirm the edit survives a reload. */

async function templateIds(page: Page) {
  await page.getByRole('button', { name: 'Designs' }).click()
  const ids = await page.locator('[data-template]').evaluateAll((els) => els.map((e) => e.getAttribute('data-template')!).filter((id) => id !== 'blank'))
  await page.getByRole('button', { name: 'Close' }).click()
  return ids
}

test.describe('house templates, each one', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'desktop'))

  test('the gallery lists at least ten designs, each with numbers computed from its model', async ({ page }) => {
    await openFresh(page)
    const ids = await templateIds(page)
    expect(ids.length).toBeGreaterThanOrEqual(10)
    await page.getByRole('button', { name: 'Designs' }).click()
    for (const id of ids) await expect(page.locator(`[data-template="${id}"]`).getByTestId('template-facts')).toHaveText(/(\d+ bed|Studio) · \d+ bath · \d+ floors? · \d+ m²/)
    // multi-storey designs say so, and their preview shows a plan for every floor
    await expect(page.locator('[data-template="row-house"]').getByTestId('template-facts')).toContainText('3 floors')
    await page.locator('[data-template="duplex"]').click()
    await expect(page.getByTestId('template-floor-plan')).toHaveCount(2)
    await expect(page.getByTestId('template-floor-plan').nth(1)).toContainText('First floor plan')
  })

  for (const id of [
    'studio-apartment',
    'apartment-1bhk',
    'city-apartment-2bhk',
    'family-apartment-3bhk',
    'l-bungalow',
    'verandah-bungalow',
    'courtyard-house',
    'family-home-4bed',
    'duplex',
    'row-house',
    'family-villa',
  ]) {
    test(`${id}: opens in 2D and 3D, every room can be walked to, an edit survives a reload`, async ({ page }) => {
      test.setTimeout(150_000)
      const problems = watchProblems(page)
      await openFresh(page)
      await page.getByRole('button', { name: 'Designs' }).click()
      await page.locator(`[data-template="${id}"]`).click()
      const rooms = await page.getByTestId('template-preview').getByRole('list', { name: 'Rooms' }).locator('li').count()
      await page.getByRole('button', { name: 'Create a project from this design' }).click()
      // 2D: the plan draws the ground floor's rooms (labels shed on very small rooms by design); the saved
      // project is the whole template, every floor
      const p = await saved(page)
      expect(Object.keys(p.rooms)).toHaveLength(rooms)
      const ground = Object.values(p.levels).sort((a, b) => a.elevation - b.elevation)[0].id
      const groundRooms = Object.values(p.rooms).filter((r) => r.level === ground).length
      await expect.poll(() => page.locator('[data-room-label]').count()).toBeGreaterThan(groundRooms / 2)
      await expect(page.getByTestId('scene-view').locator('canvas')).toBeVisible()

      // walkthrough: every room reachable through "Go to room", and the HUD agrees
      await page.getByRole('button', { name: 'Walk through' }).click()
      await page.getByRole('button', { name: 'Go to room' }).click()
      const names = await page.getByRole('menuitem').allInnerTexts()
      await page.getByRole('button', { name: 'Go to room' }).click()
      expect(names).toHaveLength(rooms)
      for (const n of names) {
        await page.getByRole('button', { name: 'Go to room' }).click()
        await page.getByRole('menuitem', { name: n, exact: true }).click()
        await expect(page.getByTestId('walk-room')).toHaveText(n)
      }
      await page.getByRole('button', { name: 'Exit walkthrough' }).click()
      // the walk may have ended upstairs: edit on the ground floor
      if ((await page.getByRole('radiogroup', { name: 'Floor' }).getByRole('radio').count()) > 1) await page.getByRole('radio', { name: 'Ground' }).click()

      // edit: give the first room a terrazzo floor, then reload
      const first = Object.values(p.rooms)[0]
      await page.getByRole('list').getByRole('button').filter({ hasText: first.name }).first().click()
      await page.getByRole('radio', { name: 'Terrazzo' }).click()
      await expect.poll(async () => (await saved(page)).rooms[first.id].floorFinish).toBe('terrazzo')
      await page.reload()
      await expect.poll(() => page.locator('[data-room-label]').count()).toBeGreaterThan(groundRooms / 2)
      expect(Object.keys((await saved(page)).rooms)).toHaveLength(rooms)
      expect((await saved(page)).rooms[first.id].floorFinish).toBe('terrazzo')
      expect(problems).toEqual([])
    })
  }
})
