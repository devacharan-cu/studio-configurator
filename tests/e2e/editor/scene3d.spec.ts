import { expect, test, type Page } from '@playwright/test'
import { projectToScreen } from './camera'
import { clickPlan, nodeAt, openFresh, saved, type SavedProject } from './helpers'

async function drag3d(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
}

// East face of the living/kitchen wall (x = 6.2 ± 0.06), below the 1.15 m cut-away height.
const WALL_POINT: [number, number, number] = [6.27, 0.6, 1.2]

test.describe('editor: direct 3D editing → model → 2D', () => {
  let p: SavedProject

  test.beforeEach(async ({ page }) => {
    await openFresh(page)
    p = await saved(page)
  })

  test('clicking a wall in 3D selects it everywhere; the first drag only orbits', async ({ page }) => {
    const at = await projectToScreen(page, p, WALL_POINT)
    // drag on an unselected wall = camera orbit, never an edit
    await drag3d(page, at, { x: at.x + 60, y: at.y })
    let q = await saved(page)
    expect(nodeAt(q, 6.2, 0)).toBeTruthy()
    // a click selects it: inspector and 2D plan both reflect the selection
    await openFresh(page)
    q = await saved(page)
    const at2 = await projectToScreen(page, q, WALL_POINT)
    await page.mouse.click(at2.x, at2.y)
    await expect(page.getByTestId('inspector')).toContainText('Between Living & dining and Kitchen')
    await expect(page.locator('[data-dimension]')).toHaveCount(1)
  })

  test('dragging a selected wall in 3D moves it in the model and the 2D plan follows', async ({ page }) => {
    const at = await projectToScreen(page, p, WALL_POINT)
    await page.mouse.click(at.x, at.y) // select
    const target = await projectToScreen(page, p, [6.87, 0.6, 1.2])
    await drag3d(page, at, target)
    const q = await saved(page)
    const moved = Object.values(q.nodes).find((n) => Math.abs(n.y) < 1e-6 && n.x > 6.3 && n.x < 7.2)
    expect(moved, 'the wall run moved east').toBeTruthy()
    expect(nodeAt(q, 6.2, 0)).toBeFalsy()
    // 2D plan: the kitchen's area label shrank from 16.0 m²
    await expect(page.locator('[data-room-area="Kitchen"]')).not.toHaveText('16.0 m²')
    // one undo step reverts the 3D edit
    await page.getByRole('button', { name: 'Undo' }).click()
    expect(nodeAt(await saved(page), 6.2, 0)).toBeTruthy()
  })

  test('furniture selected in 2D can be dragged in 3D', async ({ page }) => {
    // (the dining table is used because, from this camera, the bedroom wardrobe hides the sofa)
    const table = Object.values(p.items).find((i) => i.asset === 'table-dining-round')!
    await clickPlan(page, table.x, table.y) // select in 2D
    await expect(page.getByTestId('inspector')).toContainText('Round pedestal dining table')
    const at = await projectToScreen(page, p, [table.x, 0.76, table.y])
    const to = await projectToScreen(page, p, [table.x - 0.4, 0.76, table.y])
    await drag3d(page, at, to)
    const q = await saved(page)
    expect(q.items[table.id].x).toBeLessThan(table.x - 0.2)
    expect(q.items[table.id].y).toBeCloseTo(table.y, 1)
  })

  test('the library places furniture where you click on a 3D floor; tools add doors on 3D walls', async ({ page }) => {
    await page.getByRole('button', { name: 'Furnish' }).click()
    await page.locator('[data-asset="plant-large"]').click()
    // close the panel (the placement tool stays armed) so the 3D canvas is back at the size its camera was framed for
    await page.getByRole('button', { name: 'Close library' }).click()
    await page.waitForTimeout(1600) // the untouched overview glides back to fit the wider canvas (~1.5 s)
    const floor = await projectToScreen(page, p, [8.4, 0, 3.8]) // kitchen floor, clear of the island
    await page.mouse.click(floor.x, floor.y)
    let q = await saved(page)
    const plants = Object.values(q.items).filter((i) => i.asset === 'plant-large')
    expect(plants).toHaveLength(2)
    const added = plants.find((i) => !p.items[i.id])!
    expect(added.x).toBeCloseTo(8.4, 0)
    expect(added.y).toBeCloseTo(3.8, 0)

    await page.getByRole('button', { name: 'Door', exact: true }).click()
    const wall = await projectToScreen(page, q, [6.27, 0.6, 0.9])
    await page.mouse.click(wall.x, wall.y)
    q = await saved(page)
    expect(Object.values(q.openings).filter((o) => o.kind === 'door')).toHaveLength(6)
  })
})
