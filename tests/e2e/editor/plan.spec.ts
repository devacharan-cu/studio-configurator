import { expect, test } from '@playwright/test'
import { clickPlan, dragPlan, nodeAt, openFresh, pixelDiff, roomNamed, saved, sceneShot, watchProblems } from './helpers'

test.describe('editor: 2D plan → model → 3D', () => {
  test('opens the template cleanly in both views', async ({ page }) => {
    const problems = watchProblems(page)
    await openFresh(page)
    // the template is persisted on open, so a reload restores it even before any edit
    const p = await saved(page)
    expect(Object.keys(p.rooms)).toHaveLength(6)
    await expect(page.locator('[data-room-label="Living & dining"]')).toBeVisible()
    await expect(page.locator('[data-opening="door"]')).toHaveCount(5)
    expect(problems).toEqual([])
  })

  test('dragging a shared wall in 2D moves it in the model, resizes both rooms and updates 3D', async ({ page }) => {
    await openFresh(page)
    const before3d = await sceneShot(page)
    await dragPlan(page, [6.2, 1.2], [6.8, 1.2])
    const p = await saved(page)
    expect(nodeAt(p, 6.8, 0)).toBeTruthy()
    expect(nodeAt(p, 6.2, 0)).toBeFalsy()
    // the room areas shown in the plan follow the model
    await expect(page.locator('[data-room-area="Kitchen"]')).toHaveText('13.3 m²')
    expect(await pixelDiff(page, before3d, await sceneShot(page))).toBeGreaterThan(0.002)
    // the passage between the two rooms is still hosted by that wall, inside it
    const passage = Object.values(p.openings).find((o) => o.kind === 'passage')!
    const w = p.walls[passage.wall]
    expect(Math.abs(p.nodes[w.a].x - 6.8) < 1e-6 && Math.abs(p.nodes[w.b].x - 6.8) < 1e-6).toBe(true)
  })

  test('drawing a room creates walls shared with the building and 3D geometry', async ({ page }) => {
    await openFresh(page)
    const before3d = await sceneShot(page)
    await page.getByRole('button', { name: 'Room', exact: true }).click()
    await dragPlan(page, [10, 0], [13.5, 4.6])
    const p = await saved(page)
    expect(Object.keys(p.rooms)).toHaveLength(7)
    // the kitchen's east wall (x = 10, 0..4.6) is reused, not duplicated: 3 new walls only
    expect(Object.keys(p.walls)).toHaveLength(19 + 3)
    await expect(page.locator('[data-room-label="Room 7"]')).toBeVisible()
    expect(await pixelDiff(page, before3d, await sceneShot(page))).toBeGreaterThan(0.002)
  })

  test('invalid edits are rejected with an explanation and leave the model unchanged', async ({ page }) => {
    await openFresh(page)
    await page.getByRole('button', { name: 'Room', exact: true }).click()
    await dragPlan(page, [1, 1], [3, 3]) // inside the living room
    await expect(page.getByTestId('notice-error')).toContainText(/overlap/i)
    await page.keyboard.press('Escape')
    let p = await saved(page)
    expect(Object.keys(p.rooms)).toHaveLength(6)
    // drag the living/kitchen wall into the kitchen's far wall: the drag is constrained to the last valid
    // position and the user is told why; the committed model is still valid
    await page.keyboard.press('v')
    await dragPlan(page, [6.2, 1.2], [9.95, 1.2])
    await expect(page.getByTestId('notice-error').last()).toContainText('Stopped at the last valid position')
    p = await saved(page)
    const x = Math.max(...Object.values(p.nodes).filter((n) => Math.abs(n.y) < 1e-6 && n.x > 1 && n.x < 9.99).map((n) => n.x))
    expect(x).toBeGreaterThan(6.2)
    expect(x).toBeLessThan(9.99)
    await expect(page.locator('[data-room-label]')).toHaveCount(6)
  })

  test('doors and windows are added on walls, moved along them, and stay hosted', async ({ page }) => {
    await openFresh(page)
    await page.getByRole('button', { name: 'Window', exact: true }).click()
    await clickPlan(page, 3.1, 0) // living room north wall, between the two windows
    let p = await saved(page)
    expect(Object.values(p.openings).filter((o) => o.kind === 'window')).toHaveLength(11)
    const added = Object.values(p.openings).find((o) => o.kind === 'window' && Math.abs(o.offset - 3.1) < 0.2)
    expect(added).toBeTruthy()
    // move the kitchen→study door along its wall in the inspector
    await page.keyboard.press('v')
    const door = Object.values(p.openings).find((o) => o.kind === 'door' && Math.abs(p.nodes[p.walls[o.wall].a].y - 4.6) < 1e-6 && p.nodes[p.walls[o.wall].a].x >= 7.6)!
    const w = p.walls[door.wall]
    const [a, b] = [p.nodes[w.a], p.nodes[w.b]]
    const L = Math.hypot(b.x - a.x, b.y - a.y)
    await clickPlan(page, a.x + ((b.x - a.x) * door.offset) / L, a.y + ((b.y - a.y) * door.offset) / L)
    const offset = page.getByTestId('opening-offset')
    // 1.2 m from the wall's start fits a 0.9 m door on this 2.4 m wall whichever way the wall runs
    await offset.fill('1.20')
    await offset.press('Enter')
    p = await saved(page)
    expect(p.openings[door.id].offset).toBeCloseTo(1.2)
    // too far: rejected with a reason, model unchanged
    await offset.fill('2.30')
    await offset.press('Enter')
    await expect(page.getByTestId('notice-error').last()).toContainText(/doesn’t fit/)
    p = await saved(page)
    expect(p.openings[door.id].offset).toBeCloseTo(1.2)
    expect(p.openings[door.id].wall).toBe(door.wall)
  })

  test('numeric room width edits geometry, measurements and the neighbour', async ({ page }) => {
    await openFresh(page)
    await page.locator('[data-room-label="Study"]').waitFor()
    await page.getByRole('button', { name: 'Study' }).click() // from the inspector's room list
    await expect(page.getByTestId('room-width')).toHaveValue('2.40')
    // the study's east wall is exterior; widen the study by 0.6 m (moves x = 10 → 10.6)
    await page.getByTestId('room-width').fill('3.00')
    await page.getByTestId('room-width').press('Enter')
    const p = await saved(page)
    const study = roomNamed(p, 'Study')
    const xs = study.boundary.map((id) => p.nodes[id].x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(3.0)
    // the kitchen shares the x=10 wall run, so it widens too
    const kitchen = roomNamed(p, 'Kitchen')
    expect(Math.max(...kitchen.boundary.map((id) => p.nodes[id].x))).toBeCloseTo(10.6)
  })

  test('undo/redo reverse and restore model changes; reload restores the saved project', async ({ page }) => {
    await openFresh(page)
    await dragPlan(page, [6.2, 1.2], [6.8, 1.2])
    await saved(page)
    await page.getByRole('button', { name: 'Undo' }).click()
    let p = await saved(page)
    expect(nodeAt(p, 6.2, 0)).toBeTruthy()
    await page.getByRole('button', { name: 'Redo' }).click()
    p = await saved(page)
    expect(nodeAt(p, 6.8, 0)).toBeTruthy()
    await page.reload()
    await expect(page.locator('[data-room-area="Kitchen"]')).toHaveText('13.3 m²')
  })

  test('a corrupted saved project is refused and the editor still opens', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('roomset.editor.v1.project', '{"schema":"roomset.project","version":1,"__proto__":{"x":1}}'))
    await page.reload()
    await expect(page.getByTestId('notice-error')).toContainText(/couldn’t be opened/)
    await expect(page.locator('[data-room-label]')).toHaveCount(6)
  })
})
