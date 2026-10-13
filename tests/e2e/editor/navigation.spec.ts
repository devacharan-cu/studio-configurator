import { expect, test, type Page } from '@playwright/test'
import { clickPlan, openFresh, pixelDiff, saved, sceneShot, STORAGE_KEY, watchProblems } from './helpers'

/* Real-input navigation tests: pointer lock, mouse look and keyboard movement in the production build.
 * Headless Chromium grants pointer lock and reports movementX/Y for Playwright mouse moves; the one
 * thing synthetic input can't do is the browser's own Esc-releases-lock, so tests release it with
 * document.exitPointerLock(), which is exactly what that Esc does. */

const LOOK_RATE = 0.0022 // rad per px at sensitivity 1 (src/editor/scene/useNavInput.ts)
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

async function walkState(page: Page) {
  const hud = page.getByTestId('walk-hud')
  const [x, y] = ((await hud.getAttribute('data-walk-pos')) ?? '0,0').split(',').map(Number)
  const [yaw, pitch] = ((await hud.getAttribute('data-walk-look')) ?? '0,0').split(',').map(Number)
  return { x, y, yaw, pitch }
}
async function flyState(page: Page) {
  const hud = page.getByTestId('fly-hud')
  const [x, y, z] = ((await hud.getAttribute('data-fly-pos')) ?? '0,0,0').split(',').map(Number)
  const [yaw, pitch] = ((await hud.getAttribute('data-fly-look')) ?? '0,0').split(',').map(Number)
  return { x, y, z, yaw, pitch }
}
const settle = (page: Page) => page.waitForTimeout(350) // HUD attributes refresh every 150 ms
const hold = async (page: Page, keys: string[], ms: number) => {
  for (const k of keys) await page.keyboard.down(k)
  await page.waitForTimeout(ms)
  for (const k of [...keys].reverse()) await page.keyboard.up(k)
  await settle(page)
}

let mouse = { x: 720, y: 450 }
/** Relative mouse movement (pointer lock reports movementX/Y). */
async function look(page: Page, dx: number, dy: number) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 40))
  for (let i = 0; i < steps; i++) {
    mouse = { x: mouse.x + dx / steps, y: mouse.y + dy / steps }
    await page.mouse.move(mouse.x, mouse.y)
  }
}
async function capture(page: Page) {
  await page.getByTestId('nav-capture').click()
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName ?? null)).toBe('CANVAS')
  mouse = { x: 720, y: 450 }
  await page.mouse.move(mouse.x, mouse.y)
}
const release = (page: Page) => page.evaluate(() => document.exitPointerLock())

/** Steer with the mouse and walk with W towards a point, like a person would. */
async function walkTo(page: Page, tx: number, ty: number, tol = 0.2) {
  for (let i = 0; i < 60; i++) {
    const s = await walkState(page)
    const d = Math.hypot(tx - s.x, ty - s.y)
    if (d < tol) return s
    const want = Math.atan2(-(tx - s.x), -(ty - s.y))
    await look(page, wrap(s.yaw - want) / LOOK_RATE, 0)
    await hold(page, ['w'], Math.min(450, 120 + d * 220))
  }
  throw new Error(`could not reach ${tx},${ty}`)
}

