import { memo } from 'react'
import { wallOutline } from '../../engine/geometry/walls'
import { roomMetrics } from '../../engine/metrics'
import { roomPolygon } from '../../engine/model/query'
import { stairGeometry, stairsOf } from '../../engine/model/stairs'
import { isOutdoor, type Project, type RoomType } from '../../engine/model/types'

const FILL: Partial<Record<RoomType, string>> = {
  living: '#efe6d8',
  dining: '#efe6d8',
  kitchen: '#e6e2da',
  bedroom: '#e3e7dd',
  bathroom: '#dfe6ea',
  study: '#efe0d6',
  hall: '#f1eee8',
  balcony: '#e4ead8',
  terrace: '#e4ead8',
  courtyard: '#dde8d0',
  pooja: '#f3e3cf',
}

/** A small, read-only plan drawn from a project's own data (rooms, wall solids, names). */
export const PlanPreview = memo(function PlanPreview({ project, level, labels = true, className }: { project: Project; level?: string; labels?: boolean; className?: string }) {
  const lv = level ?? Object.values(project.levels).sort((a, b) => a.elevation - b.elevation)[0]?.id
  const nodes = Object.values(project.nodes).filter((n) => n.level === lv)
  if (!nodes.length) return <div className={className} />
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const pad = 0.6
  const vb = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2]
  const rooms = Object.values(project.rooms).filter((r) => r.level === lv)
  const walls = Object.values(project.walls).filter((w) => w.level === lv)
  const pts = (q: { x: number; y: number }[]) => q.map((p) => `${p.x},${p.y}`).join(' ')
  const font = Math.max(0.28, Math.min(0.45, vb[2] / 32))
  return (
    <svg viewBox={vb.join(' ')} className={className} role="img" aria-label={`Plan: ${rooms.map((r) => r.name).join(', ')}`}>
      {rooms.map((r) => (
        <polygon key={r.id} points={pts(roomPolygon(project, r))} fill={FILL[r.type] ?? '#f1eee8'} stroke="none" opacity={isOutdoor(r) ? 0.8 : 1} />
      ))}
      {/* stairs: the flight with its treads on its own floor, the stairwell outlined on the floor above */}
      {stairsOf(project)
        .map((s) => stairGeometry(project, s))
        .filter((g) => g.stair.level === lv || g.to?.id === lv)
        .map((g) => (
          <g key={g.stair.id} data-preview-stair>
            <polygon points={pts(g.corners)} fill="#fbf9f5" stroke="#6f665c" strokeWidth={0.03} />
            {g.stair.level === lv &&
              Array.from({ length: g.risers - 1 }, (_, i) => {
                const u = (i + 1) * g.going
                const c = { x: g.bottomMid.x + g.dir.x * u, y: g.bottomMid.y + g.dir.y * u }
                const h = g.stair.width / 2
                return <line key={i} x1={c.x - g.side.x * h} y1={c.y - g.side.y * h} x2={c.x + g.side.x * h} y2={c.y + g.side.y * h} stroke="#6f665c" strokeWidth={0.015} />
              })}
          </g>
        ))}
      {walls.map((w) => (
        <polygon key={w.id} points={pts(wallOutline(project, w).footprint)} fill={w.height < 2 ? '#8a8578' : '#2c2a27'} />
      ))}
      {labels &&
        rooms.map((r) => {
          const m = roomMetrics(project, r.id)
          if (m.width < 1.4 || m.depth < 1.2) return null
          return (
            <text key={r.id} x={m.labelAt.x} y={m.labelAt.y} fontSize={font} textAnchor="middle" dominantBaseline="middle" fill="#4a463f" style={{ fontFamily: 'Inter Variable, sans-serif' }}>
              {r.name}
            </text>
          )
        })}
    </svg>
  )
})
