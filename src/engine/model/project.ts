import { z } from 'zod'
import { newId } from '../commands/draft'
import { ROOM_TYPES, type Project } from './types'
import { validateProject } from './validate'

export function emptyProject(name = 'Untitled project'): Project {
  const now = new Date().toISOString()
  const level = newId('l')
  return {
    schema: 'roomset.project',
    version: 1,
    id: newId('p'),
    name,
    levels: { [level]: { id: level, name: 'Ground floor', elevation: 0, height: 2.7 } },
    nodes: {},
    walls: {},
    rooms: {},
    openings: {},
    items: {},
    meta: { createdAt: now, updatedAt: now },
  }
}

/* ---------- Serialisation: versioned schema, strict parsing of untrusted JSON ---------- */

const id = z.string().regex(/^[a-z]{1,3}_[a-z0-9]{1,24}$/)
const num = z.number().finite().gte(-1e4).lte(1e4)
const text = (max: number) => z.string().max(max)
const rec = <T extends z.ZodTypeAny>(item: T) => z.record(id, item).refine((r) => Object.keys(r).length <= 5000, 'too many entities')

const ProjectV1 = z
  .object({
    schema: z.literal('roomset.project'),
    version: z.literal(1),
    id,
    name: text(80),
    levels: rec(z.object({ id, name: text(40), elevation: num, height: num }).strict()),
    nodes: rec(z.object({ id, level: id, x: num, y: num }).strict()),
    walls: rec(z.object({ id, level: id, a: id, b: id, thickness: num, height: num }).strict()),
    rooms: rec(
      z
        .object({
          id,
          level: id,
          name: text(40),
          type: z.enum(ROOM_TYPES),
          boundary: z.array(id).min(3).max(200),
          floorFinish: text(40),
          wallFinish: text(40),
        })
        .strict(),
    ),
    openings: rec(
      z
        .object({
          id,
          wall: id,
          kind: z.enum(['door', 'window', 'passage']),
          offset: num,
          width: num,
          height: num,
          sill: num,
          hinge: z.enum(['a', 'b']),
          swing: z.enum(['left', 'right']),
        })
        .strict(),
    ),
    items: rec(z.object({ id, level: id, asset: text(60), x: num, y: num, rotation: num, variant: text(40).optional(), z: z.number().finite().gte(0).lte(4).optional() }).strict()),
    stairs: rec(z.object({ id, level: id, x: num, y: num, rotation: num, width: num, length: num }).strict()).optional(),
    facade: text(40).optional(),
    meta: z.object({ createdAt: text(40), updatedAt: text(40), template: text(40).optional() }).strict(),
  })
  .strict()
  .superRefine((p, ctx) => {
    // Record keys must match the ids inside them (no aliasing tricks).
    for (const key of ['levels', 'nodes', 'walls', 'rooms', 'openings', 'items', 'stairs'] as const) {
      for (const [k, v] of Object.entries(p[key] ?? {})) if (k !== (v as { id: string }).id) ctx.addIssue({ code: 'custom', message: `${key}.${k} id mismatch` })
    }
  })

export const CURRENT_VERSION = 1

/** Migrations from older versions, keyed by the version they upgrade from. */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
/** Reject (rather than silently strip) prototype-pollution keys and absurd nesting anywhere in the document. */
function hasForbiddenKeys(v: unknown, depth = 0): boolean {
  if (depth > 8) return true
  if (typeof v !== 'object' || v === null) return false
  for (const k of Object.keys(v)) {
    if (FORBIDDEN_KEYS.has(k)) return true
    if (hasForbiddenKeys((v as Record<string, unknown>)[k], depth + 1)) return true
  }
  return false
}

export type ParseResult = { ok: true; project: Project } | { ok: false; error: string }

/**
 * Parse an untrusted project document (file import, storage): schema check, migrate, then the same
 * structural validation every edit goes through. Never returns a partially valid project.
 */
export function parseProject(input: unknown): ParseResult {
  let raw = input
  if (typeof raw === 'string') {
    if (raw.length > 5_000_000) return { ok: false, error: 'The file is too large to be a project.' }
    try {
      raw = JSON.parse(raw)
    } catch {
      return { ok: false, error: 'The file isn’t valid JSON.' }
    }
  }
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Not a project file.' }
  if (hasForbiddenKeys(raw)) return { ok: false, error: 'The project file contains disallowed fields.' }
  let doc = raw as Record<string, unknown>
  if (doc.schema !== 'roomset.project') return { ok: false, error: 'Not a project file.' }
  let v = typeof doc.version === 'number' ? doc.version : 0
  if (v > CURRENT_VERSION) return { ok: false, error: 'This project was saved by a newer version of the app.' }
  while (v < CURRENT_VERSION) {
    const m = MIGRATIONS[v]
    if (!m) return { ok: false, error: `Can’t upgrade project version ${v}.` }
    doc = m(doc)
    v++
  }
  const parsed = ProjectV1.safeParse(doc)
  if (!parsed.success) return { ok: false, error: `The project file is damaged (${parsed.error.issues[0]?.path.join('.') || 'format'}).` }
  const project = parsed.data as Project
  const issues = validateProject(project)
  if (issues.length) return { ok: false, error: `The project contains invalid geometry: ${issues[0].message}.` }
  return { ok: true, project }
}

export const serializeProject = (p: Project) => JSON.stringify(p)
