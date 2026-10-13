import { useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { roomCentres } from '../../engine/walk'
import { walkInput } from '../scene/walkInput'
import { useEditor, useProject } from '../store'
import { Icon } from './icons'

/** On-screen joystick (left) and look pad (right) for touch devices. */
function TouchControls() {
  const stick = useRef<{ id: number; x: number; y: number } | null>(null)
  const look = useRef<{ id: number; x: number; y: number } | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const R = 46

  const stickDown = (e: RPointerEvent) => {
    stick.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  const stickMove = (e: RPointerEvent) => {
    const s = stick.current
    if (!s || s.id !== e.pointerId) return
    let dx = e.clientX - s.x
    let dy = e.clientY - s.y
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
    stick.current = null
    setKnob({ x: 0, y: 0 })
    walkInput.move = { x: 0, y: 0 }
    walkInput.run = false
  }
  const lookDown = (e: RPointerEvent) => {
    look.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  const lookMove = (e: RPointerEvent) => {
    const l = look.current
    if (!l || l.id !== e.pointerId) return
    walkInput.look.yaw -= (e.clientX - l.x) * 0.005
    walkInput.look.pitch -= (e.clientY - l.y) * 0.005
    l.x = e.clientX
    l.y = e.clientY
  }

  return (
    <>
      <div
        className="pointer-events-auto absolute bottom-6 left-6 grid h-32 w-32 touch-none place-items-center rounded-full border border-white/40 bg-ink/25 backdrop-blur-sm [@media(hover:hover)]:hidden"
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
        className="pointer-events-auto absolute top-16 right-0 bottom-0 w-1/2 touch-none [@media(hover:hover)]:hidden"
        onPointerDown={lookDown}
        onPointerMove={lookMove}
        onPointerUp={() => (look.current = null)}
        onPointerCancel={() => (look.current = null)}
        aria-label="Look around"
        role="application"
      />
    </>
  )
}

export function WalkHud() {
  const project = useProject()
  const level = useEditor((s) => s.level)
  const room = useEditor((s) => s.walk.room)
  const { exitWalk, walkTo } = useEditor.getState()
  const [rooms, setRooms] = useState(false)
  const targets = roomCentres(project, level)
  return (
    <div className="pointer-events-none absolute inset-0 z-10" data-testid="walk-hud">
      <div className="pointer-events-auto absolute top-3 left-3 flex items-center gap-2">
        <button type="button" className="btn h-9 bg-ink px-3.5 text-[12.5px] text-paper hover:bg-ink-soft" onClick={exitWalk}>
          <Icon name="close" size={15} /> Exit walkthrough
        </button>
        <div className="relative">
          <button type="button" className="btn h-9 bg-paper/90 px-3.5 text-[12.5px] text-ink shadow" onClick={() => setRooms((r) => !r)} aria-expanded={rooms}>
            <Icon name="layers" size={15} /> Go to room
          </button>
          {rooms && (
            <ul className="absolute top-10 left-0 w-52 rounded-xl bg-paper p-1 shadow-xl" role="menu">
              {targets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-linen"
                    onClick={() => {
                      walkTo(t.at.x, t.at.y)
                      setRooms(false)
                    }}
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-paper/90 px-4 py-1.5 font-display text-[19px] shadow" aria-live="polite" data-testid="walk-room">
        {room ?? 'Outside'}
      </div>
      <p className="absolute right-3 bottom-3 rounded-xl bg-ink/70 px-3 py-2 text-[11.5px] leading-relaxed text-paper [@media(hover:none)]:hidden">
        <b>W A S D</b> / arrows to move · <b>Shift</b> to hurry · click &amp; move the mouse to look · <b>Esc</b> to release / exit
      </p>
      <TouchControls />
      {/* crosshair */}
      <span className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper/80 ring-1 ring-ink/40" />
    </div>
  )
}
