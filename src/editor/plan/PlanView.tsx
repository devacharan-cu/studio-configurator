import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { getAsset } from '../../engine/assets/catalog'
import { addItem, addOpening, moveItem, moveOpening, rotateItem } from '../../engine/commands/elements'
import { createRoom, itemCorners, moveNode, moveWall } from '../../engine/commands/structure'
import { closestOnSegment, dot, sub, type V2 } from '../../engine/geometry/vec'
import { openingCenter, wallOutline, wallSides } from '../../engine/geometry/walls'
import { fmtArea, fmtLen, roomMetrics } from '../../engine/metrics'
import { nodePos, roomPolygon, wallFrame } from '../../engine/model/query'
import type { Id, Opening, Project } from '../../engine/model/types'
import { currentProject, useEditor, useProject, type Selection } from '../store'
import { GRID, snapLength, snapPoint, type SnapResult } from './snap'

const ROOM_FILL: Record<string, string> = {
  living: '#efe6d8',
  dining: '#efe6d8',
  kitchen: '#e9e5dc',
  bedroom: '#e7e9e0',
  bathroom: '#e1e8ea',
  hall: '#f1ece4',
  study: '#efe3da',
  utility: '#e8e6e3',
  storage: '#e8e6e3',
  other: '#eeebe6',
}

type Drag =
  | { kind: 'pan'; start: V2; view: View; moved: boolean }
  | { kind: 'wall'; id: Id; start: V2; base: Project; normal: V2 }
  | { kind: 'node'; id: Id; base: Project }
  | { kind: 'opening'; id: Id; base: Project; grab: number }
  | { kind: 'item'; id: Id; base: Project; offset: V2 }
  | { kind: 'rotate'; id: Id; base: Project }
  | { kind: 'draw'; start: V2 }

interface View {
  x: number // plan coordinate at the left edge
  y: number // plan coordinate at the top edge
  s: number // pixels per metre
}

const pt = (p: V2) => `${p.x},${p.y}`

/** Fit the building into the viewport with a margin. */
function fitView(p: Project, level: Id, w: number, h: number): View {
  const nodes = Object.values(p.nodes).filter((n) => n.level === level)
  if (!nodes.length) return { x: -2, y: -2, s: Math.min(w, h) / 14 }
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const s = Math.min((w - 120) / Math.max(1, x1 - x0), (h - 120) / Math.max(1, y1 - y0))
  return { s, x: (x0 + x1) / 2 - w / 2 / s, y: (y0 + y1) / 2 - h / 2 / s }
}

