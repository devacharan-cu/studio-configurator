import { useState } from 'react'
import { ASSETS, assetThumb, CATEGORY_LABELS, getAsset, SUGGESTED_FOR, type AssetCategory, type AssetDef } from '../../engine/assets/catalog'
import { useEditor, useProject } from '../store'
import { Icon } from './icons'

const RECENT_KEY = 'roomset.editor.v1.recent-assets'

/** Recently used assets, per viewer. Storage is untrusted: only known ids survive the read. */
function readRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && !!getAsset(id)).slice(0, 8) : []
  } catch {
    return []
  }
}
function pushRecent(id: string) {
  const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, 8)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* per-viewer convenience only */
  }
  return next
}

function FootprintIcon({ a }: { a: AssetDef }) {
  const s = Math.max(a.footprint.w, a.footprint.d)
  return (
    <svg viewBox="-1.3 -1.3 2.6 2.6" width="34" height="34" aria-hidden="true">
      <rect x={-a.footprint.w / s} y={-a.footprint.d / s} width={(2 * a.footprint.w) / s} height={(2 * a.footprint.d) / s} rx="0.12" fill="currentColor" opacity="0.35" />
    </svg>
  )
}

/** A thumbnail rendered from the asset itself (scripts/capture-thumbnails); the footprint if it's missing. */
export function AssetThumb({ a, size = 56 }: { a: AssetDef; size?: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-lg bg-linen text-ink-soft" style={{ width: size, height: size }}>
      {failed ? <FootprintIcon a={a} /> : <img src={assetThumb(a)} alt="" loading="lazy" width={size} height={size} onError={() => setFailed(true)} className="h-full w-full object-contain" />}
    </span>
  )
}

/** Only categories that have something in them. */
const USED_CATEGORIES = (Object.keys(CATEGORY_LABELS) as AssetCategory[]).filter((c) => ASSETS.some((a) => a.category === c))

const licenceLabel = (a: AssetDef) => (a.kind === 'procedural' ? 'Parametric' : a.license.spdx === 'CC0-1.0' ? 'CC0' : 'CC BY 4.0')

/**
 * The furniture library: search, categories, suggestions for the selected room, recently used.
 * Picking an item arms the place tool; the next click on a floor (2D or 3D) adds it to the project.
 */
export function AssetLibrary({ onClose }: { onClose: () => void }) {
  const setTool = useEditor((s) => s.setTool)
  const placeAsset = useEditor((s) => s.placeAsset)
  const selection = useEditor((s) => s.selection)
  const project = useProject()
  const room = selection?.kind === 'room' ? project.rooms[selection.id] : undefined
  const suggested = room ? SUGGESTED_FOR[room.type] : undefined
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<AssetCategory | 'all' | 'suggested'>('all')
  const [recent, setRecent] = useState(readRecent)

  const query = q.trim().toLowerCase()
  const matches = (a: AssetDef) => !query || `${a.name} ${CATEGORY_LABELS[a.category]} ${a.tags?.join(' ') ?? ''}`.toLowerCase().includes(query)
  const inCat = (a: AssetDef) => (cat === 'all' ? true : cat === 'suggested' ? !!suggested?.includes(a.category) : a.category === cat)
  const list = ASSETS.filter((a) => inCat(a) && matches(a))
  const groups = (Object.keys(CATEGORY_LABELS) as AssetCategory[]).map((c) => ({ c, items: list.filter((a) => a.category === c) })).filter((g) => g.items.length)
  const pick = (a: AssetDef) => {
    setTool('place', a.id)
    setRecent(pushRecent(a.id))
  }

  const Card = ({ a }: { a: AssetDef }) => (
    <button
      type="button"
      data-asset={a.id}
      aria-pressed={placeAsset === a.id}
      onClick={() => pick(a)}
      title={`${a.name} — ${a.footprint.w.toFixed(2)} × ${a.footprint.d.toFixed(2)} × ${a.footprint.h.toFixed(2)} m`}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-2 py-1.5 text-left transition-colors ${placeAsset === a.id ? 'border-ink bg-white' : 'border-transparent hover:bg-linen'}`}
    >
      <AssetThumb a={a} />
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-medium">{a.name}</span>
        <span className="block text-[10.5px] text-mute tabular-nums">
          {a.footprint.w.toFixed(2)} × {a.footprint.d.toFixed(2)} m · {licenceLabel(a)}
        </span>
      </span>
    </button>
  )

  return (
    <aside className="flex w-[296px] shrink-0 flex-col border-r border-line/80 bg-paper" aria-label="Furniture library">
      <header className="flex items-center justify-between px-3 pt-3 pb-2">
        <h2 className="font-display text-[20px]">
          Library <span className="text-[12px] text-mute">{ASSETS.length} items</span>
        </h2>
        <button type="button" onClick={onClose} className="text-mute hover:text-ink" aria-label="Close library">
          <Icon name="close" size={16} />
        </button>
      </header>
      <div className="space-y-2 px-3 pb-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search furniture, fixtures, decor…" className="field py-1.5" aria-label="Search furniture" />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Category">
          {suggested && (
            <button type="button" onClick={() => setCat('suggested')} aria-pressed={cat === 'suggested'} className={`rounded-full px-2 py-0.5 text-[11px] ${cat === 'suggested' ? 'bg-bronze text-paper' : 'bg-bronze/15 text-ink'}`}>
              For {room!.name}
            </button>
          )}
          {(['all', ...USED_CATEGORIES] as (AssetCategory | 'all')[]).map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={`rounded-full px-2 py-0.5 text-[11px] ${cat === c ? 'bg-ink text-paper' : 'bg-linen text-ink-soft'}`}>
              {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {recent.length > 0 && !query && cat === 'all' && (
          <section aria-label="Recently used" className="mb-2">
            <h3 className="eyebrow px-1.5 pb-1">Recently used</h3>
            <div className="flex gap-1.5 overflow-x-auto px-1 pb-1">
              {recent.map((id) => {
                const a = getAsset(id)!
                return (
                  <button key={id} type="button" onClick={() => pick(a)} title={a.name} aria-label={`${a.name} (recent)`} className={`rounded-lg border ${placeAsset === id ? 'border-ink' : 'border-transparent'}`}>
                    <AssetThumb a={a} size={44} />
                  </button>
                )
              })}
            </div>
          </section>
        )}
        {groups.map((g) => (
          <section key={g.c} aria-label={CATEGORY_LABELS[g.c]}>
            <h3 className="eyebrow px-1.5 pt-2 pb-1">
              {CATEGORY_LABELS[g.c]} <span className="text-mute">{g.items.length}</span>
            </h3>
            <ul className="space-y-0.5">
              {g.items.map((a) => (
                <li key={a.id}>
                  <Card a={a} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {list.length === 0 && <p className="px-2 py-4 text-center text-[12px] text-mute">Nothing matches “{q}”.</p>}
      </div>
      {placeAsset && <p className="border-t border-line/80 px-3 py-2 text-[11.5px] text-ink-soft">Click a floor in the plan or 3D view to place it. Esc to cancel.</p>}
    </aside>
  )
}
