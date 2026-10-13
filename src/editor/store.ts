import { create } from 'zustand'
import type { CommandResult } from '../engine/commands/draft'
import { canRedo, canUndo, commit, initHistory, redo, undo, type History } from '../engine/history'
import { parseProject, serializeProject } from '../engine/model/project'
import type { Id, Project } from '../engine/model/types'
import { compactHome } from '../engine/templates'

export type Tool = 'select' | 'room' | 'door' | 'window' | 'passage' | 'place'
export type SelectionKind = 'wall' | 'room' | 'opening' | 'item' | 'node'
export interface Selection {
  kind: SelectionKind
  id: Id
}
export type ViewMode = 'split' | 'plan' | '3d'
export type CameraMode = 'orbit' | 'walk'
export type SaveState = 'saved' | 'unsaved' | 'error'

export interface Notice {
  id: number
  tone: 'error' | 'info' | 'success'
  text: string
}

interface EditorState {
  history: History
  /** Transient project while dragging; committed as one undo step on release. */
  preview: Project | null
  previewError: string | null
  selection: Selection | null
  hover: Selection | null
  tool: Tool
  placeAsset: string | null
  view: ViewMode
  camera: CameraMode
  level: Id
  /** Walls drawn at full height, or cut away to see into rooms from above. */
  cutaway: boolean
  notices: Notice[]
  saveState: SaveState
  /** Walkthrough HUD state: the room the visitor is in, and teleport requests. */
  walk: { room: string | null; goto: { x: number; y: number; nonce: number } | null; returnView: ViewMode }

  /** Apply a command result: commit it (one undo step) or report why it was rejected. */
  run: (result: CommandResult) => boolean
  setPreview: (result: CommandResult | null) => void
  commitPreview: (label: string) => void
  cancelPreview: () => void
  undo: () => void
  redo: () => void
  loadProject: (p: Project, message?: string) => void
  select: (s: Selection | null) => void
  setHover: (s: Selection | null) => void
  setTool: (t: Tool, asset?: string | null) => void
  setView: (v: ViewMode) => void
  setCamera: (c: CameraMode) => void
  setCutaway: (on: boolean) => void
  enterWalk: () => void
  exitWalk: () => void
  setWalkRoom: (name: string | null) => void
  walkTo: (x: number, y: number) => void
  notify: (tone: Notice['tone'], text: string) => void
  dismiss: (id: number) => void
}

const STORAGE_KEY = 'roomset.editor.v1.project'
let noticeSeq = 0

function initialProject(): { project: Project; message?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = parseProject(raw)
      if (parsed.ok) return { project: parsed.project }
      return { project: compactHome(), message: `Your saved project couldn’t be opened (${parsed.error}) — started from the template.` }
    }
  } catch {
    /* storage unavailable */
  }
  return { project: compactHome() }
}

const firstLevel = (p: Project) => Object.values(p.levels).sort((a, b) => a.elevation - b.elevation)[0]?.id ?? ''

