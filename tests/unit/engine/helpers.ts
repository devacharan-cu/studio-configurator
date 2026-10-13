import { expect } from 'vitest'
import type { CommandResult } from '../../../src/engine/commands/draft'
import { createRoom } from '../../../src/engine/commands/structure'
import { emptyProject } from '../../../src/engine/model/project'
import type { Project } from '../../../src/engine/model/types'
import { validateProject } from '../../../src/engine/model/validate'

export const rect = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]

export function ok(r: CommandResult): Project {
  if (!r.ok) throw new Error(`expected ok, got: ${r.error.message}`)
  expect(validateProject(r.project)).toEqual([])
  return r.project
}

export function err(r: CommandResult): string {
  if (r.ok) throw new Error('expected the command to be rejected')
  return r.error.code
}

export function blankWithRooms(...rects: number[][]): Project {
  let p = emptyProject()
  const level = Object.keys(p.levels)[0]
  rects.forEach((r, i) => {
    p = ok(createRoom(p, { level, points: rect(r[0], r[1], r[2], r[3]), name: `R${i + 1}` }))
  })
  return p
}

export const levelOf = (p: Project) => Object.keys(p.levels)[0]
export const roomByName = (p: Project, name: string) => Object.values(p.rooms).find((r) => r.name === name)!
