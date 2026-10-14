import { useEffect, useMemo, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { interiorPoint } from '../../engine/geometry/polygon'
import { roomPolygon, sortedLevels } from '../../engine/model/query'
import type { Project } from '../../engine/model/types'
import { roomEntries } from '../../engine/walk'
import { planBounds } from '../scene/bounds'
import { presetPose } from '../scene/framing'
import { requestNavLock } from '../scene/useNavInput'
import { walkInput } from '../scene/walkInput'
import { QualityPicker } from './QualityPicker'
import { DEFAULT_NAV, useEditor, useProject } from '../store'
import { Icon } from './icons'

/* ---------- touch controls ---------- */

/** On-screen joystick (left), look pad (right) and, for the free camera, up/down buttons. */
function TouchControls({ fly }: { fly: boolean }) {
  const [stick, setStick] = useState<{ id: number; x: number; y: number } | null>(null)
  const [look, setLook] = useState<{ id: number; x: number; y: number } | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const R = 46

  const stickDown = (e: RPointerEvent) => {
    setStick({ id: e.pointerId, x: e.clientX, y: e.clientY })
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  const stickMove = (e: RPointerEvent) => {
    if (!stick || stick.id !== e.pointerId) return
    let dx = e.clientX - stick.x
    let dy = e.clientY - stick.y
    const m = Math.hypot(dx, dy)
    if (m > R) {
      dx = (dx / m) * R
      dy = (dy / m) * R
    }
    setKnob({ x: dx, y: dy })
    walkInput.move = { x: dx / R, y: -dy / R }
    walkInput.run = m > R * 1.4
  }
  const stickUp = () => {
    setStick(null)
    setKnob({ x: 0, y: 0 })
    walkInput.move = { x: 0, y: 0 }
    walkInput.run = false
  }
  const lookDown = (e: RPointerEvent) => {
    setLook({ id: e.pointerId, x: e.clientX, y: e.clientY })
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  const lookMove = (e: RPointerEvent) => {
    if (!look || look.id !== e.pointerId) return
    const s = useEditor.getState().nav.look
    walkInput.look.yaw -= (e.clientX - look.x) * 0.005 * s
    walkInput.look.pitch -= (e.clientY - look.y) * 0.005 * s
    setLook({ ...look, x: e.clientX, y: e.clientY })
  }
  const hold = (v: number) => ({
    onPointerDown: () => (walkInput.vertical = v),
    onPointerUp: () => (walkInput.vertical = 0),
    onPointerCancel: () => (walkInput.vertical = 0),
    onPointerLeave: () => (walkInput.vertical = 0),
  })

  return (
    <div className="[@media(hover:hover)]:hidden">
      <div
        className="pointer-events-auto absolute bottom-6 left-6 grid h-32 w-32 touch-none place-items-center rounded-full border border-white/40 bg-ink/25 backdrop-blur-sm"
        onPointerDown={stickDown}
        onPointerMove={stickMove}
        onPointerUp={stickUp}
        onPointerCancel={stickUp}
        aria-label="Move"
        role="application"
      >
        <span className="h-12 w-12 rounded-full bg-paper/90 shadow" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <div
        className="pointer-events-auto absolute top-16 right-0 bottom-0 w-1/2 touch-none"
        onPointerDown={lookDown}
        onPointerMove={lookMove}
        onPointerUp={() => setLook(null)}
        onPointerCancel={() => setLook(null)}
        aria-label="Look around"
        role="application"
      />
      {fly && (
        <div className="pointer-events-auto absolute right-5 bottom-6 flex flex-col gap-2">
          <button type="button" className="h-12 w-12 touch-none rounded-full bg-paper/90 text-[12px] font-semibold shadow" aria-label="Fly up" {...hold(1)}>
            Up
          </button>
          <button type="button" className="h-12 w-12 touch-none rounded-full bg-paper/90 text-[12px] font-semibold shadow" aria-label="Fly down" {...hold(-1)}>
            Down
          </button>
        </div>
      )}
    </div>
  )
}

/* ---------- menus ---------- */

function Popover({ label, icon, children, align = 'left', testId }: { label: string; icon: Parameters<typeof Icon>[0]['name']; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; testId?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button type="button" className="btn h-9 bg-paper/90 px-3.5 text-[12.5px] text-ink shadow hover:bg-paper" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" data-testid={testId}>
        <Icon name={icon} size={15} /> <span className="hidden sm:inline">{label}</span>
        <span className="sr-only sm:hidden">{label}</span>
      </button>
      {open && <div className={`absolute top-11 ${align === 'left' ? 'left-0' : 'right-0'} z-20 w-60 rounded-xl bg-paper p-1.5 shadow-xl`}>{children(() => setOpen(false))}</div>}
    </div>
  )
}

function Slider({ label, value, min, max, step, onChange, format, testId }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string; testId: string }) {
  return (
    <label className="block px-2 py-1.5">
      <span className="flex justify-between text-[12px]">
        <span>{label}</span>
        <span className="font-mono text-mute">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-ink" data-testid={testId} />
    </label>
  )
}

function SettingsMenu() {
  const nav = useEditor((s) => s.nav)
  const setNav = useEditor((s) => s.setNav)
  return (
    <Popover label="Settings" icon="settings" align="right" testId="nav-settings">
      {() => (
        <div role="group" aria-label="Navigation settings">
          <Slider label="Look sensitivity" value={nav.look} min={0.3} max={3} step={0.1} onChange={(look) => setNav({ look })} format={(v) => `${v.toFixed(1)}×`} testId="nav-look" />
          <Slider label="Walking speed" value={nav.walkSpeed} min={0.6} max={3} step={0.1} onChange={(walkSpeed) => setNav({ walkSpeed })} format={(v) => `${v.toFixed(1)} m/s`} testId="nav-walk-speed" />
          <Slider label="Free-camera speed" value={nav.flySpeed} min={0.5} max={20} step={0.5} onChange={(flySpeed) => setNav({ flySpeed })} format={(v) => `${v.toFixed(1)} m/s`} testId="nav-fly-speed" />
          <label className="flex items-center justify-between px-2 py-1.5 text-[12px]">
            Invert vertical look
            <input type="checkbox" checked={nav.invertY} onChange={(e) => setNav({ invertY: e.target.checked })} className="accent-ink" />
          </label>
          <QualityPicker />
          <button type="button" className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-[12px] text-mute hover:bg-linen" onClick={() => setNav({ ...DEFAULT_NAV, quality: nav.quality })}>
            Reset navigation
          </button>
        </div>
      )}
    </Popover>
  )
}

/** Viewpoints for the free camera: aerial, street-level elevations and a high corner inside each room. */
function flyViewpoints(p: Project) {
  const b = planBounds(p)
  const levels = sortedLevels(p)
  const top = levels[levels.length - 1]
  const height = top ? top.elevation + top.height : 2.7
  const toLook = (from: [number, number, number], to: [number, number, number]) => {
    const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
    return { yaw: Math.atan2(-d[0], -d[2]), pitch: Math.atan2(d[1], Math.hypot(d[0], d[2])) }
  }
  const aerial = presetPose(b, height, 1.6, 'overview')
  const cx = (b.x0 + b.x1) / 2
  const cz = (b.y0 + b.y1) / 2
  const views: { id: string; name: string; pos: [number, number, number]; yaw: number; pitch: number }[] = [
    { id: 'aerial', name: 'Aerial overview', pos: aerial.position, ...toLook(aerial.position, aerial.target) },
    { id: 'front', name: 'Street view (front)', pos: [cx, 1.7, b.y1 + 7], ...toLook([cx, 1.7, b.y1 + 7], [cx, 1.6, cz]) },
    { id: 'back', name: 'Garden view (back)', pos: [cx, 1.7, b.y0 - 7], ...toLook([cx, 1.7, b.y0 - 7], [cx, 1.6, cz]) },
  ]
  for (const r of levels.flatMap((l) => Object.values(p.rooms).filter((r) => r.level === l.id))) {
    const y0 = p.levels[r.level].elevation
    const poly = roomPolygon(p, r)
    const c = interiorPoint(poly)
    // a high viewpoint 30 cm in from the corner farthest from the room's interior point
    const far = poly.reduce((a, q) => (Math.hypot(q.x - c.x, q.y - c.y) > Math.hypot(a.x - c.x, a.y - c.y) ? q : a), poly[0])
    const L = Math.hypot(far.x - c.x, far.y - c.y) || 1
    const pos: [number, number, number] = [far.x + ((c.x - far.x) / L) * 0.45, y0 + 2.2, far.y + ((c.y - far.y) / L) * 0.45]
    views.push({ id: r.id, name: `Inside: ${r.name}`, pos, ...toLook(pos, [c.x, y0 + 0.8, c.y]) })
  }
  return views
}

/* ---------- HUD ---------- */

/**
 * Overlay for the immersive modes. Desktop: click the scene (or the prompt) to capture the mouse;
 * Esc releases it, Esc again returns to the editor. The mode switch keeps walk and fly one click apart.
 */
export function NavHud() {
  const project = useProject()
  const mode = useEditor((s) => s.camera)
  const room = useEditor((s) => s.walk.room)
  const locked = useEditor((s) => s.pointerLocked)
  const { exitWalk, walkTo, enterWalk, enterFly, flyToView } = useEditor.getState()
  const fly = mode === 'fly'
  const [help, setHelp] = useState(true)
  const [fullscreen, setFullscreen] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement)
  // every room on every floor, grouped by floor when there is more than one
  const floors = useMemo(() => sortedLevels(project).map((l) => ({ level: l, rooms: roomEntries(project, l.id) })), [project])
  const viewpoints = useMemo(() => (fly ? flyViewpoints(project) : []), [fly, project])

  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  // leaving the immersive mode leaves browser full screen too
  useEffect(
    () => () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined)
    },
    [],
  )
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined)
    else document.documentElement.requestFullscreen?.().catch(() => undefined)
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none" data-testid={fly ? 'fly-hud' : 'walk-hud'} data-mode={mode} data-locked={locked}>
      {/* top bar: exit, mode, places, settings */}
      <div className={`pointer-events-auto absolute top-3 left-3 flex flex-wrap items-center gap-2 transition-opacity ${locked ? 'opacity-40' : ''}`}>
        <button type="button" className="btn h-9 bg-ink px-3.5 text-[12.5px] text-paper hover:bg-ink-soft" onClick={exitWalk} title="Back to the editor (Esc)">
          <Icon name="close" size={15} /> {fly ? 'Exit free camera' : 'Exit walkthrough'}
        </button>
        <div className="flex rounded-full bg-paper/90 p-0.5 shadow" role="group" aria-label="Camera mode">
          <button type="button" aria-pressed={!fly} onClick={() => !fly || enterWalk()} className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium ${!fly ? 'bg-ink text-paper' : 'text-ink-soft'}`}>
            <Icon name="walk" size={14} /> Walk
          </button>
          <button type="button" aria-pressed={fly} onClick={() => fly || enterFly()} className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium ${fly ? 'bg-ink text-paper' : 'text-ink-soft'}`}>
            <Icon name="fly" size={14} /> Fly
          </button>
        </div>
        {fly ? (
          <Popover label="Viewpoints" icon="eye" testId="fly-viewpoints">
            {(close) => (
              <ul role="menu" className="max-h-[60vh] overflow-y-auto">
                {viewpoints.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-linen"
                      onClick={() => {
                        flyToView(v.pos, v.yaw, v.pitch)
                        close()
                      }}
                    >
                      {v.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Popover>
        ) : (
          <Popover label="Go to room" icon="layers">
            {(close) => (
              <ul role="menu" className="max-h-[60vh] overflow-y-auto">
                {floors.map(({ level: l, rooms }) => (
                  <li key={l.id} role="none">
                    {floors.length > 1 && <p className="eyebrow px-2.5 pt-1.5 pb-0.5">{l.name}</p>}
                    <ul role="none">
                      {rooms.map((t) => (
                        <li key={t.id} role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className="block w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-linen"
                            onClick={() => {
                              walkTo(t.at.x, t.at.y, t.yaw, l.id)
                              close()
                            }}
                          >
                            {t.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Popover>
        )}
      </div>
      <div className={`pointer-events-auto absolute top-3 right-3 flex items-center gap-2 transition-opacity ${locked ? 'opacity-40' : ''}`}>
        <SettingsMenu />
        <button type="button" className="btn h-9 w-9 bg-paper/90 px-0 text-ink shadow" onClick={toggleFullscreen} aria-pressed={fullscreen} aria-label={fullscreen ? 'Leave full screen' : 'Full screen'} title={fullscreen ? 'Leave full screen' : 'Full screen'}>
          <Icon name="expand" size={15} />
        </button>
      </div>

      {/* where you are */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-paper/85 px-4 py-1 font-display text-[19px] shadow sm:top-3" aria-live="polite" data-testid={fly ? 'fly-status' : 'walk-room'}>
        {fly ? (
          <span className="flex items-baseline gap-2">
            Free camera <span className="font-sans text-[11px] text-mute" data-testid="fly-height" />
          </span>
        ) : (
          (room ?? 'Outside')
        )}
      </div>

      {/* capture prompt (mouse devices) */}
      {!locked && (
        <div className="absolute inset-x-0 bottom-24 flex justify-center [@media(hover:none)]:hidden">
          <button type="button" className="pointer-events-auto rounded-full bg-ink/80 px-5 py-2.5 text-[13px] text-paper shadow-lg backdrop-blur-sm hover:bg-ink" onClick={requestNavLock} data-testid="nav-capture">
            Click to look around — <b>Esc</b> releases the mouse, <b>Esc</b> again exits
          </button>
        </div>
      )}

      {/* controls legend */}
      <div className="pointer-events-auto absolute right-3 bottom-3 [@media(hover:none)]:hidden">
        {help ? (
          <div className="w-64 rounded-xl bg-ink/75 p-3 text-[11.5px] leading-relaxed text-paper backdrop-blur-sm" data-testid="nav-help">
            <div className="mb-1 flex items-center justify-between">
              <b className="text-[12px]">{fly ? 'Free camera' : 'Walking'}</b>
              <button type="button" onClick={() => setHelp(false)} className="opacity-70 hover:opacity-100" aria-label="Hide controls">
                <Icon name="close" size={13} />
              </button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3">
              <dt className="font-semibold">Mouse</dt>
              <dd>look around (click first)</dd>
              <dt className="font-semibold">W A S D</dt>
              <dd>{fly ? 'fly where you look / strafe' : 'walk / strafe'}</dd>
              {fly && (
                <>
                  <dt className="font-semibold">E / Q</dt>
                  <dd>up / down (also Space / C)</dd>
                  <dt className="font-semibold">Wheel</dt>
                  <dd>slower / faster</dd>
                </>
              )}
              <dt className="font-semibold">Shift</dt>
              <dd>{fly ? 'fast' : 'hurry'}</dd>
              <dt className="font-semibold">← →</dt>
              <dd>turn</dd>
              <dt className="font-semibold">Esc</dt>
              <dd>release mouse · again to exit</dd>
            </dl>
          </div>
        ) : (
          <button type="button" className="btn h-9 bg-ink/75 px-3 text-[12px] text-paper" onClick={() => setHelp(true)} aria-label="Show controls">
            <Icon name="keyboard" size={15} /> Controls
          </button>
        )}
      </div>

      <TouchControls fly={fly} />
      {/* crosshair while the mouse is captured */}
      {locked && <span className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper/80 ring-1 ring-ink/40" />}
    </div>
  )
}
