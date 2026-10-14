import { ASSETS, getAsset } from '../../engine/assets/catalog'
import { FLOOR_FINISHES, WALL_FINISHES } from '../../engine/assets/finishes'
import { deleteItem, deleteOpening, duplicateItem, moveItem, moveOpening, replaceItem, rotateItem, setItemVariant, updateOpening } from '../../engine/commands/elements'
import { deleteRoom, moveWall, setRoomSize, updateRoom, updateWall } from '../../engine/commands/structure'
import { wallSides } from '../../engine/geometry/walls'
import { fmtArea, fmtLen, roomMetrics } from '../../engine/metrics'
import { roomPolygon, wallFrame } from '../../engine/model/query'
import { ROOM_TYPES, type Project, type RoomType } from '../../engine/model/types'
import { useEditor, useProject } from '../store'
import { Icon } from './icons'
import { NumberField } from './NumberField'


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line/70 px-4 py-3.5">
      <h3 className="eyebrow mb-2.5">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Row({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex justify-between text-[12.5px]">
      <span className="text-ink-soft">{label}</span>
      <span className="font-mono tabular-nums" data-testid={testId}>
        {value}
      </span>
    </div>
  )
}

function Swatches({ options, value, onPick, label }: { options: { id: string; name: string; swatch: string }[]; value: string; onPick: (id: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          title={o.name}
          aria-label={o.name}
          onClick={() => onPick(o.id)}
          className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-paper transition ${o.id === value ? 'ring-2 ring-ink' : 'ring-1 ring-ink/15 hover:ring-ink/40'}`}
          style={{ backgroundColor: o.swatch }}
        />
      ))}
    </div>
  )
}

function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn-ghost h-8 w-full justify-start px-2 text-danger hover:bg-danger/10">
      <Icon name="trash" size={15} /> {label}
    </button>
  )
}

function RoomInspector({ p, id }: { p: Project; id: string }) {
  const { run, select } = useEditor.getState()
  const r = p.rooms[id]
  const m = roomMetrics(p, id)
  const poly = roomPolygon(p, r)
  const rectangular = poly.every((q, i) => {
    const n = poly[(i + 1) % poly.length]
    return Math.abs(q.x - n.x) < 1e-6 || Math.abs(q.y - n.y) < 1e-6
  })
  const xs = poly.map((q) => q.x)
  const ys = poly.map((q) => q.y)
  return (
    <>
      <Section title="Room">
        <label className="block text-[12.5px]">
          <span className="sr-only">Room name</span>
          <input
            key={r.id + r.name}
            defaultValue={r.name}
            maxLength={40}
            data-testid="room-name"
            onBlur={(e) => e.target.value !== r.name && run(updateRoom(p, { room: id, name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="field py-1.5 font-display text-[19px]"
          />
        </label>
        <select
          value={r.type}
          onChange={(e) => run(updateRoom(p, { room: id, type: e.target.value as RoomType }))}
          className="field py-1.5 capitalize"
          aria-label="Room type"
        >
          {ROOM_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Section>
      <Section title="Dimensions">
        <Row label="Floor area (net)" value={fmtArea(m.netArea)} testId="room-area" />
        <Row label="Perimeter (inner)" value={fmtLen(m.perimeter)} />
        {rectangular ? (
          <>
            <NumberField label="Width (wall to wall, centre)" value={Math.max(...xs) - Math.min(...xs)} testId="room-width" onCommit={(v) => run(setRoomSize(p, { room: id, axis: 'x', size: v }))} />
            <NumberField label="Depth (centre)" value={Math.max(...ys) - Math.min(...ys)} testId="room-depth" onCommit={(v) => run(setRoomSize(p, { room: id, axis: 'y', size: v }))} />
          </>
        ) : (
          <p className="text-[12px] text-mute">Drag walls or corners to reshape this room.</p>
        )}
      </Section>
      <Section title="Floor finish">
        <Swatches label="Floor finish" options={FLOOR_FINISHES} value={r.floorFinish} onPick={(f) => run(updateRoom(p, { room: id, floorFinish: f }))} />
      </Section>
      <Section title="Wall finish">
        <Swatches label="Wall finish" options={WALL_FINISHES} value={r.wallFinish} onPick={(f) => run(updateRoom(p, { room: id, wallFinish: f }))} />
      </Section>
      <div className="px-4 py-2">
        <DeleteButton label="Delete room" onClick={() => run(deleteRoom(p, { room: id })) && select(null)} />
      </div>
    </>
  )
}

function WallInspector({ p, id }: { p: Project; id: string }) {
  const { run } = useEditor.getState()
  const w = p.walls[id]
  const { length } = wallFrame(p, w)
  const s = wallSides(p)[id] ?? {}
  const names = [s.left, s.right].filter(Boolean).map((r) => p.rooms[r!].name)
  return (
    <>
      <Section title={names.length === 2 ? 'Shared wall' : 'Exterior wall'}>
        <p className="text-[12.5px] text-ink-soft">{names.length ? `Between ${names.join(' and ')}` : 'Not bounding any room'}</p>
        <Row label="Length (centreline)" value={fmtLen(length)} testId="wall-length" />
        <NumberField label="Thickness" value={w.thickness} step={0.01} testId="wall-thickness" onCommit={(v) => run(updateWall(p, { wall: id, thickness: v }))} />
        <NumberField label="Height" value={w.height} step={0.05} onCommit={(v) => run(updateWall(p, { wall: id, height: v }))} />
      </Section>
      <Section title="Move wall">
        <p className="text-[12px] text-mute">Moves this straight run of wall; connected walls stretch and both rooms resize.</p>
        <NumberField label="Offset (+ left / − right)" value={0} step={0.05} testId="wall-offset" onCommit={(v) => run(moveWall(p, { wall: id, distance: v }))} />
      </Section>
    </>
  )
}

function OpeningInspector({ p, id }: { p: Project; id: string }) {
  const { run, select } = useEditor.getState()
  const o = p.openings[id]
  const label = o.kind === 'door' ? 'Door' : o.kind === 'window' ? 'Window' : 'Opening'
  return (
    <>
      <Section title={label}>
        <div className="flex rounded-lg border border-line bg-white p-0.5" role="radiogroup" aria-label="Opening type">
          {(['door', 'window', 'passage'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={o.kind === k}
              onClick={() => run(updateOpening(p, { opening: id, kind: k, ...(k === 'window' ? { sill: 0.9, height: Math.min(o.height, 1.3) } : {}) }))}
              className={`flex-1 rounded-md py-1 text-[12px] capitalize ${o.kind === k ? 'bg-ink text-paper' : 'text-ink-soft'}`}
            >
              {k}
            </button>
          ))}
        </div>
        <NumberField label="Width" value={o.width} testId="opening-width" onCommit={(v) => run(updateOpening(p, { opening: id, width: v }))} />
        <NumberField label="Height" value={o.height} onCommit={(v) => run(updateOpening(p, { opening: id, height: v }))} />
        {o.kind === 'window' && <NumberField label="Sill height" value={o.sill} onCommit={(v) => run(updateOpening(p, { opening: id, sill: v }))} />}
        <NumberField label="Position along wall" value={o.offset} testId="opening-offset" onCommit={(v) => run(moveOpening(p, { opening: id, offset: v }))} />
        {o.kind === 'door' && (
          <div className="flex gap-1.5 pt-1">
            <button type="button" className="btn-secondary h-8 flex-1 px-2 text-[12px]" onClick={() => run(updateOpening(p, { opening: id, hinge: o.hinge === 'a' ? 'b' : 'a' }))}>
              Flip hinge
            </button>
            <button type="button" className="btn-secondary h-8 flex-1 px-2 text-[12px]" onClick={() => run(updateOpening(p, { opening: id, swing: o.swing === 'left' ? 'right' : 'left' }))}>
              Flip swing
            </button>
          </div>
        )}
      </Section>
      <div className="px-4 py-2">
        <DeleteButton label={`Delete ${label.toLowerCase()}`} onClick={() => run(deleteOpening(p, { opening: id })) && select(null)} />
      </div>
    </>
  )
}

function ItemInspector({ p, id }: { p: Project; id: string }) {
  const { run, select } = useEditor.getState()
  const it = p.items[id]
  const a = getAsset(it.asset)!
  const same = ASSETS.filter((x) => x.category === a.category)
  return (
    <>
      <Section title={a.category}>
        <p className="font-display text-[19px] leading-tight">{a.name}</p>
        <p className="text-[11.5px] text-mute">
          {fmtLen(a.footprint.w)} × {fmtLen(a.footprint.d)} × {fmtLen(a.footprint.h)} · {a.kind === 'procedural' ? 'parametric, modelled for this project' : a.license.spdx}
        </p>
        <NumberField label="X" value={it.x} onCommit={(v) => run(moveItem(p, { item: id, x: v, y: it.y }))} />
        <NumberField label="Y" value={it.y} onCommit={(v) => run(moveItem(p, { item: id, x: it.x, y: v }))} />
        <NumberField label="Rotation" value={(it.rotation * 180) / Math.PI} unit="°" step={15} decimals={0} testId="item-rotation" onCommit={(v) => run(rotateItem(p, { item: id, rotation: (v * Math.PI) / 180 }))} />
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className="btn-secondary h-8 px-2 text-[12px]" onClick={() => run(rotateItem(p, { item: id, rotation: it.rotation + Math.PI / 2 }))} title="Rotate 90° (Q)">
            <Icon name="rotate" size={15} /> Rotate 90°
          </button>
          <button
            type="button"
            className="btn-secondary h-8 px-2 text-[12px]"
            title="Duplicate (Ctrl+D)"
            onClick={() => {
              const r = duplicateItem(p, { item: id })
              if (run(r) && r.ok) select({ kind: 'item', id: r.created[0] })
            }}
          >
            <Icon name="copy" size={15} /> Duplicate
          </button>
        </div>
      </Section>
      {a.variants && a.variants.length > 1 && (
        <Section title="Finish">
          <Swatches label="Finish" options={a.variants} value={it.variant ?? a.variants[0].id} onPick={(v) => run(setItemVariant(p, { item: id, variant: v === a.variants![0].id ? undefined : v }))} />
          <p className="text-[11.5px] text-mute">{(a.variants.find((v) => v.id === it.variant) ?? a.variants[0]).name}</p>
        </Section>
      )}
      {same.length > 1 && (
        <Section title="Replace with">
          <select className="field py-1.5" value={it.asset} onChange={(e) => run(replaceItem(p, { item: id, asset: e.target.value }))} aria-label="Replace with">
            {same.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Section>
      )}
      <Section title="Credits">
        <p className="text-[11.5px] leading-snug text-ink-soft" data-testid="item-credit">
          {a.license.attribution}
          {a.license.spdx !== 'project' && <> · {a.license.spdx === 'CC0-1.0' ? 'CC0 (public domain)' : 'CC BY 4.0'}</>}
          {a.license.source && (
            <>
              {' · '}
              <a href={a.license.source} target="_blank" rel="noopener noreferrer" className="underline">
                source
              </a>
            </>
          )}
        </p>
      </Section>
      <div className="px-4 py-2">
        <DeleteButton label="Remove item" onClick={() => run(deleteItem(p, { item: id })) && select(null)} />
      </div>
    </>
  )
}

function ProjectSummary({ p }: { p: Project }) {
  const level = useEditor((s) => s.level)
  const select = useEditor((s) => s.select)
  const rooms = Object.values(p.rooms).filter((r) => r.level === level)
  const total = rooms.reduce((s, r) => s + roomMetrics(p, r.id).netArea, 0)
  return (
    <>
      <Section title="Rooms">
        {rooms.length === 0 && <p className="text-[12.5px] text-mute">No rooms yet — choose the Room tool and drag on the plan.</p>}
        <ul className="space-y-0.5">
          {rooms.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => select({ kind: 'room', id: r.id })} className="flex w-full justify-between rounded-md px-1.5 py-1 text-left text-[12.5px] hover:bg-linen">
                <span>{r.name}</span>
                <span className="font-mono text-mute tabular-nums">{fmtArea(roomMetrics(p, r.id).netArea)}</span>
              </button>
            </li>
          ))}
        </ul>
        {rooms.length > 0 && <Row label="Total net area" value={fmtArea(total)} testId="total-area" />}
      </Section>
      <Section title="Building">
        <Row label="Walls" value={String(Object.keys(p.walls).length)} />
        <Row label="Doors & windows" value={String(Object.keys(p.openings).length)} />
        <Row label="Furniture & fixtures" value={String(Object.keys(p.items).length)} />
      </Section>
      <p className="px-4 py-3 text-[11.5px] leading-relaxed text-mute">Select a room, wall, door, window or piece of furniture — in the plan or in 3D — to edit it.</p>
    </>
  )
}

export function Inspector() {
  const p = useProject()
  const selection = useEditor((s) => s.selection)
  const select = useEditor((s) => s.select)
  const exists =
    selection &&
    ((selection.kind === 'room' && p.rooms[selection.id]) ||
      (selection.kind === 'wall' && p.walls[selection.id]) ||
      (selection.kind === 'opening' && p.openings[selection.id]) ||
      (selection.kind === 'item' && p.items[selection.id]))
  return (
    <aside className="flex h-full flex-col overflow-hidden border-l border-line/80 bg-paper" aria-label="Inspector" data-testid="inspector">
      <header className="flex items-center justify-between border-b border-line/80 px-4 py-2.5">
        <h2 className="text-[13px] font-semibold">{exists ? 'Selection' : 'Project'}</h2>
        {exists && (
          <button type="button" className="text-mute hover:text-ink" onClick={() => select(null)} aria-label="Clear selection">
            <Icon name="close" size={16} />
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {exists && selection.kind === 'room' && <RoomInspector p={p} id={selection.id} />}
        {exists && selection.kind === 'wall' && <WallInspector p={p} id={selection.id} />}
        {exists && selection.kind === 'opening' && <OpeningInspector p={p} id={selection.id} />}
        {exists && selection.kind === 'item' && <ItemInspector p={p} id={selection.id} />}
        {!exists && <ProjectSummary p={p} />}
      </div>
    </aside>
  )
}
