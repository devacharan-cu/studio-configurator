import { create } from 'zustand'
import { defaultConfiguration, isSameConfiguration, isValidOption } from '../domain/configuration'
import type { Configuration, GroupId } from '../domain/types'
import { MAX_SAVED, cleanName, loadSavedDesigns, newId, storeSavedDesigns, type SavedDesign } from '../lib/storage'

export type ViewId = 'overview' | 'plan' | 'window' | 'thumbSofa' | 'thumbTable' | GroupId
export type DialogId = 'share' | 'brief' | 'designs' | 'about'
export type ToastTone = 'success' | 'info' | 'error'

export interface Toast {
  id: number
  tone: ToastTone
  title: string
  body?: string
}

interface CompareState {
  aId: string
  bId: string
  showing: 'a' | 'b'
  /** The working design before comparing, restored on exit unless the client keeps a variant. */
  returnTo: Configuration
}

interface State {
  config: Configuration
  activeGroup: GroupId
  hoveredGroup: GroupId | null
  /** Bumped on every camera request so repeated requests for the same view still fire. */
  view: { id: ViewId; nonce: number }
  saved: SavedDesign[]
  compare: CompareState | null
  dialog: DialogId | null
  toasts: Toast[]
  scene: { status: 'loading' | 'ready' | 'unsupported'; pending: boolean; failed: string[] }
  /** The configuration the 3D scene has actually committed (assets loaded and on screen). */
  rendered: Configuration | null

  selectOption: (group: GroupId, id: string) => void
  setActiveGroup: (group: GroupId, opts?: { focus?: boolean }) => void
  setHoveredGroup: (group: GroupId | null) => void
  requestView: (id: ViewId) => void
  applyConfig: (config: Configuration) => void

  saveCurrent: (name?: string) => SavedDesign | null
  renameDesign: (id: string, name: string) => void
  deleteDesign: (id: string) => void
  restoreDesign: (id: string) => void

  startCompare: (aId: string, bId: string) => void
  showCompareSide: (side: 'a' | 'b') => void
  endCompare: (keep: boolean) => void

  openDialog: (d: DialogId) => void
  closeDialog: () => void
  toast: (tone: ToastTone, title: string, body?: string) => void
  dismissToast: (id: number) => void
  setSceneStatus: (status: State['scene']['status']) => void
  setScenePending: (pending: boolean) => void
  setRendered: (config: Configuration) => void
  reportAssetFailure: (optionId: string) => void
}

let toastSeq = 0
const nextLetter = (saved: SavedDesign[]) => {
  const used = new Set(saved.map((d) => d.name))
  for (let i = 0; i < 26; i++) {
    const name = `Design ${String.fromCharCode(65 + i)}`
    if (!used.has(name)) return name
  }
  return `Design ${saved.length + 1}`
}

export const useStore = create<State>()((set, get) => ({
  config: defaultConfiguration(),
  activeGroup: 'sofa',
  hoveredGroup: null,
  view: { id: 'overview', nonce: 0 },
  saved: loadSavedDesigns(),
  compare: null,
  dialog: null,
  toasts: [],
  scene: { status: 'loading', pending: false, failed: [] },
  rendered: null,

  selectOption: (group, id) => {
    if (!isValidOption(group, id)) return
    const { config, compare } = get()
    if (config[group] === id) return
    if (compare) {
      // Editing while comparing: continue from the variant on screen; both saved designs stay untouched.
      set({ compare: null })
      get().toast('info', 'Comparison closed', 'You’re now editing a copy — your saved designs are unchanged.')
    }
    set({ config: { ...get().config, [group]: id }, activeGroup: group })
  },

  setActiveGroup: (group, opts) => {
    set({ activeGroup: group })
    if (opts?.focus) get().requestView(group)
  },
  setHoveredGroup: (group) => set({ hoveredGroup: group }),
  requestView: (id) => set((s) => ({ view: { id, nonce: s.view.nonce + 1 } })),
  applyConfig: (config) => set({ config }),

  saveCurrent: (name) => {
    const { saved, config } = get()
    if (saved.length >= MAX_SAVED) {
      get().toast('error', 'Design list is full', `You can keep up to ${MAX_SAVED} designs — delete one to save another.`)
      return null
    }
    const duplicate = saved.find((d) => isSameConfiguration(d.config, config))
    if (duplicate) {
      get().toast('info', `Already saved as “${duplicate.name}”`, 'Change an option to save a new variant.')
      return duplicate
    }
    const design: SavedDesign = {
      id: newId(),
      name: cleanName(name ?? '', nextLetter(saved)),
      config: { ...config },
      savedAt: new Date().toISOString(),
    }
    const next = [design, ...saved]
    const persisted = storeSavedDesigns(next)
    set({ saved: next })
    if (persisted) get().toast('success', `Saved as “${design.name}”`, 'Stored in this browser. Save another to compare.')
    else get().toast('error', 'Saved for this session only', 'This browser blocked local storage, so it won’t survive a reload.')
    return design
  },

  renameDesign: (id, name) => {
    const next = get().saved.map((d) => (d.id === id ? { ...d, name: cleanName(name, d.name) } : d))
    storeSavedDesigns(next)
    set({ saved: next })
  },

  deleteDesign: (id) => {
    const { saved, compare } = get()
    const next = saved.filter((d) => d.id !== id)
    storeSavedDesigns(next)
    set({ saved: next })
    if (compare && (compare.aId === id || compare.bId === id)) get().endCompare(false)
  },

  restoreDesign: (id) => {
    const design = get().saved.find((d) => d.id === id)
    if (!design) return
    set({ config: { ...design.config }, compare: null })
    get().toast('success', `Restored “${design.name}”`)
  },

  startCompare: (aId, bId) => {
    const { saved, config } = get()
    const a = saved.find((d) => d.id === aId)
    const b = saved.find((d) => d.id === bId)
    if (!a || !b || aId === bId) return
    set({ compare: { aId, bId, showing: 'a', returnTo: { ...config } }, config: { ...a.config }, dialog: null })
  },

  showCompareSide: (side) => {
    const { compare, saved } = get()
    if (!compare) return
    const design = saved.find((d) => d.id === (side === 'a' ? compare.aId : compare.bId))
    if (!design) return
    set({ compare: { ...compare, showing: side }, config: { ...design.config } })
  },

  endCompare: (keep) => {
    const { compare } = get()
    if (!compare) return
    set({ compare: null, config: keep ? get().config : compare.returnTo })
    if (keep) get().toast('success', 'Continuing with this variant', 'Edit freely — your saved designs are unchanged.')
  },

  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  toast: (tone, title, body) => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, tone, title, body }] }))
    setTimeout(() => get().dismissToast(id), tone === 'error' ? 8000 : 4500)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setSceneStatus: (status) => set((s) => ({ scene: { ...s.scene, status } })),
  setScenePending: (pending) => set((s) => ({ scene: { ...s.scene, pending } })),
  setRendered: (rendered) => set({ rendered }),
  reportAssetFailure: (optionId) =>
    set((s) => (s.scene.failed.includes(optionId) ? s : { scene: { ...s.scene, failed: [...s.scene.failed, optionId] } })),
}))

if (import.meta.env.DEV) {
  // Development-only handle for scripted visual checks; stripped from production builds.
  ;(window as unknown as { __store: typeof useStore }).__store = useStore
}
