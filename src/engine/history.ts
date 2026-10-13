import type { Project } from './model/types'

/**
 * Snapshot undo/redo. Projects are immutable and commands are copy-on-write, so a snapshot only
 * costs the changed entities plus the record maps — cheaper and far less error-prone than
 * hand-written inverse operations for every command.
 */
export interface History {
  past: { project: Project; label: string }[]
  present: Project
  future: { project: Project; label: string }[]
  /** Label of the edit that produced `present`. */
  label: string
}

export const LIMIT = 200

export const initHistory = (project: Project): History => ({ past: [], present: project, future: [], label: 'Open' })

export function commit(h: History, project: Project, label: string): History {
  if (project === h.present) return h
  const past = [...h.past, { project: h.present, label: h.label }].slice(-LIMIT)
  return { past, present: project, future: [], label }
}

export function undo(h: History): History {
  const prev = h.past[h.past.length - 1]
  if (!prev) return h
  return { past: h.past.slice(0, -1), present: prev.project, future: [{ project: h.present, label: h.label }, ...h.future], label: prev.label }
}

export function redo(h: History): History {
  const next = h.future[0]
  if (!next) return h
  return { past: [...h.past, { project: h.present, label: h.label }], present: next.project, future: h.future.slice(1), label: next.label }
}

export const canUndo = (h: History) => h.past.length > 0
export const canRedo = (h: History) => h.future.length > 0
