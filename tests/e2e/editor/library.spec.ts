import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { clickPlan, openFresh, saved, watchProblems } from './helpers'

/* House templates and the furniture library, exercised through the real UI in the production build. */

test.describe('house templates and furniture library', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'editing workflows are desktop')
    await openFresh(page)
  })

  test('designs: browse, filter, preview the real plan, create an editable copy; the template never changes', async ({ page }) => {
    const problems = watchProblems(page)
    await page.getByRole('button', { name: 'Designs' }).click()
    const gallery = page.getByTestId('template-gallery')
    await expect(gallery).toBeVisible()
    const card = gallery.locator('[data-template="compact-home"]')
    await expect(card).toContainText('1 bed · 1 bath · 1 floor')
    // the card image is the captured 3D view of this house
    await expect.poll(() => card.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(400)
    // search narrows the list; nonsense finds nothing
    await gallery.getByRole('textbox', { name: 'Search designs' }).fill('zzzz')
    await expect(gallery.getByText('No design matches')).toBeVisible()
    await gallery.getByRole('textbox', { name: 'Search designs' }).fill('')
    await card.click()
    const preview = page.getByTestId('template-preview')
    await expect(preview.getByRole('img', { name: /Plan: Living & dining/ })).toBeVisible()
    await expect(preview.getByRole('list', { name: 'Rooms' }).locator('li')).toHaveCount(6)
    await preview.getByRole('button', { name: 'Create a project from this design' }).click()
    await expect(gallery).toHaveCount(0)
    const first = await saved(page)
    expect(Object.keys(first.rooms)).toHaveLength(6)

    // edit the copy: delete a room
    await clickPlan(page, 8.8, 6.0) // study
    await page.keyboard.press('Delete')
    await expect.poll(async () => Object.keys((await saved(page)).rooms).length).toBe(5)
    // a new project from the same design is complete again, with a new identity
    await page.getByRole('button', { name: 'Designs' }).click()
    await gallery.locator('[data-template="compact-home"]').click()
    await page.getByRole('button', { name: 'Create a project from this design' }).click()
    await expect.poll(async () => Object.keys((await saved(page)).rooms).length).toBe(6)
    expect((await saved(page)).id).not.toBe(first.id)
    expect(problems).toEqual([])
  })

  test('library: search, place, duplicate, change finish, undo, and it all survives a reload', async ({ page }) => {
    const before = await saved(page)
    const count = Object.keys(before.items).length
    await page.getByRole('button', { name: /Furnish/ }).click()
    const lib = page.getByRole('complementary', { name: 'Furniture library' })
    await lib.getByRole('textbox', { name: 'Search furniture' }).fill('arlo')
    const sofa = lib.locator('[data-asset="sofa-arlo"]')
    await expect(sofa).toHaveCount(1)
    await expect.poll(() => sofa.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(100)
    await sofa.click()
    await page.getByRole('button', { name: 'Close library' }).click()
    // place it in the kitchen (clear floor south of the island), 2D plan
    await clickPlan(page, 8.1, 3.85)
    await expect.poll(async () => Object.keys((await saved(page)).items).length).toBe(count + 1)
    const p1 = await saved(page)
    const placed = Object.values(p1.items).find((i) => !before.items[i.id])!
    expect(placed.asset).toBe('sofa-arlo')

    // it's selected after placing: duplicate (button), then the copy gets a finish
    await page.getByRole('button', { name: 'Duplicate' }).click()
    await expect.poll(async () => Object.keys((await saved(page)).items).length).toBe(count + 2)
    await page.getByRole('radio', { name: 'Sage linen' }).click()
    await expect.poll(async () => Object.values((await saved(page)).items).filter((i) => i.variant === 'sage').length).toBe(1)
    // Ctrl+D duplicates the selected copy, finish included
    await page.locator('body').press('Control+d')
    await expect.poll(async () => Object.values((await saved(page)).items).filter((i) => i.variant === 'sage').length).toBe(2)
    // undo the last duplicate, then reload: two placed sofas, one in sage
    await page.locator('body').press('Control+z')
    await expect.poll(async () => Object.keys((await saved(page)).items).length).toBe(count + 2)
    await page.reload()
    await expect(page.locator('[data-room-label]')).toHaveCount(6)
    const after = await saved(page)
    expect(Object.values(after.items).filter((i) => i.asset === 'sofa-arlo')).toHaveLength(3) // template sofa + 2
    expect(Object.values(after.items).filter((i) => i.variant === 'sage')).toHaveLength(1)

    // recently used appears in the library
    await page.getByRole('button', { name: /Furnish/ }).click()
    await expect(page.getByRole('button', { name: 'Arlo three-seater sofa (recent)' })).toBeVisible()
  })

  test('selecting a room offers furniture suggested for it', async ({ page }) => {
    await clickPlan(page, 1.0, 6.2) // bedroom
    await page.getByRole('button', { name: /Furnish/ }).click()
    const lib = page.getByRole('complementary', { name: 'Furniture library' })
    await lib.getByRole('button', { name: 'For Bedroom' }).click()
    await expect(lib.locator('[data-asset="bed-double"]')).toBeVisible()
    await expect(lib.locator('[data-asset="kitchen-run"]')).toHaveCount(0)
  })

  test('wall art hangs on the wall, a vase stands on the coffee table, and each item shows its credits', async ({ page }) => {
    await page.getByRole('button', { name: /Furnish/ }).click()
    const lib = page.getByRole('complementary', { name: 'Furniture library' })
    await lib.getByRole('textbox', { name: 'Search furniture' }).fill('photograph')
    await lib.locator('[data-asset="art-photo-landscape"]').click()
    await clickPlan(page, 3.0, 0.5) // near the living room's north wall
    await expect.poll(async () => Object.values((await saved(page)).items).find((i) => i.asset === 'art-photo-landscape')?.z).toBe(1.25)
    const art = Object.values((await saved(page)).items).find((i) => i.asset === 'art-photo-landscape')!
    expect(art.y).toBeLessThan(0.2) // against the wall's inner face (y = 0.125)
    await expect(page.getByTestId('item-credit')).toContainText('Poly Haven')

    await lib.getByRole('textbox', { name: 'Search furniture' }).fill('white ceramic')
    await lib.locator('[data-asset="vase-white"]').click()
    await clickPlan(page, 1.95, 2.75) // on the slab coffee table (0.39 m top)
    await expect.poll(async () => Object.values((await saved(page)).items).find((i) => i.asset === 'vase-white')?.z).toBeCloseTo(0.39, 2)
    await expect(page.getByTestId('item-credit')).toContainText('CC0')
  })
})

test('every library model is served by the production build as a binary glTF', async ({ request }, info) => {
  test.skip(info.project.name !== 'desktop', 'once is enough')
  const manifest = JSON.parse(readFileSync('docs/asset-manifest.json', 'utf-8')) as { assets: { id: string; file: string | null }[] }
  const files = manifest.assets.map((a) => a.file).filter((f): f is string => !!f)
  expect(files.length).toBeGreaterThanOrEqual(60)
  for (const f of files) {
    const r = await request.get(f)
    expect(r.status(), f).toBe(200)
    expect((await r.body()).subarray(0, 4).toString('latin1'), f).toBe('glTF')
  }
})