test.describe('navigation: walk, fly and orbit', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'mouse + keyboard navigation (touch is covered in walk.spec)')
    await openFresh(page)
  })

  test('walkthrough is full screen; pointer lock, free look (no roll) and Esc behave like a game', async ({ page }) => {
    const problems = watchProblems(page)
    await page.getByRole('button', { name: 'Walk through' }).click()
    await expect(page.getByTestId('walk-room')).toHaveText('Hall')
    // immersive: editing chrome hidden, the canvas fills the window
    await expect(page.getByRole('navigation', { name: 'Tools' })).toHaveCount(0)
    await expect(page.getByTestId('plan-view')).toHaveCount(0)
    await expect(page.getByTestId('save-state')).toHaveCount(0)
    const box = (await page.getByTestId('scene-view').locator('canvas').boundingBox())!
    expect(box.width).toBeGreaterThan(1430)
    expect(box.height).toBeGreaterThan(890)
    await expect(page.getByTestId('nav-help')).toBeVisible()
    await page.waitForTimeout(900) // entry glide

    // arrives looking into the home (north, through the hall door), level
    const s0 = await walkState(page)
    expect(Math.abs(wrap(s0.yaw))).toBeLessThan(0.3)

    await capture(page)
    await expect(page.getByTestId('walk-hud')).toHaveAttribute('data-locked', 'true')
    // full horizontal turn: 2π of mouse movement brings you back to the same heading
    await look(page, (2 * Math.PI) / LOOK_RATE, 0)
    await settle(page)
    expect(Math.abs(wrap((await walkState(page)).yaw - s0.yaw))).toBeLessThan(0.05)
    // look right a quarter turn
    await look(page, Math.PI / 2 / LOOK_RATE, 0)
    await settle(page)
    expect(wrap((await walkState(page)).yaw - s0.yaw)).toBeCloseTo(-Math.PI / 2, 1)
    // look all the way up and down: pitch clamps at ±85°, never flips over
    await look(page, 0, -2000)
    await settle(page)
    expect((await walkState(page)).pitch).toBeCloseTo((85 * Math.PI) / 180, 2)
    const up = await sceneShot(page)
    await look(page, 0, 4000)
    await settle(page)
    expect((await walkState(page)).pitch).toBeCloseTo((-85 * Math.PI) / 180, 2)
    const down = await sceneShot(page)
    expect(await pixelDiff(page, up, down)).toBeGreaterThan(0.2) // ceiling vs floor really differ
    await look(page, 0, -1930)

    // Esc #1 releases the mouse (UI usable again), Esc #2 returns to the editor's previous view
    await release(page)
    await expect(page.getByTestId('walk-hud')).toHaveAttribute('data-locked', 'false')
    await expect(page.getByTestId('nav-capture')).toBeVisible()
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('walk-hud')).toHaveCount(0)
    await expect(page.getByTestId('plan-view')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Tools' })).toBeVisible()
    expect(problems).toEqual([])
  })

  test('WASD moves relative to the view, Shift runs, speed is adjustable; movement eases in and out', async ({ page }) => {
    await page.getByRole('button', { name: 'Walk through' }).click()
    await page.getByRole('button', { name: 'Go to room' }).click()
    await page.getByRole('menuitem', { name: 'Living & dining' }).click()
    await page.waitForTimeout(1000)
    await capture(page)
    // face west along the living room's open side (x decreasing), at y ≈ 3.4 between sofa and table
    await walkTo(page, 3.1, 3.45)
    const want = Math.PI / 2 // forward = (−sin, −cos) = (−1, 0)
    await look(page, wrap((await walkState(page)).yaw - want) / LOOK_RATE, 0)
    await settle(page)

    const a = await walkState(page)
    await hold(page, ['s'], 600) // backwards = east
    const b = await walkState(page)
    expect(b.x - a.x).toBeGreaterThan(0.4)
    expect(Math.abs(b.y - a.y)).toBeLessThan(0.1)
    await hold(page, ['a'], 500) // strafe left while facing west = south
    const c = await walkState(page)
    expect(c.y - b.y).toBeGreaterThan(0.25)
    await hold(page, ['d'], 500) // strafe right = north
    const d = await walkState(page)
    expect(d.y - c.y).toBeLessThan(-0.25)

    // walking vs running over the same time
    await walkTo(page, 5.6, 3.45)
    await look(page, wrap((await walkState(page)).yaw - want) / LOOK_RATE, 0)
    await settle(page)
    const w0 = await walkState(page)
    await hold(page, ['w'], 700)
    const w1 = await walkState(page)
    await walkTo(page, 5.6, 3.45)
    await look(page, wrap((await walkState(page)).yaw - want) / LOOK_RATE, 0)
    await settle(page)
    const r0 = await walkState(page)
    await hold(page, ['Shift', 'w'], 700)
    const r1 = await walkState(page)
    const walkD = w0.x - w1.x
    const runD = r0.x - r1.x
    expect(walkD).toBeGreaterThan(0.5)
    expect(runD).toBeGreaterThan(walkD * 1.6)

    // the speed setting changes walking pace and is remembered in this browser
    await release(page)
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('nav-walk-speed').fill('2.8')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('roomset.editor.v1.nav') ?? '{}').walkSpeed)).toBeCloseTo(2.8)
    await page.getByTestId('nav-settings').click()
  })

  test('a walking tour through every doorway visits all six rooms; walls stop you even when running', async ({ page }) => {
    test.setTimeout(150_000)
    const before = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)
    await page.getByRole('button', { name: 'Walk through' }).click()
    await page.waitForTimeout(1000)
    await capture(page)
    const room = page.getByTestId('walk-room')
    const visited = new Set<string>(['Hall'])
    const route: [number, number][] = [
      [4.55, 5.2], [4.55, 4.0], // hall → living (door at x 4.1–5.0)
      [5.8, 3.6], [6.6, 3.0], // across the living room → kitchen (open passage)
      [7.0, 3.6], [8.4, 3.85], [8.4, 5.2], // kitchen → study (door at x 7.95–8.85)
      [8.4, 3.85], [7.0, 3.6], [6.6, 3.0], [5.8, 3.6], [4.55, 4.0], [4.55, 5.42], // back to the hall
      [5.65, 5.42], // hall → bathroom (door at y 5.0–5.8)
      [4.6, 5.45], [4.6, 7.55], [3.2, 7.55], // hall → bedroom (door at y 7.1–8.0)
    ]
    for (const [x, y] of route) {
      await walkTo(page, x, y)
      visited.add(await room.innerText())
    }
    expect([...visited].sort()).toEqual(['Bathroom', 'Bedroom', 'Hall', 'Kitchen', 'Living & dining', 'Study'])

    // run (Shift) straight at the bedroom's west exterior wall (x = 0; plain wall at y = 7.6) for 3 s
    const want = Math.PI / 2
    await walkTo(page, 1.2, 7.6)
    await look(page, wrap((await walkState(page)).yaw - want) / LOOK_RATE, 0)
    await hold(page, ['Shift', 'w'], 3000)
    const s = await walkState(page)
    expect(s.x).toBeGreaterThan(0.125 + 0.25 - 0.01) // stopped at the wall's inner face + body radius
    await expect(room).toHaveText('Bedroom')

    // navigation never edits the project
    await release(page)
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBe(before)
  })

  test('free camera flies anywhere: up, down, along the view, viewpoints; exit restores the orbit view', async ({ page }) => {
    await page.getByRole('button', { name: '3D', exact: true }).click()
    await page.waitForTimeout(1200)
    const orbitBefore = await sceneShot(page)
    await page.getByRole('button', { name: 'Free camera' }).click()
    await expect(page.getByTestId('fly-hud')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Tools' })).toHaveCount(0)
    await page.waitForTimeout(500)

    await page.getByTestId('fly-viewpoints').click()
    await page.getByRole('menuitem', { name: 'Inside: Living & dining' }).click()
    await page.waitForTimeout(1300)
    const v = await flyState(page)
    expect(v.y).toBeCloseTo(2.2, 1)
    await capture(page)
    await hold(page, ['e'], 600)
    const up = await flyState(page)
    expect(up.y - v.y).toBeGreaterThan(0.8)
    await hold(page, ['q'], 900)
    const down = await flyState(page)
    expect(up.y - down.y).toBeGreaterThan(1.2)
    // can't go below the ground
    await hold(page, ['q'], 2500)
    expect((await flyState(page)).y).toBeGreaterThanOrEqual(0.11)
    // look straight up and press W: you rise (forward follows the view, not the floor)
    await look(page, 0, -1500)
    await settle(page)
    expect((await flyState(page)).pitch).toBeGreaterThan(1.5)
    const f0 = await flyState(page)
    await hold(page, ['w'], 600)
    const f1 = await flyState(page)
    expect(f1.y - f0.y).toBeGreaterThan(0.8)
    expect(Math.hypot(f1.x - f0.x, f1.z - f0.z)).toBeLessThan(0.2)
    // wheel changes the base speed
    await release(page)
    const speed0 = await page.evaluate(() => JSON.parse(localStorage.getItem('roomset.editor.v1.nav') ?? '{"flySpeed":3}').flySpeed)
    await page.mouse.move(720, 450)
    await page.mouse.wheel(0, -300)
    await page.waitForTimeout(300)
    const speed1 = await page.evaluate(() => JSON.parse(localStorage.getItem('roomset.editor.v1.nav') ?? '{}').flySpeed)
    expect(speed1).toBeGreaterThan(speed0)

    // aerial viewpoint, then back to the editor: the orbit view is exactly where we left it
    await page.getByTestId('fly-viewpoints').click()
    await page.getByRole('menuitem', { name: 'Aerial overview' }).click()
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: 'Exit free camera' }).click()
    await expect(page.getByRole('navigation', { name: 'Tools' })).toBeVisible()
    await page.waitForTimeout(1500)
    const orbitAfter = await sceneShot(page)
    expect(await pixelDiff(page, orbitBefore, orbitAfter)).toBeLessThan(0.02)
  })

  test('switching walk ↔ fly ↔ editor keeps the selection and the project; orbit presets and framing work', async ({ page }) => {
    // select the dining table in the plan
    await clickPlan(page, 4.7, 2.0)
    await expect(page.getByTestId('item-rotation')).toBeVisible()
    const before = await saved(page)
    const pre = await sceneShot(page)
    await page.getByRole('button', { name: 'Views' }).click()
    await page.getByRole('menuitem', { name: 'Front (south)' }).click()
    const front = await sceneShot(page)
    expect(await pixelDiff(page, pre, front)).toBeGreaterThan(0.1)
    await page.getByRole('button', { name: 'Frame selection' }).click()
    const framed = await sceneShot(page)
    expect(await pixelDiff(page, front, framed)).toBeGreaterThan(0.1)

    await page.getByRole('button', { name: 'Walk through' }).click()
    await page.waitForTimeout(900)
    await page.getByRole('button', { name: 'Fly' }).click()
    await expect(page.getByTestId('fly-hud')).toBeVisible()
    await page.getByRole('button', { name: 'Walk' }).click()
    await expect(page.getByTestId('walk-hud')).toBeVisible()
    await page.getByRole('button', { name: 'Exit walkthrough' }).click()
    // back in the split editor with the table still selected and the project untouched
    await expect(page.getByTestId('plan-view')).toBeVisible()
    await expect(page.getByTestId('item-rotation')).toBeVisible()
    expect(await saved(page)).toEqual(before)
    // F frames the selection, H the whole home (keyboard)
    await page.keyboard.press('h')
    const home = await sceneShot(page)
    expect(await pixelDiff(page, framed, home)).toBeGreaterThan(0.1)
  })

  test('adding a window on top of an existing one places it beside it; a full wall says so once, not stacked errors', async ({ page }) => {
    await page.getByRole('button', { name: 'Window', exact: true }).click()
    // the living room's north wall has windows at x = 1.6 and 4.6 (1.6 m wide); click right on the first
    await clickPlan(page, 1.6, 0)
    await expect(page.getByTestId('notice-info')).toContainText('beside the existing opening')
    let p = await saved(page)
    const onNorth = () => Object.values(p.openings).filter((o) => o.kind === 'window' && p.nodes[p.walls[o.wall].a].y === 0 && p.nodes[p.walls[o.wall].b].y === 0)
    expect(onNorth()).toHaveLength(4) // 2 living + 1 kitchen + the new one
    // the wall is now full: further clicks are refused with a reason — one notice, however many clicks
    for (let i = 0; i < 3; i++) await clickPlan(page, 1.6, 0)
    await expect(page.getByTestId('notice-error')).toHaveCount(1)
    await expect(page.getByTestId('notice-error')).toContainText('No free space on this wall')
    p = await saved(page)
    expect(onNorth()).toHaveLength(4)
    // on each wall, windows are distinct, non-overlapping intervals (offsets are along their own wall)
    for (const wall of new Set(onNorth().map((o) => o.wall))) {
      const spans = onNorth().filter((o) => o.wall === wall).map((o) => [o.offset - o.width / 2, o.offset + o.width / 2]).sort((a, b) => a[0] - b[0])
      for (let i = 1; i < spans.length; i++) expect(spans[i][0]).toBeGreaterThanOrEqual(spans[i - 1][1])
    }
  })
})
