import { useProgress } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { GROUPS, STUDIO, TEMPLATE } from '../domain/catalog'
import { PRESET_VIEWS, VIEWS } from '../scene/views'
import { useStore } from '../state/store'
import { Icon, Spinner, type IconName } from './Icon'

const VIEW_ICONS: Record<string, IconName> = { overview: 'home', window: 'window', plan: 'plan' }

export function ViewControls() {
  const requestView = useStore((s) => s.requestView)
  const current = useStore((s) => s.view.id)
  return (
    <div className="pointer-events-auto flex gap-1 rounded-full bg-paper/85 p-1 shadow-[0_8px_24px_-12px_rgba(35,32,28,0.45)] backdrop-blur-md" role="group" aria-label="Camera views">
      {PRESET_VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => requestView(v)}
          aria-pressed={current === v}
          className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors ${
            current === v ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-linen hover:text-ink'
          }`}
        >
          <Icon name={VIEW_ICONS[v]} size={15} />
          <span className="hidden sm:inline">{VIEWS[v].label}</span>
          <span className="sr-only sm:hidden">{VIEWS[v].label}</span>
        </button>
      ))}
    </div>
  )
}

/** Small status chip: what's under the cursor, or what's loading. */
export function StatusChip() {
  const hovered = useStore((s) => s.hoveredGroup)
  const pending = useStore((s) => s.scene.pending)
  const [hint, setHint] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setHint(false), 9000)
    return () => clearTimeout(t)
  }, [])

  let content: React.ReactNode = null
  if (pending)
    content = (
      <>
        <Spinner /> Updating the room…
      </>
    )
  else if (hovered)
    content = (
      <>
        <Icon name="cursor" size={14} /> {GROUPS[hovered].label} — click to change
      </>
    )
  else if (hint)
    content = (
      <>
        <Icon name="cursor" size={14} />
        <span className="hidden sm:inline">Drag to look around · scroll or pinch to zoom · click a piece to change it</span>
        <span className="sm:hidden">Drag to look · pinch to zoom · tap a piece</span>
      </>
    )

  return (
    <div aria-live="polite" className="flex min-h-9 justify-center">
      {content && (
        <span className="flex items-center gap-2 rounded-full bg-ink/80 px-3.5 py-2 text-[12px] text-paper shadow-lg backdrop-blur-md">
          {content}
        </span>
      )}
    </div>
  )
}

export function Loader() {
  const status = useStore((s) => s.scene.status)
  const { progress, errors } = useProgress()
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (status === 'ready') {
      const t = setTimeout(() => setGone(true), 700)
      return () => clearTimeout(t)
    }
  }, [status])
  if (gone || status === 'unsupported') return null
  const pct = Math.round(progress)
  return (
    <div
      className={`absolute inset-0 z-10 grid place-items-center bg-paper transition-opacity duration-700 ${status === 'ready' ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      role="status"
      aria-live="polite"
    >
      <div className="w-[min(320px,80%)] text-center">
        <p className="eyebrow">{STUDIO.name}</p>
        <p className="mt-2 font-display text-[34px] leading-tight">
          Setting the scene<span className="text-bronze">…</span>
        </p>
        <div className="mt-6 h-[3px] overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${Math.max(6, pct)}%` }} />
        </div>
        <p className="mt-3 text-[12px] text-mute">
          {errors.length > 0 ? 'Some assets failed to load — the room will open without them.' : `Loading furniture and finishes · ${pct}%`}
        </p>
      </div>
    </div>
  )
}

export function UnsupportedNotice() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-linen p-6 text-center">
      <div className="max-w-sm">
        <Icon name="alert" size={28} className="mx-auto text-bronze" />
        <p className="mt-3 font-display text-[26px] leading-tight">The 3D room can’t be shown here</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
          This browser or device doesn’t support WebGL, or it’s switched off. You can still review every option, save designs and send your
          brief — try a recent Chrome, Safari, Edge or Firefox to see the room.
        </p>
      </div>
    </div>
  )
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dialog = useStore((s) => s.dialog)
  const dismiss = useStore((s) => s.dismissToast)
  const ref = useRef<HTMLDivElement>(null)

  // Modal <dialog>s live in the browser's top layer, above any z-index. Showing the toast region as a
  // manual popover puts it in the top layer too; re-showing it moves it above a newly opened dialog.
  useEffect(() => {
    const el = ref.current
    if (!el || typeof el.showPopover !== 'function') return
    try {
      if (el.matches(':popover-open')) el.hidePopover()
      if (toasts.length) el.showPopover()
    } catch {
      /* popover unsupported: falls back to a fixed-position region */
    }
  }, [toasts, dialog])

  return (
    <div
      ref={ref}
      popover="manual"
      className="pointer-events-none fixed inset-x-0 top-3 bottom-auto z-50 m-0 flex h-auto w-full max-w-none flex-col items-center gap-2 overflow-visible border-0 bg-transparent px-3 py-0 text-ink [&:not(:popover-open)]:flex"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex w-full max-w-sm animate-[toast-in_320ms_var(--ease-soft)] items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_16px_40px_-18px_rgba(35,32,28,0.55)] backdrop-blur-md ${
            t.tone === 'error' ? 'border-danger/30 bg-[#fbefec]/95' : 'border-line bg-paper/95'
          }`}
        >
          <span
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
              t.tone === 'error' ? 'bg-danger text-paper' : t.tone === 'success' ? 'bg-sage text-paper' : 'bg-ink/80 text-paper'
            }`}
          >
            <Icon name={t.tone === 'error' ? 'alert' : t.tone === 'success' ? 'check' : 'info'} size={12} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">{t.title}</p>
            {t.body && <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{t.body}</p>}
          </div>
          <button type="button" onClick={() => dismiss(t.id)} className="-mr-1 text-mute hover:text-ink" aria-label="Dismiss notification">
            <Icon name="close" size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function MobileTitle() {
  const openDialog = useStore((s) => s.openDialog)
  return (
    <div className="pointer-events-auto flex items-start justify-between gap-3 lg:hidden">
      <div className="rounded-2xl bg-paper/85 px-3.5 py-2 backdrop-blur-md">
        <p className="eyebrow text-[9.5px]">{STUDIO.name}</p>
        <p className="font-display text-[20px] leading-tight">{TEMPLATE.name}</p>
      </div>
      <button type="button" onClick={() => openDialog('about')} className="grid h-9 w-9 place-items-center rounded-full bg-paper/85 backdrop-blur-md" aria-label="About this demo and credits">
        <Icon name="info" size={17} />
      </button>
    </div>
  )
}
