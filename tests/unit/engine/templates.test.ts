import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getAsset } from '../../../src/engine/assets/catalog'
import { FLOOR_FINISHES, WALL_FINISHES } from '../../../src/engine/assets/finishes'
import { itemCorners, roomInnerPolygon } from '../../../src/engine/commands/structure'
import { pointInPolygon } from '../../../src/engine/geometry/polygon'
import { entrances } from '../../../src/engine/geometry/site'
import { parseProject, serializeProject } from '../../../src/engine/model/project'
import { openingsOnWall, roomWalls } from '../../../src/engine/model/query'
import { isOutdoor } from '../../../src/engine/model/types'
import { validateProject } from '../../../src/engine/model/validate'
import { buildTemplate, projectStats, TEMPLATES } from '../../../src/engine/templates'
import { buildColliders, currentRoom, moveWithCollisions, roomEntries, spawnPoint } from '../../../src/engine/walk'

/* Invariants every house template must satisfy. A new template is only "in the library" when it passes
 * all of these: valid model, reachable rooms, real assets, furniture inside rooms, daylight, save/load. */

const houses = TEMPLATES.filter((t) => t.spec)

describe('template library', () => {
  it('has unique ids and names', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
    expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length)
  })

  it('every house has a real thumbnail captured from the house', () => {
    for (const t of houses) expect(existsSync(`public/assets/templates/${t.id}.webp`), t.id).toBe(true)
  })
})

describe.each(houses.map((t) => [t.id, t] as const))('template %s', (_id, t) => {
  const p = buildTemplate(t)
  const level = Object.keys(p.levels)[0]

  it('builds a valid project that saves and restores exactly', () => {
    expect(validateProject(p)).toEqual([])
    const back = parseProject(serializeProject(p))
    expect(back.ok).toBe(true)
    if (back.ok) expect(back.project).toEqual(p)
  })

  it('every finish and asset it uses exists in the catalogue', () => {
    const floors = new Set(FLOOR_FINISHES.map((f) => f.id))
    const walls = new Set(WALL_FINISHES.map((f) => f.id))
    for (const r of Object.values(p.rooms)) {
      expect(floors.has(r.floorFinish), `${r.name} floor ${r.floorFinish}`).toBe(true)
      expect(walls.has(r.wallFinish), `${r.name} walls ${r.wallFinish}`).toBe(true)
    }
    for (const it of Object.values(p.items)) {
      const a = getAsset(it.asset)
      expect(a, it.asset).toBeTruthy()
      if (it.variant) expect(a!.variants?.some((v) => v.id === it.variant), `${it.asset} variant ${it.variant}`).toBe(true)
    }
  })

  it('furniture stands inside a room, clear of the walls', () => {
    for (const it of Object.values(p.items)) {
      const room = currentRoom(p, level, it)
      expect(room, `${it.asset} at ${it.x},${it.y} is in a room`).toBeTruthy()
      const inner = roomInnerPolygon(p, room!.id)
      for (const c of itemCorners(it, -0.01)) expect(pointInPolygon(c, inner), `${it.asset} at ${it.x},${it.y} inside ${room!.name}`).toBe(true)
    }
  })

  it('has a front door, and every room can be walked to from it', () => {
    expect(entrances(p, level).length).toBeGreaterThan(0)
    const c = buildColliders(p, level)
    const start = spawnPoint(p, level)!
    const key = (q: { x: number; y: number }) => `${Math.round(q.x * 10)},${Math.round(q.y * 10)}`
    const seen = new Set([key(start)])
    const queue = [start]
    while (queue.length) {
      const q = queue.pop()!
      for (const d of [{ x: 0.1, y: 0 }, { x: -0.1, y: 0 }, { x: 0, y: 0.1 }, { x: 0, y: -0.1 }]) {
        const n = moveWithCollisions(q, d, 0.25, c)
        if (Math.hypot(n.x - q.x - d.x, n.y - q.y - d.y) > 0.02) continue
        // stay on the plot: indoors or within 2 m of the house
        if (!currentRoom(p, level, n) && !Object.values(p.nodes).some((k) => Math.hypot(k.x - n.x, k.y - n.y) < 3)) continue
        const k = key(n)
        if (seen.has(k)) continue
        seen.add(k)
        queue.push({ x: Math.round(n.x * 10) / 10, y: Math.round(n.y * 10) / 10 })
      }
    }
    for (const e of roomEntries(p, level)) {
      const near = [...seen].some((k) => {
        const [x, y] = k.split(',').map((v) => Number(v) / 10)
        return Math.hypot(x - e.at.x, y - e.at.y) < 0.6
      })
      expect(near, `${e.name} reachable from the front door`).toBe(true)
    }
  }, 60_000)

  it('habitable rooms have daylight (a window or glazed door on their walls)', () => {
    for (const r of Object.values(p.rooms)) {
      if (!['living', 'bedroom', 'kitchen', 'study'].includes(r.type)) continue
      const glazed = roomWalls(p, r).some((w) => w && openingsOnWall(p, w.id).some((o) => o.kind === 'window' || (o.kind === 'door' && o.width >= 1.4)))
      expect(glazed, `${r.name} has a window`).toBe(true)
    }
  })

  it('its card numbers come from the model', () => {
    const s = projectStats(p)
    expect(s.area).toBeGreaterThan(20)
    expect(s.rooms).toBe(Object.values(p.rooms).filter((r) => !isOutdoor(r)).length)
    expect(s.bedrooms).toBe(Object.values(p.rooms).filter((r) => r.type === 'bedroom').length)
  })

  it('builds a fresh project each time (new id, same content)', () => {
    const q = buildTemplate(t)
    expect(q.id).not.toBe(p.id)
    expect(Object.keys(q.rooms).length).toBe(Object.keys(p.rooms).length)
  })
})
