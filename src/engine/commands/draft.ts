import type { Id, Item, Level, Node, Opening, Project, Room, Wall } from '../model/types'
import { validateProject, type ValidationIssue } from '../model/validate'

/**
 * Copy-on-write working copy of a project. Commands mutate a Draft; untouched entities keep their
 * object identity (cheap undo snapshots, and renderers can memoise per entity).
 */
export class Draft {
  p: Project
  warnings: string[] = []
  created: Id[] = []

  constructor(base: Project) {
    this.p = {
      ...base,
      levels: { ...base.levels },
      nodes: { ...base.nodes },
      walls: { ...base.walls },
      rooms: { ...base.rooms },
      openings: { ...base.openings },
      items: { ...base.items },
    }
  }

  setNode(n: Node) {
    this.p.nodes[n.id] = n
  }
  setWall(w: Wall) {
    this.p.walls[w.id] = w
  }
  setRoom(r: Room) {
    this.p.rooms[r.id] = r
  }
  setOpening(o: Opening) {
    this.p.openings[o.id] = o
  }
  setItem(i: Item) {
    this.p.items[i.id] = i
  }
  setLevel(l: Level) {
    this.p.levels[l.id] = l
  }
}

export type CommandError = { code: string; message: string; entities: Id[]; issues?: ValidationIssue[] }

export type CommandResult =
  | { ok: true; project: Project; label: string; warnings: string[]; created: Id[] }
  | { ok: false; error: CommandError }

export const fail = (code: string, message: string, ...entities: Id[]): CommandResult => ({ ok: false, error: { code, message, entities } })

/** Validate the draft; the edit only succeeds if the whole building is still valid. */
export function finish(d: Draft, label: string): CommandResult {
  const issues = validateProject(d.p)
  if (issues.length) return { ok: false, error: { ...issues[0], issues } }
  return { ok: true, project: d.p, label, warnings: d.warnings, created: d.created }
}

let seq = 0
/** Short, unique, URL-safe ids. Random part avoids collisions between sessions/projects. */
export function newId(prefix: string): Id {
  seq = (seq + 1) % 1_000_000
  const rand = Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, '0')
  return `${prefix}_${rand}${seq.toString(36)}`
}
