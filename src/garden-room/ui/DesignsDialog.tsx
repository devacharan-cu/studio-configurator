import { useState } from 'react'
import { getOption } from '../domain/catalog'
import { isSameConfiguration } from '../domain/configuration'
import { GROUP_IDS, type AnyOption } from '../domain/types'
import { NAME_LIMIT, type SavedDesign } from '../lib/storage'
import { useStore } from '../state/store'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { MaterialSwatch } from './Swatch'

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function SwatchRow({ design }: { design: SavedDesign }) {
  return (
    <span className="flex -space-x-1.5">
      {GROUP_IDS.map((g) => {
        const opt = getOption(g, design.config[g]) as AnyOption | undefined
        return opt ? <MaterialSwatch key={g} option={opt} className="h-5 w-5 rounded-full ring-2 ring-paper" /> : null
      })}
    </span>
  )
}

function DesignRow({ design, selected, onToggle }: { design: SavedDesign; selected: boolean; onToggle: () => void }) {
  const restoreDesign = useStore((s) => s.restoreDesign)
  const renameDesign = useStore((s) => s.renameDesign)
  const deleteDesign = useStore((s) => s.deleteDesign)
  const closeDialog = useStore((s) => s.closeDialog)
  const isCurrent = useStore((s) => isSameConfiguration(s.config, design.config))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(design.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <li className={`rounded-2xl border p-3.5 transition-colors ${selected ? 'border-ink bg-white' : 'border-line bg-white/50'}`} data-design={design.name}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1.5 h-4 w-4 accent-[var(--color-ink)]"
          aria-label={`Select ${design.name} to compare`}
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                renameDesign(design.id, draft)
                setEditing(false)
              }}
            >
              <input
                autoFocus
                value={draft}
                maxLength={NAME_LIMIT}
                onChange={(e) => setDraft(e.target.value)}
                className="field py-1.5"
                aria-label="Design name"
              />
              <button type="submit" className="btn-primary h-9 px-3">
                Save
              </button>
            </form>
          ) : (
            <p className="flex items-center gap-2">
              <span className="truncate font-display text-[20px] leading-tight">{design.name}</span>
              {isCurrent && <span className="rounded-full bg-sage/15 px-2 py-0.5 text-[10.5px] font-medium text-sage">In the room</span>}
            </p>
          )}
          <p className="mt-1 flex items-center gap-2.5 text-[11.5px] text-mute">
            <SwatchRow design={design} />
            Saved {dateFmt.format(new Date(design.savedAt))}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-7">
        {confirmDelete ? (
          <>
            <span className="mr-1 text-[12.5px] text-danger">Delete “{design.name}”?</span>
            <button type="button" className="btn h-8 bg-danger px-3 text-paper hover:bg-danger/90" onClick={() => deleteDesign(design.id)}>
              Delete
            </button>
            <button type="button" className="btn-ghost h-8 px-3" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn-secondary h-8 px-3"
              disabled={isCurrent}
              onClick={() => {
                restoreDesign(design.id)
                closeDialog()
              }}
            >
              <Icon name="restore" size={15} /> Show in room
            </button>
            <button type="button" className="btn-ghost h-8 px-3" onClick={() => setEditing(true)} aria-label={`Rename ${design.name}`}>
              <Icon name="pencil" size={15} /> Rename
            </button>
            <button type="button" className="btn-ghost h-8 px-3" onClick={() => setConfirmDelete(true)} aria-label={`Delete ${design.name}`}>
              <Icon name="trash" size={15} /> Delete
            </button>
          </>
        )}
      </div>
    </li>
  )
}

export function DesignsDialog() {
  const open = useStore((s) => s.dialog === 'designs')
  const closeDialog = useStore((s) => s.closeDialog)
  const saved = useStore((s) => s.saved)
  const saveCurrent = useStore((s) => s.saveCurrent)
  const startCompare = useStore((s) => s.startCompare)
  const [picked, setPicked] = useState<string[]>([])

  const valid = picked.filter((id) => saved.some((d) => d.id === id))
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p.filter((x) => saved.some((d) => d.id === x)), id].slice(-2)))
  // A is always the earlier save, so "Design A" lands in column A.
  const chosen = valid.length === 2 ? valid : saved.length === 2 ? saved.map((d) => d.id) : null
  const savedAt = (id: string) => saved.find((d) => d.id === id)?.savedAt ?? ''
  const pair = chosen ? [...chosen].sort((x, y) => savedAt(x).localeCompare(savedAt(y))) : null

  return (
    <Dialog open={open} onClose={closeDialog} title="My designs" eyebrow="Saved in this browser" variant="sheet">
      {saved.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center">
          <p className="font-display text-[22px]">No saved designs yet</p>
          <p className="mx-auto mt-2 max-w-[30ch] text-[13px] leading-relaxed text-ink-soft">
            Save the room as it is now, change a few things, then save again to compare the two side by side.
          </p>
          <button type="button" className="btn-primary mt-5" onClick={() => saveCurrent()}>
            <Icon name="save" size={16} /> Save current design
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-2xl bg-linen/70 p-4">
            <p className="text-[13px] leading-relaxed text-ink-soft">
              {pair
                ? 'Compare two designs option by option, and flip between them in the room.'
                : saved.length === 1
                  ? 'Save one more variant to compare them side by side.'
                  : 'Tick two designs to compare them.'}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn-primary" disabled={!pair} onClick={() => pair && startCompare(pair[0], pair[1])}>
                <Icon name="compare" size={16} /> Compare {valid.length === 2 ? 'selected' : saved.length === 2 ? 'both' : ''}
              </button>
              <button type="button" className="btn-secondary" onClick={() => saveCurrent()}>
                <Icon name="save" size={16} /> Save current
              </button>
            </div>
          </div>
          <ul className="space-y-2.5">
            {saved.map((d) => (
              <DesignRow key={d.id} design={d} selected={valid.includes(d.id)} onToggle={() => toggle(d.id)} />
            ))}
          </ul>
        </>
      )}
    </Dialog>
  )
}
