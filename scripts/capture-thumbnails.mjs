// Capture real thumbnails from the running dev server (npm run dev):
//   node scripts/capture-thumbnails.mjs [assets|templates|all] [baseUrl] [only-id]
// - assets: each catalogue item rendered alone by the dev-only studio page (/__studio?asset=id)
//   → public/assets/catalog/<id>.webp
// - templates: each house opened through the real UI (Designs → card → create → 3D overview)
//   → public/assets/templates/<id>.webp
// Thumbnails are pictures of the actual assets and houses as the editor renders them.
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const what = process.argv[2] ?? 'all'
const base = process.argv[3] ?? 'http://localhost:5173'
const only = process.argv[4]
const args = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']

const save = (path, dataUrl) => writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'))

async function assets(browser) {
  mkdirSync('public/assets/catalog', { recursive: true })
  // the asset ids come from the app itself (library buttons carry data-asset)
  const list = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await list.goto(base + '/')
  await list.getByRole('button', { name: /Furnish/ }).click()
  const ids = only ? [only] : await list.locator('[data-asset]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('data-asset')))])
  await list.close()
  const page = await browser.newPage({ viewport: { width: 384, height: 384 } })
  // every capture is also a load test: a model that fails to load is reported and fails the run
  let errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  const failed = []
  for (const id of ids) {
    errors = []
    await page.goto(`${base}/__studio?asset=${encodeURIComponent(id)}`)
    await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 60000 })
    await page.waitForTimeout(400)
    const url = await page.evaluate(() => {
      const src = document.querySelector('canvas')
      const c = document.createElement('canvas')
      c.width = c.height = 256
      c.getContext('2d').drawImage(src, 0, 0, 256, 256)
      return c.toDataURL('image/webp', 0.86)
    })
    save(`public/assets/catalog/${id}.webp`, url)
    if (errors.length) failed.push(`${id}: ${errors.join(' | ')}`)
    console.log('asset', id, errors.length ? 'ERRORS' : '')
  }
  await page.close()
  console.log(`${ids.length} assets rendered, ${failed.length} with load errors`)
  if (failed.length) {
    console.error(failed.join(String.fromCharCode(10)))
    process.exitCode = 1
  }
}

async function templates(browser) {
  mkdirSync('public/assets/templates', { recursive: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  await page.goto(base + '/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: /Designs/ }).click()
  const ids = only ? [only] : await page.locator('[data-template]').evaluateAll((els) => els.map((e) => e.getAttribute('data-template')).filter((id) => id !== 'blank'))
  await page.keyboard.press('Escape')
  for (const id of ids) {
    await page.getByRole('button', { name: /Designs/ }).click()
    await page.locator(`[data-template="${id}"]`).click()
    await page.getByRole('button', { name: 'Create a project from this design' }).click()
    await page.locator('[aria-label=View] button').nth(2).click() // 3D only
    // multi-storey houses: show the top floor cut away, standing on the floors below
    const floors = page.getByRole('radiogroup', { name: 'Floor' }).getByRole('radio')
    if ((await floors.count()) > 1) await floors.first().click()
    await page.waitForTimeout(4500) // models, textures, camera glide
    const png = await page.getByTestId('scene-view').locator('canvas').screenshot()
    const url = await page.evaluate(async (b64) => {
      const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
      const W = 960
      const H = 600
      const c = new OffscreenCanvas(W, H)
      const s = Math.max(W / img.width, H / img.height)
      c.getContext('2d').drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s)
      const blob = await c.convertToBlob({ type: 'image/webp', quality: 0.82 })
      return await new Promise((res) => {
        const r = new FileReader()
        r.onload = () => res(r.result)
        r.readAsDataURL(blob)
      })
    }, png.toString('base64'))
    save(`public/assets/templates/${id}.webp`, url)
    console.log('template', id)
  }
  await page.close()
}

const browser = await chromium.launch({ args })
if (what === 'assets' || what === 'all') await assets(browser)
if (what === 'templates' || what === 'all') await templates(browser)
await browser.close()
