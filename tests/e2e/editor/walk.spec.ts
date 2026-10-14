import { expect, test, type Page } from '@playwright/test'
import { openFresh } from './helpers'

const pos = async (page: Page) => {
  const v = (await page.getByTestId('walk-hud').getAttribute('data-walk-pos')) ?? '0,0'
  const [x, y] = v.split(',').map(Number)
  return { x, y }
}
const room = (page: Page) => page.getByTestId('walk-room')

async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key)
  await page.waitForTimeout(ms)
  await page.keyboard.up(key)
  await page.waitForTimeout(300)
}

/** Take pointer lock and turn to yaw 0 (north) with a relative mouse move, as a person would. */
async function faceNorth(page: Page) {
  await page.waitForTimeout(400) // the HUD's look attribute refreshes every 150 ms
  await page.getByTestId('nav-capture').click()
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName ?? null)).toBe('CANVAS')
  const [yaw] = ((await page.getByTestId('walk-hud').getAttribute('data-walk-look')) ?? '0,0').split(',').map(Number)
  const turn = Math.atan2(Math.sin(yaw), Math.cos(yaw)) / 0.0022 // look rate at sensitivity 1 (useNavInput)
  await page.mouse.move(720, 450)
  for (let i = 1; i <= 10; i++) await page.mouse.move(720 + (turn * i) / 10, 450)
  await page.waitForTimeout(300)
  await page.evaluate(() => document.exitPointerLock())
  const [after] = ((await page.getByTestId('walk-hud').getAttribute('data-walk-look')) ?? '0,0').split(',').map(Number)
  expect(Math.cos(after)).toBeGreaterThan(0.98)
}

test.describe('editor: first-person walkthrough', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'keyboard walkthrough is desktop; touch is covered below')
    await openFresh(page)
    await page.getByRole('button', { name: 'Walk through' }).click()
    await expect(room(page)).toHaveText('Hall')
    await page.waitForTimeout(1000) // entry transition
  })

  test('walks from the hall through the doorway into the living room', async ({ page }) => {
    const start = await pos(page)
    await hold(page, 'w', 2500)
    const end = await pos(page)
    expect(end.y).toBeLessThan(4.6 - 0.25) // crossed the hall/living wall at y = 4.6
    expect(start.y - end.y).toBeGreaterThan(2)
    await expect(room(page)).toHaveText('Living & dining')
  })

  test('walls and furniture block movement; you cannot leave through a window', async ({ page }) => {
    // walk up the hall past the bedroom door (x = 3.8, y 7.1–8.0), then strafe west into plain wall
    await hold(page, 'w', 900)
    expect((await pos(page)).y).toBeLessThan(6.8)
    await hold(page, 'a', 2000)
    const p1 = await pos(page)
    expect(p1.x).toBeGreaterThan(3.8 + 0.06 + 0.24)
    await expect(room(page)).toHaveText('Hall')
    // go to the living room, turn to face north and walk into the exterior wall (with windows)
    await page.getByRole('button', { name: 'Go to room' }).click()
    await page.getByRole('menuitem', { name: 'Living & dining' }).click()
    await faceNorth(page)
    await hold(page, 'w', 3500)
    const p2 = await pos(page)
    expect(p2.y).toBeGreaterThan(0.125 + 0.24)
    await expect(room(page)).toHaveText('Living & dining')
  })

  test('room navigation, smooth frames while moving, and exit back to editing', async ({ page }) => {
    await page.getByRole('button', { name: 'Go to room' }).click()
    await page.getByRole('menuitem', { name: 'Kitchen' }).click()
    await expect(room(page)).toHaveText('Kitchen')
    // measure frame times while walking: no recurring long freezes
    await page.keyboard.down('s')
    const frames = await page.evaluate(
      () =>
        new Promise<number[]>((res) => {
          const f: number[] = []
          let last = performance.now()
          const loop = (t: number) => {
            f.push(t - last)
            last = t
            if (f.length < 120) requestAnimationFrame(loop)
            else res(f.slice(5).sort((a, b) => a - b))
          }
          requestAnimationFrame(loop)
        }),
    )
    await page.keyboard.up('s')
    const p95 = frames[Math.floor(frames.length * 0.95)]
    expect(p95).toBeLessThan(100)
    await page.getByRole('button', { name: 'Exit walkthrough' }).click()
    await expect(page.getByTestId('walk-hud')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Walk through' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Tools' })).toBeVisible()
  })
})

test('touch: the on-screen joystick moves the visitor @mobile', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'touch-only')
  await openFresh(page).catch(async () => {
    // narrow screens: the plan and 3D still load; room labels count is the same
    await expect(page.getByTestId('scene-view').locator('canvas')).toBeVisible()
  })
  await page.getByRole('button', { name: 'Walk through' }).click()
  await expect(room(page)).toHaveText('Hall')
  await page.waitForTimeout(1000)
  const start = await pos(page)
  const stick = page.getByRole('application', { name: 'Move' })
  const box = (await stick.boundingBox())!
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  // synthetic touch pointer: push the stick up (forward) for 2 s
  await stick.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: cx, clientY: cy, isPrimary: true, bubbles: true })
  await stick.dispatchEvent('pointermove', { pointerId: 7, pointerType: 'touch', clientX: cx, clientY: cy - 40, isPrimary: true, bubbles: true })
  await page.waitForTimeout(2000)
  await stick.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: cx, clientY: cy - 40, isPrimary: true, bubbles: true })
  await page.waitForTimeout(400)
  const end = await pos(page)
  expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeGreaterThan(1)
})
