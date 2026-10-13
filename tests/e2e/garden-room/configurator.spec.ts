import { expect, test } from '@playwright/test'
import {
  canvasShot,
  chooseDesktop,
  expectRendered,
  groupHeader,
  pixelDiff,
  rendered,
  waitForScene,
  watchProblems,
  type Rendered,
} from './helpers'

const DEFAULTS: Rendered = {
  sofa: 'arlo-linen',
  coffeeTable: 'slab-concrete-oak',
  flooring: 'oak-herringbone',
  wallFinish: 'chalk-white',
  rug: 'ivory-boucle',
}

test.describe('3D room', () => {
  test('loads cleanly with the studio defaults, no console errors or failed requests', async ({ page }) => {
    const problems = watchProblems(page)
    await page.goto('/garden-room')
    await expect(page.getByRole('status').filter({ hasText: 'Setting the scene' })).toBeVisible()
    await waitForScene(page)
    expect(await rendered(page)).toEqual(DEFAULTS)
    await expect(page.locator('main canvas')).toBeVisible()
    expect(problems).toEqual([])
  })

  const CASES: [keyof Rendered, string][] = [
    ['sofa', 'arlo-corner-boucle'],
    ['coffeeTable', 'ribbon-round'],
    ['flooring', 'limestone'],
    ['wallFinish', 'ink-blue'],
    ['rug', 'jute-round'],
  ]

  for (const [group, option] of CASES) {
    test(`changing ${group} changes the 3D scene and nothing else`, async ({ page }) => {
      await page.goto('/garden-room')
      await waitForScene(page)
      const before = await canvasShot(page)
      await chooseDesktop(page, group, option)
      // Choosing an option must not move the camera — so any pixel change is the object itself.
      await expectRendered(page, { [group]: option })
      const after = await canvasShot(page)
      const diff = await pixelDiff(page, before, after)
      expect(diff, `visible change for ${group}`).toBeGreaterThan(0.004)
      expect(await rendered(page)).toEqual({ ...DEFAULTS, [group]: option })
      await expect(page.getByTestId(`current-${group}`)).not.toHaveText(/^$/)
      await expect(page.locator(`[data-option="${option}"] input`)).toBeChecked()
    })
  }

  test('a sequence of changes accumulates; none resets another', async ({ page }) => {
    await page.goto('/garden-room')
    await waitForScene(page)
    await chooseDesktop(page, 'sofa', 'curve-velvet-midnight')
    await chooseDesktop(page, 'flooring', 'smoked-oak-plank')
    await chooseDesktop(page, 'rug', 'no-rug')
    await chooseDesktop(page, 'wallFinish', 'oak-fluted')
    await chooseDesktop(page, 'coffeeTable', 'lattice-ebonised')
    const expected = { sofa: 'curve-velvet-midnight', flooring: 'smoked-oak-plank', rug: 'no-rug', wallFinish: 'oak-fluted', coffeeTable: 'lattice-ebonised' }
    await expectRendered(page, expected)
    expect(await rendered(page)).toEqual(expected)
  })

  test('camera: orbit, zoom and preset views work and keep the configuration', async ({ page }) => {
    await page.goto('/garden-room')
    await waitForScene(page)
    await chooseDesktop(page, 'sofa', 'arlo-corner-boucle')
    await expectRendered(page, { sofa: 'arlo-corner-boucle' })
    const canvas = page.locator('main canvas')
    const box = (await canvas.boundingBox())!
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    let shot = await canvasShot(page)
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx - 220, cy + 40, { steps: 12 })
    await page.mouse.up()
    let next = await canvasShot(page)
    expect(await pixelDiff(page, shot, next), 'orbit').toBeGreaterThan(0.1)

    shot = next
    await page.mouse.wheel(0, -600)
    next = await canvasShot(page)
    expect(await pixelDiff(page, shot, next), 'zoom').toBeGreaterThan(0.05)

    for (const label of ['Plan', 'Window', 'Overview']) {
      shot = next
      await page.getByRole('button', { name: label }).click()
      await page.waitForTimeout(1200)
      next = await canvasShot(page)
      expect(await pixelDiff(page, shot, next), `${label} view`).toBeGreaterThan(0.05)
      await expect(page.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true')
    }
    expect((await rendered(page)).sofa).toBe('arlo-corner-boucle')
  })

  test('clicking a piece in the room opens its options', async ({ page }) => {
    await page.goto('/garden-room')
    await waitForScene(page)
    await page.getByRole('button', { name: 'Plan' }).click()
    await page.waitForTimeout(1500)
    const box = (await page.locator('main canvas').boundingBox())!
    // Top-down, the coffee table sits just above the centre of the view (toward the back wall).
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42)
    const expanded = page.locator('section[data-group] h3 button[aria-expanded="true"]')
    await expect(expanded).toHaveCount(1)
    const group = await expanded.locator('xpath=ancestor::section').getAttribute('data-group')
    expect(['coffeeTable', 'rug']).toContain(group)
  })
})

