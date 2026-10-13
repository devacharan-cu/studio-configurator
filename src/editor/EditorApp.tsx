import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ASSETS, CATEGORY_LABELS, type AssetCategory } from '../engine/assets/catalog'
import { deleteItem, deleteOpening, rotateItem } from '../engine/commands/elements'
import { deleteRoom } from '../engine/commands/structure'
import { canRedo, canUndo } from '../engine/history'
import { parseProject, serializeProject } from '../engine/model/project'
import { TEMPLATES } from '../engine/templates'
import { PlanView } from './plan/PlanView'
import { currentProject, useEditor, type Tool, type ViewMode } from './store'
import { Icon, type IconName } from './ui/icons'
import { Inspector } from './ui/Inspector'
import { NavHud } from './ui/NavHud'
import { ViewBar } from './ui/ViewBar'

const Scene3D = lazy(() => import('./scene/Scene3D').then((m) => ({ default: m.Scene3D })))

const TOOLS: { id: Tool; label: string; icon: IconName; key: string; hint: string }[] = [
  { id: 'select', label: 'Select', icon: 'select', key: 'V', hint: 'Select and drag walls, corners, doors and furniture' },
  { id: 'room', label: 'Room', icon: 'room', key: 'R', hint: 'Drag on the plan to draw a room; it joins neighbouring walls' },
  { id: 'door', label: 'Door', icon: 'door', key: 'D', hint: 'Click a wall to add a door' },
  { id: 'window', label: 'Window', icon: 'window', key: 'W', hint: 'Click a wall to add a window' },
  { id: 'passage', label: 'Opening', icon: 'passage', key: 'O', hint: 'Click a wall to add an open passage' },
]

function TopBar({ onFrame }: { onFrame: () => void }) {
  const history = useEditor((s) => s.history)
  const saveState = useEditor((s) => s.saveState)
  const view = useEditor((s) => s.view)
  const camera = useEditor((s) => s.camera)
  const cutaway = useEditor((s) => s.cutaway)
  const { undo, redo, setView, setCutaway } = useEditor.getState()
  const [menu, setMenu] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportJson = () => {
    const p = currentProject()
    const blob = new Blob([serializeProject(p)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${p.name.replace(/[^\w-]+/g, '-').toLowerCase() || 'project'}.roomset.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    setMenu(false)
  }
  const importJson = async (file: File) => {
    setMenu(false)
    if (file.size > 5_000_000) return useEditor.getState().notify('error', 'That file is too large to be a project.')
    const r = parseProject(await file.text())
    if (r.ok) useEditor.getState().loadProject(r.project, `Opened “${r.project.name}”`)
    else useEditor.getState().notify('error', r.error)
  }

  const views: { id: ViewMode; label: string; icon: IconName }[] = [
    { id: 'plan', label: '2D plan', icon: 'plan' },
    { id: 'split', label: 'Split', icon: 'split' },
    { id: '3d', label: '3D', icon: 'cube' },
  ]
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line/80 bg-paper px-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink font-display text-[17px] text-paper" aria-hidden="true">
          R
        </span>
        <div className="hidden leading-tight sm:block">
          <p className="max-w-[28vw] truncate text-[13px] font-semibold">{history.present.name}</p>
          <p className="text-[10.5px] text-mute" data-testid="save-state">
            {saveState === 'saved' ? 'Saved in this browser' : saveState === 'unsaved' ? 'Saving…' : 'Couldn’t save — export to keep a copy'}
          </p>
        </div>
      </div>
      <div className="relative">
        <button type="button" className="btn-ghost h-8 px-2.5 text-[12.5px]" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu">
          <Icon name="menu" size={16} /> <span className="hidden sm:inline">Project</span>
          <span className="sr-only sm:hidden">Project</span>
        </button>
        {menu && (
          <div role="menu" className="absolute top-9 left-0 z-30 w-64 rounded-xl border border-line bg-paper p-1.5 shadow-xl">
            <p className="eyebrow px-2 pt-1 pb-1.5">New from template</p>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                role="menuitem"
                type="button"
                className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-linen"
                onClick={() => {
                  useEditor.getState().loadProject(t.build(), `Started “${t.name}” — undo history cleared`)
                  setMenu(false)
                  setTimeout(onFrame, 50)
                }}
              >
                <span className="block text-[12.5px] font-medium">{t.name}</span>
                <span className="block text-[11px] text-mute">{t.description}</span>
              </button>
            ))}
            <div className="my-1 h-px bg-line" />
            <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] hover:bg-linen" onClick={exportJson}>
              <Icon name="download" size={15} /> Export project (.json)
            </button>
            <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] hover:bg-linen" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={15} /> Open project file…
            </button>
            <a role="menuitem" href="/garden-room" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] hover:bg-linen">
              <Icon name="eye" size={15} /> Garden Room configurator (Phase 1)
            </a>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" data-testid="import-input" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
      </div>

      <div className="flex items-center gap-0.5">
        <button type="button" className="btn-ghost h-8 w-8 px-0" disabled={!canUndo(history)} onClick={undo} aria-label="Undo" title={`Undo ${history.label} (Ctrl+Z)`}>
          <Icon name="undo" size={17} />
        </button>
        <button type="button" className="btn-ghost h-8 w-8 px-0" disabled={!canRedo(history)} onClick={redo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
          <Icon name="redo" size={17} />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {camera === 'orbit' && (
          <>
            <button
              type="button"
              className="btn-primary h-8 px-3 text-[12px]"
              onClick={() => useEditor.getState().enterWalk()}
              disabled={Object.keys(history.present.rooms).length === 0}
              title="Walk through the home in first person, full screen"
            >
              <Icon name="walk" size={15} /> <span className="hidden sm:inline">Walk through</span>
              <span className="sr-only sm:hidden">Walk through</span>
            </button>
            <button
              type="button"
              className="btn hidden h-8 border border-line px-2.5 text-[12px] text-ink-soft hover:bg-linen sm:inline-flex"
              onClick={() => useEditor.getState().enterFly()}
              title="Free camera: fly anywhere to inspect the architecture"
            >
              <Icon name="fly" size={15} /> <span className="hidden md:inline">Free camera</span>
              <span className="sr-only md:hidden">Free camera</span>
            </button>
          </>
        )}
        {view !== 'plan' && camera === 'orbit' && (
          <button
            type="button"
            aria-pressed={cutaway}
            onClick={() => setCutaway(!cutaway)}
            className={`btn hidden h-8 border px-2.5 text-[12px] sm:inline-flex ${cutaway ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft'}`}
            title="Lower walls to see into rooms"
          >
            <Icon name="cut" size={15} /> <span className="hidden md:inline">Cut-away</span>
            <span className="sr-only md:hidden">Cut-away</span>
          </button>
        )}
        <div className="flex rounded-full bg-linen p-0.5" role="group" aria-label="View">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
              className={`flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium ${view === v.id ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft'}`}
            >
              <Icon name={v.icon} size={14} />
              <span className="hidden md:inline">{v.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

function ToolRail({ library, setLibrary }: { library: boolean; setLibrary: (b: boolean) => void }) {
  const tool = useEditor((s) => s.tool)
  const setTool = useEditor((s) => s.setTool)
  return (
    <nav className="flex w-[60px] shrink-0 flex-col items-center gap-1 border-r border-line/80 bg-paper py-2" aria-label="Tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={tool === t.id}
          title={`${t.hint} (${t.key})`}
          onClick={() => {
            setTool(t.id)
            setLibrary(false)
          }}
          className={`flex w-12 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors ${tool === t.id ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-linen'}`}
        >
          <Icon name={t.icon} size={19} />
          {t.label}
        </button>
      ))}
      <div className="my-1 h-px w-8 bg-line" />
      <button
        type="button"
        aria-pressed={library || tool === 'place'}
        onClick={() => setLibrary(!library)}
        className={`flex w-12 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium ${library || tool === 'place' ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-linen'}`}
        title="Furniture & fixtures library (L)"
      >
        <Icon name="sofa" size={19} />
        Furnish
      </button>
    </nav>
  )
}