export const useEditor = create<EditorState>()((set, get) => {
  const init = initialProject()
  if (init.message) setTimeout(() => get().notify('error', init.message!), 0)
  return {
    history: initHistory(init.project),
    preview: null,
    previewError: null,
    selection: null,
    hover: null,
    tool: 'select',
    placeAsset: null,
    view: 'split',
    camera: 'orbit',
    level: firstLevel(init.project),
    cutaway: true,
    notices: [],
    saveState: 'saved',
    walk: { room: null, goto: null, returnView: 'split' },

    run: (result) => {
      if (!result.ok) {
        get().notify('error', result.error.message)
        return false
      }
      set((s) => ({ history: commit(s.history, result.project, result.label), preview: null, previewError: null }))
      for (const w of result.warnings) get().notify('info', w)
      return true
    },
    setPreview: (result) => {
      if (!result) return set({ preview: null, previewError: null })
      // Invalid intermediate states keep the last valid preview on screen and explain why.
      if (result.ok) set({ preview: result.project, previewError: null })
      else set({ previewError: result.error.message })
    },
    commitPreview: (label) => {
      const { preview, previewError } = get()
      if (preview && preview !== get().history.present) {
        set((s) => ({ history: commit(s.history, preview, label) }))
        // The drag was constrained: say why it stopped where it did.
        if (previewError) get().notify('error', `Stopped at the last valid position — ${previewError}`)
      } else if (previewError) get().notify('error', previewError)
      set({ preview: null, previewError: null })
    },
    cancelPreview: () => set({ preview: null, previewError: null }),
    undo: () => {
      if (!canUndo(get().history)) return
      set((s) => ({ history: undo(s.history), preview: null }))
      get().notify('info', `Undid: ${get().history.future[0]?.label ?? 'edit'}`)
      validateSelection()
    },
    redo: () => {
      if (!canRedo(get().history)) return
      set((s) => ({ history: redo(s.history), preview: null }))
      get().notify('info', `Redid: ${get().history.label}`)
      validateSelection()
    },
    loadProject: (p, message) => {
      set({ history: initHistory(p), preview: null, selection: null, level: firstLevel(p), camera: 'orbit' })
      if (message) get().notify('success', message)
    },
    select: (selection) => set({ selection }),
    setHover: (hover) => {
      const h = get().hover
      if (h?.id !== hover?.id || h?.kind !== hover?.kind) set({ hover })
    },
    setTool: (tool, asset = null) => set({ tool, placeAsset: tool === 'place' ? asset : null, selection: tool === 'select' ? get().selection : null }),
    setView: (view) => set({ view }),
    setCamera: (camera) => set({ camera }),
    setCutaway: (cutaway) => set({ cutaway }),
    enterWalk: () => {
      const { view } = get()
      set({ camera: 'walk', view: '3d', selection: null, preview: null, walk: { room: null, goto: null, returnView: view } })
    },
    exitWalk: () => set((s) => ({ camera: 'orbit', view: s.walk.returnView })),
    setWalkRoom: (room) => {
      if (get().walk.room !== room) set((s) => ({ walk: { ...s.walk, room } }))
    },
    walkTo: (x, y) => set((s) => ({ walk: { ...s.walk, goto: { x, y, nonce: (s.walk.goto?.nonce ?? 0) + 1 } } })),
    notify: (tone, text) => {
      const id = ++noticeSeq
      set((s) => ({ notices: [...s.notices.slice(-2), { id, tone, text }] }))
      setTimeout(() => get().dismiss(id), tone === 'error' ? 6000 : 3500)
    },
    dismiss: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
  }

  function validateSelection() {
    const { selection, history } = get()
    if (!selection) return
    const p = history.present
    const exists =
      (selection.kind === 'wall' && p.walls[selection.id]) ||
      (selection.kind === 'room' && p.rooms[selection.id]) ||
      (selection.kind === 'opening' && p.openings[selection.id]) ||
      (selection.kind === 'item' && p.items[selection.id]) ||
      (selection.kind === 'node' && p.nodes[selection.id])
    if (!exists) set({ selection: null })
  }
})

/** The project every view renders: the drag preview if there is one, otherwise the committed state. */
export const useProject = () => useEditor((s) => s.preview ?? s.history.present)
export const currentProject = () => {
  const s = useEditor.getState()
  return s.preview ?? s.history.present
}

/* ---------- Autosave (validated on load, so a corrupted save can't break the editor) ---------- */
let saveTimer: number | undefined
useEditor.subscribe((s, prev) => {
  if (s.history.present === prev.history.present) return
  if (s.saveState !== 'unsaved') useEditor.setState({ saveState: 'unsaved' })
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeProject(useEditor.getState().history.present))
      useEditor.setState({ saveState: 'saved' })
    } catch {
      useEditor.setState({ saveState: 'error' })
    }
  }, 500)
})

// Persist the opened project immediately so "Saved" is true from the start.
try {
  localStorage.setItem(STORAGE_KEY, serializeProject(useEditor.getState().history.present))
} catch {
  useEditor.setState({ saveState: 'error' })
}

export function clearSavedProject() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

if (import.meta.env.DEV) {
  ;(window as unknown as { __editor: typeof useEditor }).__editor = useEditor
}