test.describe('save, restore and compare', () => {
  test('two saved designs persist, restore exactly, and compare without being modified', async ({ page }) => {
    await page.goto('/garden-room')
    await waitForScene(page)

    await page.getByRole('button', { name: 'Save design' }).click()
    await expect(page.getByText('Saved as “Design A”')).toBeVisible()

    await chooseDesktop(page, 'sofa', 'curve-velvet-taupe')
    await chooseDesktop(page, 'wallFinish', 'sage-limewash')
    await page.getByRole('button', { name: 'Save design' }).click()
    await expect(page.getByText('Saved as “Design B”')).toBeVisible()

    // Saving an identical design is detected, not duplicated
    await page.getByRole('button', { name: 'Save design' }).click()
    await expect(page.getByText('Already saved as “Design B”')).toBeVisible()

    // Persisted across a reload (local storage); the room reopens as it was left (B)
    await page.reload()
    await waitForScene(page)
    expect((await rendered(page)).sofa).toBe('curve-velvet-taupe')
    await page.getByRole('button', { name: /My designs/ }).click()
    const dialog = page.getByRole('dialog', { name: 'My designs' })
    await expect(dialog.locator('li[data-design]')).toHaveCount(2)

    // Restore A
    await dialog.locator('li[data-design="Design A"]').getByRole('button', { name: 'Show in room' }).click()
    await expectRendered(page, DEFAULTS)

    // Compare
    await page.getByRole('button', { name: /My designs/ }).click()
    await dialog.getByRole('button', { name: /Compare/ }).click()
    const panel = page.getByRole('region', { name: /differences/ })
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('heading')).toHaveText('2 differences')
    await expect(panel.locator('tr[data-differs="true"]')).toHaveCount(2)
    await expectRendered(page, DEFAULTS)

    await panel.getByRole('button', { name: /B Design B/ }).click()
    await expectRendered(page, { sofa: 'curve-velvet-taupe', wallFinish: 'sage-limewash' })
    await panel.getByRole('button', { name: /A Design A/ }).click()
    await expectRendered(page, DEFAULTS)

    // Back returns to the pre-compare working design; saved designs untouched
    await panel.getByRole('button', { name: 'Back to my design' }).first().click()
    await expect(page.getByRole('heading', { name: /Garden/ })).toBeVisible()
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fernhall.roomset.v1.saved') ?? '[]'))
    expect(stored.map((d: { name: string; config: { sofa: string } }) => [d.name, d.config.sofa])).toEqual([
      ['Design B', 'curve-velvet-taupe'],
      ['Design A', 'arlo-linen'],
    ])
  })
})

test.describe('sharing', () => {
  test('a share link reproduces the design in a clean browser session', async ({ page, browser }) => {
    await page.goto('/garden-room')
    await waitForScene(page)
    await chooseDesktop(page, 'sofa', 'curve-velvet-midnight')
    await chooseDesktop(page, 'coffeeTable', 'ellipse-travertine')
    await chooseDesktop(page, 'flooring', 'microcement')
    await chooseDesktop(page, 'wallFinish', 'clay-plaster')
    await chooseDesktop(page, 'rug', 'rust-wool')
    const expected = await rendered(page)

    await page.getByRole('button', { name: 'Share link' }).click()
    const url = await page.getByLabel('Shareable link').inputValue()
    expect(url).toContain('sofa=curve-velvet-midnight')

    // New context = no cookies, no localStorage, nothing shared with the first session
    const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const other = await fresh.newPage()
    await other.goto(url)
    await waitForScene(other)
    expect(await rendered(other)).toEqual(expected)
    await expect(other.getByText('Opened a shared design')).toBeVisible()
    // The clean session has none of the first session's saved data
    expect(await other.evaluate(() => localStorage.getItem('fernhall.roomset.v1.saved'))).toBeNull()
    await fresh.close()
  })

  test('partially invalid links keep valid choices and explain the rest', async ({ page }) => {
    await page.goto('/garden-room?v=1&room=garden-room&sofa=arlo-corner-boucle&table=does-not-exist&floor=limestone&wall=ink-blue')
    await waitForScene(page)
    await expect(page.getByText('Part of this link wasn’t recognised')).toBeVisible()
    await expect(page.getByText(/Coffee table, Rug/)).toBeVisible()
    expect(await rendered(page)).toEqual({ ...DEFAULTS, sofa: 'arlo-corner-boucle', flooring: 'limestone', wallFinish: 'ink-blue' })
    // The link is consumed: the address bar is cleaned so a reload doesn't re-apply or re-announce it
    expect(new URL(page.url()).search).toBe('')
  })

  test('garbage and hostile links fail gracefully to the default design', async ({ page }) => {
    const problems = watchProblems(page)
    await page.goto('/garden-room?room=kitchen&sofa=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E&table=__proto__')
    await waitForScene(page)
    await expect(page.getByText('This link couldn’t be opened')).toBeVisible()
    expect(await rendered(page)).toEqual(DEFAULTS)
    expect(await page.locator('img[src="x"]').count()).toBe(0)
    expect(problems).toEqual([])
  })
})