function Library({ onClose }: { onClose: () => void }) {
  const setTool = useEditor((s) => s.setTool)
  const placeAsset = useEditor((s) => s.placeAsset)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<AssetCategory | 'all'>('all')
  const list = ASSETS.filter((a) => (cat === 'all' || a.category === cat) && a.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <aside className="flex w-[264px] shrink-0 flex-col border-r border-line/80 bg-paper" aria-label="Furniture library">
      <header className="flex items-center justify-between px-3 pt-3 pb-2">
        <h2 className="font-display text-[20px]">Library</h2>
        <button type="button" onClick={onClose} className="text-mute hover:text-ink" aria-label="Close library">
          <Icon name="close" size={16} />
        </button>
      </header>
      <div className="space-y-2 px-3 pb-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search furniture…" className="field py-1.5" aria-label="Search furniture" />
        <div className="flex flex-wrap gap-1">
          {(['all', ...Object.keys(CATEGORY_LABELS)] as (AssetCategory | 'all')[]).map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={`rounded-full px-2 py-0.5 text-[11px] ${cat === c ? 'bg-ink text-paper' : 'bg-linen text-ink-soft'}`}>
              {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {list.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              data-asset={a.id}
              aria-pressed={placeAsset === a.id}
              onClick={() => setTool('place', a.id)}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${placeAsset === a.id ? 'border-ink bg-white' : 'border-transparent hover:bg-linen'}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-linen text-ink-soft" aria-hidden="true">
                <svg viewBox="-1.3 -1.3 2.6 2.6" width="28" height="28">
                  <rect
                    x={-a.footprint.w / Math.max(a.footprint.w, a.footprint.d)}
                    y={-a.footprint.d / Math.max(a.footprint.w, a.footprint.d)}
                    width={(2 * a.footprint.w) / Math.max(a.footprint.w, a.footprint.d)}
                    height={(2 * a.footprint.d) / Math.max(a.footprint.w, a.footprint.d)}
                    rx="0.12"
                    fill="currentColor"
                    opacity="0.35"
                  />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium">{a.name}</span>
                <span className="block text-[10.5px] text-mute">
                  {a.footprint.w.toFixed(2)} × {a.footprint.d.toFixed(2)} m · {a.kind === 'procedural' ? 'modelled in code' : a.license.spdx === 'CC0-1.0' ? 'CC0 scan/model' : 'CC BY 4.0'}
                </span>
              </span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="px-2 py-4 text-center text-[12px] text-mute">Nothing matches “{q}”.</li>}
      </ul>
      {placeAsset && <p className="border-t border-line/80 px-3 py-2 text-[11.5px] text-ink-soft">Click on the plan to place it. Esc to cancel.</p>}
    </aside>
  )
}

function Notices() {
  const notices = useEditor((s) => s.notices)
  const dismiss = useEditor((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2" role="region" aria-label="Notifications">
      {notices.map((n) => (
        <div
          key={n.id}
          role={n.tone === 'error' ? 'alert' : 'status'}
          data-testid={`notice-${n.tone}`}
          className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full px-4 py-2 text-[12.5px] shadow-lg ${n.tone === 'error' ? 'bg-danger text-paper' : 'bg-ink text-paper'}`}
        >
          <Icon name={n.tone === 'error' ? 'alert' : n.tone === 'success' ? 'check' : 'info'} size={15} />
          <span>{n.text}</span>
          <button type="button" onClick={() => dismiss(n.id)} className="opacity-70 hover:opacity-100" aria-label="Dismiss">
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

function useShortcuts(setLibrary: (b: boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      const st = useEditor.getState()
      if (st.camera !== 'orbit') return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) st.redo()
        else st.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        st.redo()
        return
      }
      if (mod) return
      const p = currentProject()
      const sel = st.selection
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        e.preventDefault()
        if (sel.kind === 'item' && st.run(deleteItem(p, { item: sel.id }))) st.select(null)
        else if (sel.kind === 'opening' && st.run(deleteOpening(p, { opening: sel.id }))) st.select(null)
        else if (sel.kind === 'room' && st.run(deleteRoom(p, { room: sel.id }))) st.select(null)
        else if (sel.kind === 'wall') st.notify('info', 'Walls are deleted with their rooms — select the room instead')
        return
      }
      if (e.key === 'Escape') {
        if (st.tool !== 'select') st.setTool('select')
        else st.select(null)
        setLibrary(false)
        return
      }
      if (e.key.toLowerCase() === 'q' && sel?.kind === 'item') {
        st.run(rotateItem(p, { item: sel.id, rotation: p.items[sel.id].rotation + Math.PI / 2 }))
        return
      }
      const tool = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase())
      if (tool) {
        st.setTool(tool.id)
        setLibrary(false)
      }
      if (e.key.toLowerCase() === 'l') setLibrary(true)
      // camera: F frames the selection (or the whole home), H returns to the overview
      if (e.key.toLowerCase() === 'f' && st.view !== 'plan') st.requestView({ kind: 'selection' })
      if (e.key.toLowerCase() === 'h' && st.view !== 'plan') st.requestView({ kind: 'preset', preset: 'overview' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setLibrary])
}

export default function EditorApp() {
  const view = useEditor((s) => s.view)
  const camera = useEditor((s) => s.camera)
  const [library, setLibrary] = useState(false)
  const [frameKey, setFrameKey] = useState(0)
  useShortcuts(setLibrary)
  useEffect(() => {
    document.title = 'Roomset — building editor'
  }, [])
  // Walk and fly are immersive: the scene takes the whole window and editing chrome is hidden.
  const immersive = camera !== 'orbit'
  const showPlan = view !== '3d' && !immersive
  const show3d = view !== 'plan' || immersive
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-paper text-ink">
      {!immersive && <TopBar onFrame={() => setFrameKey((k) => k + 1)} />}
      <div className="flex min-h-0 flex-1">
        {/* Structural editing tools need a pointer and room; phones get viewing + walkthrough. */}
        {camera === 'orbit' && (
          <div className="hidden md:flex">
            <ToolRail library={library} setLibrary={setLibrary} />
          </div>
        )}
        {library && !immersive && <Library onClose={() => setLibrary(false)} />}
        <main className="flex min-w-0 flex-1">
          {showPlan && (
            <section className={`relative min-w-0 ${show3d ? 'w-1/2 border-r border-line/80' : 'flex-1'}`} aria-label="2D plan">
              <PlanView />
            </section>
          )}
          {show3d && (
            <section className="relative min-w-0 flex-1" aria-label="3D view">
              <Suspense fallback={<div className="grid h-full place-items-center text-[12px] text-mute">Loading 3D…</div>}>
                <Scene3D frameKey={frameKey} />
              </Suspense>
              {immersive ? <NavHud /> : <ViewBar />}
            </section>
          )}
        </main>
        <div className={`w-[300px] shrink-0 ${immersive ? 'hidden' : 'hidden lg:block'}`}>
          <Inspector />
        </div>
      </div>
      <Notices />
    </div>
  )
}
