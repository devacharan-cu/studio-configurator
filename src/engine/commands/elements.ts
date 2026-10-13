import { getAsset } from '../assets/catalog'
import { usableRange } from '../geometry/walls'
import type { Id, Opening, OpeningKind, Project } from '../model/types'
import { LIMITS } from '../model/types'
import { Draft, fail, finish, newId, type CommandResult } from './draft'

export const OPENING_DEFAULTS: Record<OpeningKind, Pick<Opening, 'width' | 'height' | 'sill'>> = {
  door: { width: 0.9, height: 2.1, sill: 0 },
  window: { width: 1.2, height: 1.3, sill: 0.9 },
  passage: { width: 1.6, height: 2.3, sill: 0 },
}

const clampNum = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function addOpening(
  p: Project,
  args: { wall: Id; kind: OpeningKind; offset: number; width?: number; height?: number; sill?: number },
): CommandResult {
  const w = p.walls[args.wall]
  if (!w) return fail('ref', 'Pick a wall to place this on', args.wall)
  const def = OPENING_DEFAULTS[args.kind]
  if (!def) return fail('opening-kind', 'Unknown opening type')
  const width = args.width ?? def.width
  const height = Math.min(args.height ?? def.height, w.height - 0.1 - (args.sill ?? def.sill))
  const [u0, u1] = usableRange(p, w)
  // Snap the requested centre into the wall if it's close to an end.
  const lo = u0 + LIMITS.openingClearance + width / 2
  const hi = u1 - LIMITS.openingClearance - width / 2
  if (lo > hi) return fail('opening-fit', `This wall is too short for a ${width.toFixed(2)} m ${args.kind}`, w.id)
  const d = new Draft(p)
  const id = newId('o')
  d.setOpening({
    id,
    wall: w.id,
    kind: args.kind,
    offset: clampNum(args.offset, lo, hi),
    width,
    height,
    sill: args.sill ?? def.sill,
    hinge: 'a',
    swing: 'left',
  })
  d.created.push(id)
  return finish(d, `Add ${args.kind}`)
}

export function moveOpening(p: Project, args: { opening: Id; offset: number; wall?: Id }): CommandResult {
  const o = p.openings[args.opening]
  if (!o) return fail('ref', 'That opening no longer exists', args.opening)
  if (!Number.isFinite(args.offset)) return fail('coord', 'Invalid position')
  const d = new Draft(p)
  d.setOpening({ ...o, offset: args.offset, wall: args.wall ?? o.wall })
  return finish(d, `Move ${o.kind}`)
}

export function updateOpening(
  p: Project,
  args: { opening: Id } & Partial<Pick<Opening, 'width' | 'height' | 'sill' | 'kind' | 'hinge' | 'swing'>>,
): CommandResult {
  const o = p.openings[args.opening]
  if (!o) return fail('ref', 'That opening no longer exists', args.opening)
  const next: Opening = { ...o }
  for (const k of ['width', 'height', 'sill'] as const) {
    const v = args[k]
    if (v !== undefined) {
      if (!Number.isFinite(v)) return fail('coord', 'Invalid size')
      next[k] = v
    }
  }
  if (args.kind) {
    next.kind = args.kind
    if (args.kind !== 'window') next.sill = 0
  }
  if (args.hinge) next.hinge = args.hinge
  if (args.swing) next.swing = args.swing
  const d = new Draft(p)
  d.setOpening(next)
  return finish(d, `Edit ${next.kind}`)
}

export function deleteOpening(p: Project, args: { opening: Id }): CommandResult {
  const o = p.openings[args.opening]
  if (!o) return fail('ref', 'That opening no longer exists', args.opening)
  const d = new Draft(p)
  delete d.p.openings[o.id]
  return finish(d, `Delete ${o.kind}`)
}

/* ---------- Items ---------- */

export function addItem(p: Project, args: { asset: string; level: Id; x: number; y: number; rotation?: number }): CommandResult {
  const a = getAsset(args.asset)
  if (!a) return fail('asset', 'Unknown asset')
  if (!p.levels[args.level]) return fail('ref', 'Unknown level')
  if (!Number.isFinite(args.x) || !Number.isFinite(args.y)) return fail('coord', 'Invalid position')
  const d = new Draft(p)
  const id = newId('i')
  d.setItem({ id, level: args.level, asset: a.id, x: args.x, y: args.y, rotation: args.rotation ?? 0 })
  d.created.push(id)
  return finish(d, `Add ${a.name}`)
}

export function moveItem(p: Project, args: { item: Id; x: number; y: number }): CommandResult {
  const it = p.items[args.item]
  if (!it) return fail('ref', 'That item no longer exists', args.item)
  if (!Number.isFinite(args.x) || !Number.isFinite(args.y)) return fail('coord', 'Invalid position')
  const d = new Draft(p)
  d.setItem({ ...it, x: args.x, y: args.y })
  return finish(d, 'Move item')
}

export function rotateItem(p: Project, args: { item: Id; rotation: number }): CommandResult {
  const it = p.items[args.item]
  if (!it) return fail('ref', 'That item no longer exists', args.item)
  if (!Number.isFinite(args.rotation)) return fail('coord', 'Invalid rotation')
  const TAU = Math.PI * 2
  const d = new Draft(p)
  d.setItem({ ...it, rotation: ((args.rotation % TAU) + TAU) % TAU })
  return finish(d, 'Rotate item')
}

export function replaceItem(p: Project, args: { item: Id; asset: string }): CommandResult {
  const it = p.items[args.item]
  if (!it) return fail('ref', 'That item no longer exists', args.item)
  if (!getAsset(args.asset)) return fail('asset', 'Unknown asset')
  const d = new Draft(p)
  d.setItem({ ...it, asset: args.asset, variant: undefined })
  return finish(d, 'Replace item')
}

export function deleteItem(p: Project, args: { item: Id }): CommandResult {
  const it = p.items[args.item]
  if (!it) return fail('ref', 'That item no longer exists', args.item)
  const d = new Draft(p)
  delete d.p.items[it.id]
  return finish(d, 'Delete item')
}