export function PlanView() {
  const project = useProject()
  const level = useEditor((s) => s.level)
  const tool = useEditor((s) => s.tool)
  const placeAsset = useEditor((s) => s.placeAsset)
  const selection = useEditor((s) => s.selection)
  const hover = useEditor((s) => s.hover)
  const previewError = useEditor((s) => s.previewError)
  const { select, setHover, run, setPreview, commitPreview, cancelPreview } = useEditor.getState()

  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState<View | null>(null)
  const drag = useRef<Drag | null>(null)
  const [cursor, setCursor] = useState<V2 | null>(null)
  const [draw, setDraw] = useState<{ a: V2; b: V2 } | null>(null)
  const [guides, setGuides] = useState<SnapResult['guides']>([])

  // Track size; fit on first layout.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setSize({ w: width, h: height })
      setView((v) => v ?? fitView(currentProject(), useEditor.getState().level, width, height))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const v = view ?? { x: 0, y: 0, s: 50 }
  const toPlan = (e: { clientX: number; clientY: number }): V2 => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: v.x + (e.clientX - r.left) / v.s, y: v.y + (e.clientY - r.top) / v.s }
  }
  const tol = 10 / v.s // 10 px snapping tolerance, in metres

  const walls = useMemo(() => Object.values(project.walls).filter((w) => w.level === level), [project, level])
  const rooms = useMemo(() => Object.values(project.rooms).filter((r) => r.level === level), [project, level])
  const items = useMemo(() => Object.values(project.items).filter((i) => i.level === level), [project, level])
  const outlines = useMemo(() => new Map(walls.map((w) => [w.id, wallOutline(project, w)])), [walls, project])
  const sides = useMemo(() => wallSides(project), [project])

  /* ---------- wheel zoom (around the cursor) ---------- */
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setView((cur) => {
        if (!cur) return cur
        const r = el.getBoundingClientRect()
        const px = e.clientX - r.left
        const py = e.clientY - r.top
        const k = Math.exp(-e.deltaY * 0.0015)
        const s = Math.min(400, Math.max(8, cur.s * k))
        const mx = cur.x + px / cur.s
        const my = cur.y + py / cur.s
        return { s, x: mx - px / s, y: my - py / s }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  /* ---------- tool helpers ---------- */
  const nearestWall = (q: V2) => {
    let best: { id: Id; offset: number; d: number } | null = null
    for (const w of walls) {
      const { a, b } = { a: nodePos(project, w.a), b: nodePos(project, w.b) }
      const c = closestOnSegment(q, a, b)
      if (c.distance < Math.max(w.thickness, 0.3) && (!best || c.distance < best.d)) best = { id: w.id, offset: c.t * Math.hypot(b.x - a.x, b.y - a.y), d: c.distance }
    }
    return best
  }

  /* ---------- pointer handling ---------- */
  const onDown = (e: RPointerEvent, target?: Selection & { grab?: 'rotate' }) => {
    if (e.button === 1 || e.button === 2) return startPan(e)
    const q = toPlan(e)
    const p = currentProject()

    if (tool === 'room') {
      const s = snapPoint(p, level, q, tol)
      drag.current = { kind: 'draw', start: s.point }
      setDraw({ a: s.point, b: s.point })
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
      e.stopPropagation()
      return
    }
    if (tool === 'door' || tool === 'window' || tool === 'passage') {
      const hit = nearestWall(q)
      if (!hit) return useEditor.getState().notify('info', `Click on a wall to add a ${tool}`)
      if (run(addOpening(p, { wall: hit.id, kind: tool, offset: snapLength(hit.offset) }))) {
        const created = Object.values(currentProject().openings).find((o) => !p.openings[o.id])
        if (created) select({ kind: 'opening', id: created.id })
      }
      e.stopPropagation()
      return
    }
    if (tool === 'place' && placeAsset) {
      const s = { x: snapLength(q.x), y: snapLength(q.y) }
      if (run(addItem(p, { asset: placeAsset, level, x: s.x, y: s.y, rotation: 0 }))) {
        const created = Object.values(currentProject().items).find((i) => !p.items[i.id])
        if (created) select({ kind: 'item', id: created.id })
        useEditor.getState().setTool('select')
      }
      e.stopPropagation()
      return
    }

    if (!target) {
      select(null)
      return startPan(e)
    }
    e.stopPropagation()
    select(target.kind === 'node' ? useEditor.getState().selection : target)
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    if (target.grab === 'rotate') drag.current = { kind: 'rotate', id: target.id, base: p }
    else if (target.kind === 'wall') drag.current = { kind: 'wall', id: target.id, start: q, base: p, normal: wallFrame(p, p.walls[target.id]).normal }
    else if (target.kind === 'node') drag.current = { kind: 'node', id: target.id, base: p }
    else if (target.kind === 'opening') {
      const o = p.openings[target.id]
      const { a, dir } = wallFrame(p, p.walls[o.wall])
      drag.current = { kind: 'opening', id: o.id, base: p, grab: dot(sub(q, a), dir) - o.offset }
    } else if (target.kind === 'item') {
      const it = p.items[target.id]
      drag.current = { kind: 'item', id: it.id, base: p, offset: { x: q.x - it.x, y: q.y - it.y } }
    }
  }

  const startPan = (e: RPointerEvent) => {
    drag.current = { kind: 'pan', start: { x: e.clientX, y: e.clientY }, view: v, moved: false }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }

  const onMove = (e: RPointerEvent) => {
    const q = toPlan(e)
    setCursor(q)
    const d = drag.current
    if (!d) {
      if (tool === 'room') setGuides(snapPoint(currentProject(), level, q, tol).guides)
      return
    }
    switch (d.kind) {
      case 'pan': {
        const dx = (e.clientX - d.start.x) / d.view.s
        const dy = (e.clientY - d.start.y) / d.view.s
        if (Math.abs(dx) + Math.abs(dy) > 0.01) d.moved = true
        setView({ ...d.view, x: d.view.x - dx, y: d.view.y - dy })
        break
      }
      case 'draw': {
        const s = snapPoint(currentProject(), level, q, tol)
        setGuides(s.guides)
        setDraw({ a: d.start, b: s.point })
        break
      }
      case 'wall': {
        const dist = snapLength(dot(sub(q, d.start), d.normal))
        setPreview(dist === 0 ? null : moveWall(d.base, { wall: d.id, distance: dist }))
        break
      }
      case 'node': {
        const s = snapPoint(d.base, level, q, tol, new Set([d.id]))
        setGuides(s.guides)
        setPreview(moveNode(d.base, { node: d.id, x: s.point.x, y: s.point.y }))
        break
      }
      case 'opening': {
        const o = d.base.openings[d.id]
        const { a, dir } = wallFrame(d.base, d.base.walls[o.wall])
        setPreview(moveOpening(d.base, { opening: d.id, offset: snapLength(dot(sub(q, a), dir) - d.grab) }))
        break
      }
      case 'item': {
        setPreview(moveItem(d.base, { item: d.id, x: snapLength(q.x - d.offset.x), y: snapLength(q.y - d.offset.y) }))
        break
      }
      case 'rotate': {
        const it = d.base.items[d.id]
        // handle sits in front of the item (+y at rotation 0); angle measured accordingly, snapped to 15°
        const ang = Math.atan2(q.x - it.x, q.y - it.y)
        const step = Math.PI / 12
        setPreview(rotateItem(d.base, { item: d.id, rotation: e.shiftKey ? ang : Math.round(ang / step) * step }))
        break
      }
    }
  }

  const onUp = () => {
    const d = drag.current
    drag.current = null
    setGuides([])
    if (!d) return
    if (d.kind === 'draw') {
      setDraw(null)
      const a = d.start
      const b = draw?.b ?? a
      if (Math.abs(b.x - a.x) < GRID * 2 || Math.abs(b.y - a.y) < GRID * 2) return
      const p = currentProject()
      const count = Object.values(p.rooms).filter((r) => r.level === level).length
      const ok = run(
        createRoom(p, {
          level,
          points: [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }],
          name: `Room ${count + 1}`,
        }),
      )
      if (ok) {
        const created = Object.values(currentProject().rooms).find((r) => !p.rooms[r.id])
        if (created) select({ kind: 'room', id: created.id })
      }
      return
    }
    if (d.kind === 'pan') return
    const labels = { wall: 'Move wall', node: 'Move corner', opening: 'Move opening', item: 'Move item', rotate: 'Rotate item' } as const
    commitPreview(labels[d.kind])
  }

  // Escape cancels an in-progress drag/draw.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drag.current) {
        drag.current = null
        setDraw(null)
        cancelPreview()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancelPreview])

  /* ---------- rendering ---------- */
  const isSel = (kind: string, id: Id) => selection?.kind === kind && selection.id === id
  const isHover = (kind: string, id: Id) => hover?.kind === kind && hover.id === id
  const px = (n: number) => n / v.s // screen pixels → metres
  const selectedRoom = selection?.kind === 'room' ? project.rooms[selection.id] : undefined
  const selectedWall = selection?.kind === 'wall' ? project.walls[selection.id] : undefined
  const handleNodes = new Set<Id>([
    ...(selectedRoom?.boundary ?? []),
    ...(selectedWall ? [selectedWall.a, selectedWall.b] : []),
  ])
  const ghostWall = (tool === 'door' || tool === 'window' || tool === 'passage') && cursor ? nearestWall(cursor) : null

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f7f5f1]" data-testid="plan-view">
      <svg
        ref={svgRef}
        className={`h-full w-full touch-none select-none ${tool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
        viewBox={`${v.x} ${v.y} ${size.w / v.s} ${size.h / v.s}`}
        onPointerDown={(e) => onDown(e)}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => setCursor(null)}
        onContextMenu={(e) => e.preventDefault()}
        role="application"
        aria-label="Floor plan editor"
      >
        <defs>
          <pattern id="grid-minor" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
            <path d="M 0.5 0 L 0 0 0 0.5" fill="none" stroke="#e6e1d8" strokeWidth={px(1)} />
          </pattern>
          <pattern id="grid-major" width="1" height="1" patternUnits="userSpaceOnUse">
            <rect width="1" height="1" fill="url(#grid-minor)" />
            <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#dcd5c9" strokeWidth={px(1)} />
          </pattern>
        </defs>
        <rect x={v.x} y={v.y} width={size.w / v.s} height={size.h / v.s} fill="url(#grid-major)" />

        {/* rooms */}
        {rooms.map((r) => {
          const poly = roomPolygon(project, r)
          return (
            <polygon
              key={r.id}
              points={poly.map(pt).join(' ')}
              fill={ROOM_FILL[r.type] ?? ROOM_FILL.other}
              stroke={isSel('room', r.id) ? '#8c5a3c' : 'none'}
              strokeWidth={px(3)}
              opacity={isHover('room', r.id) && !isSel('room', r.id) ? 0.75 : 1}
              data-room={r.name}
              onPointerDown={(e) => onDown(e, { kind: 'room', id: r.id })}
              onPointerEnter={() => setHover({ kind: 'room', id: r.id })}
              onPointerLeave={() => setHover(null)}
            />
          )
        })}

        {/* items */}
        {items.map((it) => {
          const a = getAsset(it.asset)
          const corners = itemCorners(it)
          const sel = isSel('item', it.id)
          const front = { x: it.x + Math.sin(it.rotation) * ((a?.footprint.d ?? 0.5) / 2 + px(14)), y: it.y + Math.cos(it.rotation) * ((a?.footprint.d ?? 0.5) / 2 + px(14)) }
          return (
            <g key={it.id} data-item={it.asset}>
              <polygon
                points={corners.map(pt).join(' ')}
                fill={a?.walkable ? 'rgba(140,90,60,0.08)' : sel ? 'rgba(140,90,60,0.28)' : 'rgba(80,70,60,0.14)'}
                stroke={sel ? '#8c5a3c' : '#9a8f82'}
                strokeWidth={px(sel ? 2 : 1)}
                strokeDasharray={a?.walkable ? `${px(4)} ${px(3)}` : undefined}
                className="cursor-move"
                onPointerDown={(e) => onDown(e, { kind: 'item', id: it.id })}
                onPointerEnter={() => setHover({ kind: 'item', id: it.id })}
                onPointerLeave={() => setHover(null)}
              />
              {/* front edge marker */}
              <line x1={corners[2].x} y1={corners[2].y} x2={corners[3].x} y2={corners[3].y} stroke={sel ? '#8c5a3c' : '#7f756a'} strokeWidth={px(2.5)} pointerEvents="none" />
              {sel && (
                <circle
                  cx={front.x}
                  cy={front.y}
                  r={px(7)}
                  fill="#fff"
                  stroke="#8c5a3c"
                  strokeWidth={px(2)}
                  className="cursor-grab"
                  data-handle="rotate"
                  onPointerDown={(e) => onDown(e, { kind: 'item', id: it.id, grab: 'rotate' })}
                />
              )}
            </g>
          )
        })}

        {/* walls */}
        {walls.map((w) => {
          const o = outlines.get(w.id)!
          const s = sides[w.id] ?? {}
          const exterior = !(s.left && s.right)
          return (
            <polygon
              key={w.id}
              points={o.footprint.map(pt).join(' ')}
              fill={isSel('wall', w.id) ? '#8c5a3c' : isHover('wall', w.id) ? '#4a443d' : exterior ? '#2b2724' : '#57504a'}
              className="cursor-move"
              data-wall={w.id}
              onPointerDown={(e) => onDown(e, { kind: 'wall', id: w.id })}
              onPointerEnter={() => setHover({ kind: 'wall', id: w.id })}
              onPointerLeave={() => setHover(null)}
            />
          )
        })}

        {/* openings */}
        {Object.values(project.openings)
          .filter((o) => project.walls[o.wall]?.level === level)
          .map((o) => (
            <OpeningSymbol
              key={o.id}
              project={project}
              o={o}
              selected={isSel('opening', o.id)}
              hovered={isHover('opening', o.id)}
              px={px}
              onDown={(e) => onDown(e, { kind: 'opening', id: o.id })}
            />
          ))}

        {/* wall dimensions (exterior side of selected/hovered wall, or all exterior walls when zoomed in) */}
        {walls.map((w) => {
          const show = isSel('wall', w.id) || isHover('wall', w.id) || (selectedRoom && selectedRoom.boundary.includes(w.a) && selectedRoom.boundary.includes(w.b))
          if (!show) return null
          const { a, b, normal, length } = wallFrame(project, w)
          const off = w.thickness / 2 + px(16)
          const m = { x: (a.x + b.x) / 2 + normal.x * off, y: (a.y + b.y) / 2 + normal.y * off }
          let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
          if (angle > 90 || angle < -90) angle += 180
          return (
            <g key={`dim-${w.id}`} pointerEvents="none">
              <text
                x={m.x}
                y={m.y}
                fontSize={px(11.5)}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${angle} ${m.x} ${m.y})`}
                className="fill-ink font-medium"
                stroke="#f7f5f1"
                strokeWidth={px(3)}
                paintOrder="stroke"
                data-dimension={w.id}
              >
                {fmtLen(length)}
              </text>
            </g>
          )
        })}

        {/* room labels */}
        {rooms.map((r) => {
          const m = roomMetrics(project, r.id)
          return (
            <g key={`lbl-${r.id}`} pointerEvents="none">
              <text x={m.labelAt.x} y={m.labelAt.y - px(7)} fontSize={px(13)} textAnchor="middle" className="fill-ink font-semibold" data-room-label={r.name}>
                {r.name}
              </text>
              <text x={m.labelAt.x} y={m.labelAt.y + px(9)} fontSize={px(11)} textAnchor="middle" className="fill-mute" data-room-area={r.name}>
                {fmtArea(m.netArea)}
              </text>
            </g>
          )
        })}

        {/* corner handles */}
        {[...handleNodes].map((id) => {
          const n = project.nodes[id]
          if (!n) return null
          return (
            <circle
              key={`h-${id}`}
              cx={n.x}
              cy={n.y}
              r={px(6.5)}
              fill="#fff"
              stroke="#8c5a3c"
              strokeWidth={px(2)}
              className="cursor-grab"
              data-node={id}
              onPointerDown={(e) => onDown(e, { kind: 'node', id })}
            />
          )
        })}

        {/* opening ghost */}
        {ghostWall && cursor && <OpeningGhost project={project} wall={ghostWall.id} offset={snapLength(ghostWall.offset)} kind={tool as Opening['kind']} px={px} />}

        {/* placement ghost */}
        {tool === 'place' && placeAsset && cursor && (
          <polygon
            points={itemCorners({ asset: placeAsset, x: snapLength(cursor.x), y: snapLength(cursor.y), rotation: 0 }).map(pt).join(' ')}
            fill="rgba(140,90,60,0.18)"
            stroke="#8c5a3c"
            strokeWidth={px(1.5)}
            strokeDasharray={`${px(5)} ${px(3)}`}
            pointerEvents="none"
          />
        )}

        {/* drawing preview */}
        {draw && (
          <g pointerEvents="none">
            <rect
              x={Math.min(draw.a.x, draw.b.x)}
              y={Math.min(draw.a.y, draw.b.y)}
              width={Math.abs(draw.b.x - draw.a.x)}
              height={Math.abs(draw.b.y - draw.a.y)}
              fill="rgba(140,90,60,0.12)"
              stroke="#8c5a3c"
              strokeWidth={px(2)}
              strokeDasharray={`${px(6)} ${px(4)}`}
            />
            <text x={(draw.a.x + draw.b.x) / 2} y={Math.min(draw.a.y, draw.b.y) - px(10)} fontSize={px(12)} textAnchor="middle" className="fill-bronze font-semibold">
              {fmtLen(Math.abs(draw.b.x - draw.a.x))} × {fmtLen(Math.abs(draw.b.y - draw.a.y))}
            </text>
          </g>
        )}
        {guides.map((g, i) => (
          <line key={i} x1={g.from.x} y1={g.from.y} x2={g.to.x} y2={g.to.y} stroke="#c0623c" strokeWidth={px(1)} strokeDasharray={`${px(4)} ${px(3)}`} pointerEvents="none" />
        ))}
      </svg>

      {/* status bar */}
      <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-2 text-[11px] text-mute">
        <span className="rounded-md bg-white/85 px-2 py-1 font-mono tabular-nums shadow-sm">
          {cursor ? `${cursor.x.toFixed(2)}, ${cursor.y.toFixed(2)} m` : '—'}
        </span>
        <span className="rounded-md bg-white/85 px-2 py-1 shadow-sm">grid 5 cm · {Math.round(v.s)} px/m</span>
      </div>
      {previewError && (
        <div role="alert" className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-danger px-3.5 py-1.5 text-[12px] text-paper shadow-lg" data-testid="preview-error">
          {previewError}
        </div>
      )}
      <div className="absolute right-2 bottom-2 flex gap-1">
        <button
          type="button"
          className="rounded-md bg-white/90 px-2 py-1 text-[11px] text-ink-soft shadow-sm hover:text-ink"
          onClick={() => setView(fitView(currentProject(), level, size.w, size.h))}
        >
          Fit plan
        </button>
      </div>
    </div>
  )
}

