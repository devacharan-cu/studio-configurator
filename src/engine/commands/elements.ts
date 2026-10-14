import { getAsset } from '../assets/catalog'
import { usableRange } from '../geometry/walls'
import type { Id, Opening, OpeningKind, Project } from '../model/types'
import { LIMITS } from '../model/types'
import { Draft, fail, finish, newId, type CommandResult } from './draft'
import { itemsOn, placeItem } from './placement'
import { itemCorners, roomAt } from './structure'

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
  // Existing openings occupy parts of the wall: place the new one in the nearest free span that fits.
  const offset = nearestFreeCentre(p, w.id, clampNum(args.offset, lo, hi), width, lo, hi)
  if (offset === null) return fail('opening-overlap', `No free space on this wall for a ${width.toFixed(2)} m ${args.kind} — move or resize the existing openings`, w.id)
  const d = new Draft(p)
  const id = newId('o')
  if (Math.abs(offset - clampNum(args.offset, lo, hi)) > 0.01) d.warnings.push(`Placed the ${args.kind} beside the existing opening`)
  d.setOpening({
    id,
    wall: w.id,
    kind: args.kind,
    offset,
    width,
    height,
    sill: args.sill ?? def.sill,
    hinge: 'a',
    swing: 'left',
  })
  d.created.push(id)
  return finish(d, `Add ${args.kind}`)
}

/**
 * The centre closest to `want` (within [lo, hi]) at which an opening of `width` doesn't overlap the
 * wall's existing openings (keeping the clearance between them), or null if the wall is full.
 */
export function nearestFreeCentre(p: Project, wall: Id, want: number, width: number, lo: number, hi: number, ignore?: Id): number | null {
  const gap = LIMITS.openingClearance
  // blocked centre ranges: an existing opening at c with width w blocks centres within (w + width)/2 + gap
  const blocked = Object.values(p.openings)
    .filter((o) => o.wall === wall && o.id !== ignore)
    .map((o) => [o.offset - o.width / 2 - gap - width / 2, o.offset + o.width / 2 + gap + width / 2] as const)
    .sort((a, b) => a[0] - b[0])
  const free: [number, number][] = []
  let cursor = lo
  for (const [b0, b1] of blocked) {
    if (b0 > cursor) free.push([cursor, Math.min(b0, hi)])
    cursor = Math.max(cursor, b1)
  }
  if (cursor <= hi) free.push([cursor, hi])
  let best: number | null = null
  for (const [f0, f1] of free) {
    if (f1 < f0) continue
    const c = clampNum(want, f0, f1)
    if (best === null || Math.abs(c - want) < Math.abs(best - want)) best = c
  }
  return best
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
  d.setItem(placeItem(p, { id, level: args.level, asset: a.id, x: args.x, y: args.y, rotation: args.rotation ?? 0 }))
  d.created.push(id)
  return finish(d, `Add ${a.name}`)
}

export function moveItem(p: Project, args: { item: Id; x: number; y: number }): CommandResult {
  const it = p.items[args.item]
  if (!it) return fail('ref', 'That item no longer exists', args.item)
  if (!Number.isFinite(args.x) || !Number.isFinite(args.y)) return fail('coord', 'Invalid position')
  const d = new Draft(p)
  const moved = placeItem(p, { ...it, x: args.x, y: args.y })
  // things standing on a table travel with it
  for (const o of itemsOn(p, it)) d.setItem({ ...o, x: o.x + moved.x - it.x, y: o.y + moved.y - it.y })
  d.setItem(moved)
  return finish(d, 'Move item')
}

export function rotateItem(p: Project, args: { item: Id; rotation: number }): CommandResult {
  const it = p.items[args.item]
  if (!it) return fail('ref', 'That item no longer exists', args.item)
  if (!Number.isFinite(args.rotation)) return fail('coord', 'Invalid rotation')
  const TAU = Math.PI * 2
  const d = new Draft(p)
  // wall-mounted items keep facing the room: rotation comes from the wall
  d.setItem(placeItem(p, { ...it, rotation: ((args.rotation % TAU) + TAU) % TAU }))
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

/** Copy an item beside the original (same asset, rotation and finish); kept inside its room. */
export function duplicateItem(p: Project, args: { item: Id; dx?: number; dy?: number }): CommandResult {
  const it = p.items[args.item]
  if (!it) return fail('ref', 'That item no longer exists', args.item)
  const a = getAsset(it.asset)
  const step = Math.min(1, Math.max(0.3, (a ? Math.min(a.footprint.w, a.footprint.d) : 0.5) + 0.1))
  const room = roomAt(p, it.level, it)?.id
  const tries: [number, number][] = args.dx !== undefined || args.dy !== undefined ? [[args.dx ?? 0, args.dy ?? 0]] : [[step, 0], [-step, 0], [0, step], [0, -step]]
  // the first offset whose footprint stays inside the same room (else the first one: the user moves it)
  const fits = (x: number, y: number) => !room || itemCorners({ ...it, x, y }).every((c) => roomAt(p, it.level, c)?.id === room)
  const [dx, dy] = tries.find(([tx, ty]) => fits(it.x + tx, it.y + ty)) ?? tries[0]
  const d = new Draft(p)
  const id = newId('i')
  d.setItem(placeItem(p, { ...it, id, x: it.x + dx, y: it.y + dy }))
  d.created.push(id)
  return finish(d, `Duplicate ${a?.name ?? 'item'}`)
}

/** Choose one of the asset's finish options (fabric, wood, colour). */
export function setItemVariant(p: Project, args: { item: Id; variant: string | undefined }): CommandResult {
  const it = p.items[args.item]
  if (!it) return fail('ref', 'That item no longer exists', args.item)
  const a = getAsset(it.asset)
  if (args.variant !== undefined && !a?.variants?.some((v) => v.id === args.variant)) return fail('variant', 'That finish isn’t available for this item')
  const d = new Draft(p)
  d.setItem({ ...it, variant: args.variant })
  return finish(d, 'Change finish')
}

export function deleteItem(p: Project, args: { item: Id }): CommandResult {
  const it = p.items[args.item]
  if (!it) return fail('ref', 'That item no longer exists', args.item)
  const d = new Draft(p)
  delete d.p.items[it.id]
  return finish(d, 'Delete item')
}