test.describe('design brief', () => {
  test('validates input, then stores and confirms the brief locally', async ({ page }) => {
    await page.goto('/garden-room')
    await waitForScene(page)
    await chooseDesktop(page, 'rug', 'charcoal-herringbone')
    await page.getByRole('button', { name: 'Send brief' }).click()
    const dialog = page.getByRole('dialog', { name: 'Send your brief' })
    await expect(dialog.getByText('Charcoal herringbone')).toBeVisible()

    await dialog.getByRole('button', { name: 'Submit brief' }).click()
    await expect(dialog.getByText('Please enter your name.')).toBeVisible()
    await expect(dialog.getByText(/need an email address/)).toBeVisible()
    await expect(dialog.getByLabel('Your name')).toBeFocused()

    await dialog.getByLabel('Your name').fill('Ada Lovelace')
    await dialog.getByRole('textbox', { name: 'Email' }).fill('ada@example')
    await dialog.getByText('phone', { exact: true }).click()
    await dialog.getByRole('button', { name: 'Submit brief' }).click()
    await expect(dialog.getByText(/doesn’t look like a valid email/)).toBeVisible()
    await expect(dialog.getByText(/Add a phone number/)).toBeVisible()

    await dialog.getByRole('textbox', { name: 'Email' }).fill('ada@example.com')
    await dialog.getByRole('textbox', { name: /^Phone/ }).fill('+44 20 7946 0000')
    await dialog.getByLabel('Notes for your designer').fill('Could we see the rug <b>larger</b>?\nThanks!')
    await dialog.getByRole('button', { name: 'Submit brief' }).click()

    const confirm = page.getByTestId('brief-confirmation')
    await expect(confirm).toBeVisible()
    await expect(confirm.getByText(/nothing has been sent/)).toBeVisible()
    await expect(confirm.getByText('ada@example.com')).toBeVisible()
    await expect(confirm.getByText('Charcoal herringbone')).toBeVisible()
    // Notes are rendered as text, never as HTML
    await expect(confirm.getByText('Could we see the rug <b>larger</b>?', { exact: false })).toBeVisible()
    await expect(confirm.locator('b')).toHaveCount(0)

    const briefs = await page.evaluate(() => JSON.parse(localStorage.getItem('fernhall.roomset.v1.briefs') ?? '[]'))
    expect(briefs).toHaveLength(1)
    expect(briefs[0].client).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', preferredContact: 'phone' })
    expect(briefs[0].config.rug).toBe('charcoal-herringbone')
    expect(briefs[0].reference).toMatch(/^FH-\d{4}-[0-9A-F]{6}$/)
  })
})

test.describe('responsive @responsive', () => {
  test('mobile/tablet: tabs, option strip and actions work', async ({ page, isMobile }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'covered by desktop tests')
    await page.goto('/garden-room')
    await waitForScene(page)
    await expect(page.locator('main canvas')).toBeVisible()
    await page.getByRole('tab', { name: /Flooring/ }).click()
    await expect(page.getByRole('tab', { name: /Flooring/ })).toHaveAttribute('aria-selected', 'true')
    await page.locator('#mobile-options [data-option="microcement"]').click()
    await expectRendered(page, { flooring: 'microcement' })
    await page.getByRole('tab', { name: /Sofa/ }).click()
    await page.locator('#mobile-options [data-option="arlo-corner-boucle"]').scrollIntoViewIfNeeded()
    await page.locator('#mobile-options [data-option="arlo-corner-boucle"]').click()
    await expectRendered(page, { flooring: 'microcement', sofa: 'arlo-corner-boucle' })
    for (const name of ['Save', /Designs/, 'Share', 'Brief']) await expect(page.getByRole('button', { name }).last()).toBeVisible()
    // No horizontal page overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    if (isMobile) {
      await page.getByRole('button', { name: 'Brief' }).click()
      await expect(page.getByRole('dialog', { name: 'Send your brief' })).toBeVisible()
    }
  })
})

test('every request stays on our own origin (no CDNs, trackers or third-party fonts)', async ({ page, baseURL }) => {
  const external: string[] = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== new URL(baseURL!).origin) external.push(r.url())
  })
  await page.goto('/garden-room')
  await waitForScene(page)
  await chooseDesktop(page, 'sofa', 'curve-velvet-taupe')
  await expectRendered(page, { sofa: 'curve-velvet-taupe' })
  expect(external).toEqual([])
})

test('security headers are served', async ({ request }) => {
  const res = await request.get('/')
  const h = res.headers()
  expect(h['content-security-policy']).toContain("default-src 'self'")
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(h['x-content-type-options']).toBe('nosniff')
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
})

test('group headers are keyboard operable', async ({ page }) => {
  await page.goto('/garden-room')
  await waitForScene(page)
  await groupHeader(page, 'flooring').focus()
  await page.keyboard.press('Enter')
  await expect(groupHeader(page, 'flooring')).toHaveAttribute('aria-expanded', 'true')
  await page.locator('[data-option="oak-herringbone"] input').focus()
  await page.keyboard.press('ArrowRight')
  await expectRendered(page, { flooring: 'smoked-oak-plank' })
})
