import { describe, expect, it } from 'vitest'
import { moveWall } from '../../../src/engine/commands/structure'
import { wallSolid } from '../../../src/engine/geometry/walls'
import { validateProject } from '../../../src/engine/model/validate'
import { compactHome } from '../../../src/engine/templates'
import { buildColliders, moveWithCollisions } from '../../../src/engine/walk'

/**
 * Edit-latency budget on the representative 6-room home. A drag issues one moveWall per pointer
 * move, so a command (copy-on-write + coherence passes + full validation) must stay well inside a frame.
 * Thresholds are generous to stay stable on slow CI; measured values are printed for the record.
 */
const time = (n: number, fn: (i: number) => void) => {
  const t0 = performance.now()
  for (let i = 0; i < n; i++) fn(i)
  return (performance.now() - t0) / n
}

describe('engine performance (compact home)', () => {
  const home = compactHome()
  const wall = Object.values(home.walls).find((w) => home.nodes[w.a].x === 6.2 && home.nodes[w.b].x === 6.2)!

  it('a wall-move command including validation runs well within one frame', () => {
    time(20, (i) => moveWall(home, { wall: wall.id, distance: (i % 10) * 0.05 })) // warm-up
    const ms = time(200, (i) => moveWall(home, { wall: wall.id, distance: ((i % 10) - 5) * 0.05 }))
    console.log(`moveWall + validate: ${ms.toFixed(3)} ms`)
    expect(ms).toBeLessThan(8)
  })

  it('full validation and full wall-solid regeneration are cheap', () => {
    const v = time(200, () => validateProject(home))
    const g = time(50, () => Object.values(home.walls).forEach((w) => wallSolid(home, w, 0)))
    console.log(`validateProject: ${v.toFixed(3)} ms · all ${Object.keys(home.walls).length} wall solids: ${g.toFixed(3)} ms`)
    expect(v).toBeLessThan(5)
    expect(g).toBeLessThan(10)
  })

  it('walkthrough collision per frame is negligible', () => {
    const col = buildColliders(home, Object.keys(home.levels)[0])
    const ms = time(2000, (i) => moveWithCollisions({ x: 4.5, y: 6.4 }, { x: Math.sin(i) * 0.05, y: Math.cos(i) * 0.05 }, 0.25, col))
    console.log(`moveWithCollisions: ${(ms * 1000).toFixed(1)} µs (${col.capsules.length} capsules, ${col.boxes.length} boxes)`)
    expect(ms).toBeLessThan(1)
  })
})