function OpeningSymbol({
  project,
  o,
  selected,
  hovered,
  px,
  onDown,
}: {
  project: Project
  o: Opening
  selected: boolean
  hovered: boolean
  px: (n: number) => number
  onDown: (e: RPointerEvent) => void
}) {
  const w = project.walls[o.wall]
  const { dir, normal } = wallFrame(project, w)
  const c = openingCenter(project, o)
  const h = w.thickness / 2 + 0.004
  const p0 = { x: c.x - (dir.x * o.width) / 2, y: c.y - (dir.y * o.width) / 2 }
  const p1 = { x: c.x + (dir.x * o.width) / 2, y: c.y + (dir.y * o.width) / 2 }
  const corner = (p: V2, s: number) => ({ x: p.x + normal.x * h * s, y: p.y + normal.y * h * s })
  const gap = [corner(p0, 1), corner(p1, 1), corner(p1, -1), corner(p0, -1)]
  const color = selected ? '#8c5a3c' : hovered ? '#4a443d' : '#2b2724'
  let symbol: React.ReactNode = null
  if (o.kind === 'window') {
    symbol = (
      <>
        {[-0.5, 0, 0.5].map((k) => (
          <line key={k} x1={p0.x + normal.x * h * k} y1={p0.y + normal.y * h * k} x2={p1.x + normal.x * h * k} y2={p1.y + normal.y * h * k} stroke={color} strokeWidth={px(1.2)} />
        ))}
      </>
    )
  } else if (o.kind === 'door') {
    // leaf opened 90° into the swing side, with its arc
    const hingeP = o.hinge === 'a' ? p0 : p1
    const freeP = o.hinge === 'a' ? p1 : p0
    const side = o.swing === 'left' ? 1 : -1
    const base = { x: hingeP.x + normal.x * h * side, y: hingeP.y + normal.y * h * side }
    const leafEnd = { x: base.x + normal.x * o.width * side, y: base.y + normal.y * o.width * side }
    const arcEnd = { x: freeP.x + normal.x * h * side, y: freeP.y + normal.y * h * side }
    const sweep = (o.hinge === 'a') === (side === 1) ? 0 : 1
    symbol = (
      <>
        <line x1={base.x} y1={base.y} x2={leafEnd.x} y2={leafEnd.y} stroke={color} strokeWidth={px(2)} />
        <path d={`M ${leafEnd.x} ${leafEnd.y} A ${o.width} ${o.width} 0 0 ${sweep} ${arcEnd.x} ${arcEnd.y}`} fill="none" stroke={color} strokeWidth={px(1)} strokeDasharray={`${px(3)} ${px(2)}`} />
      </>
    )
  }
  return (
    <g className="cursor-ew-resize" onPointerDown={onDown} data-opening={o.kind} data-opening-id={o.id}>
      <polygon points={gap.map(pt).join(' ')} fill={selected ? '#f3e6dc' : '#fbfaf7'} stroke={color} strokeWidth={px(1.2)} />
      {symbol}
      {/* generous invisible hit area */}
      <polygon points={gap.map(pt).join(' ')} fill="transparent" stroke="transparent" strokeWidth={px(10)} />
    </g>
  )
}

function OpeningGhost({ project, wall, offset, kind, px }: { project: Project; wall: Id; offset: number; kind: Opening['kind']; px: (n: number) => number }) {
  const w = project.walls[wall]
  const fake: Opening = { id: 'o_ghost', wall, kind, offset, width: kind === 'window' ? 1.2 : kind === 'door' ? 0.9 : 1.6, height: 2, sill: 0, hinge: 'a', swing: 'left' }
  const { dir, normal } = wallFrame(project, w)
  const c = openingCenter(project, fake)
  const h = w.thickness / 2 + 0.03
  const p0 = { x: c.x - (dir.x * fake.width) / 2, y: c.y - (dir.y * fake.width) / 2 }
  const p1 = { x: c.x + (dir.x * fake.width) / 2, y: c.y + (dir.y * fake.width) / 2 }
  const q = [p0, p1].flatMap((p) => [{ x: p.x + normal.x * h, y: p.y + normal.y * h }])
  const r = [p1, p0].map((p) => ({ x: p.x - normal.x * h, y: p.y - normal.y * h }))
  return <polygon points={[...q, ...r].map(pt).join(' ')} fill="rgba(140,90,60,0.35)" stroke="#8c5a3c" strokeWidth={px(1.5)} pointerEvents="none" />
}
