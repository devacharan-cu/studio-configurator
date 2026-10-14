import { roomMetrics } from '../metrics'
import { emptyProject } from '../model/project'
import { isOutdoor, type Project } from '../model/types'
import { COMPACT_HOME } from './houses/compactHome'
import { buildHouse, type HouseSpec } from './spec'

export { EXTERIOR_THICKNESS, INTERIOR_THICKNESS } from './spec'

/**
 * The house template library. Each entry is a spec built through the engine's validated commands
 * (see spec.ts); the numbers shown on cards are computed from the built project, never typed in.
 */

export type TemplateKind = 'apartment' | 'house' | 'villa' | 'townhouse' | 'blank'

export interface TemplateDef {
  id: string
  name: string
  kind: TemplateKind
  style: string
  description: string
  tags: string[]
  spec?: HouseSpec
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'compact-home',
    name: 'Compact single-storey home',
    kind: 'house',
    style: 'Warm contemporary',
    description: 'A six-room bungalow: open living and dining with an open kitchen, a bedroom, study and bathroom off a central hall.',
    tags: ['single-storey', 'open kitchen', 'study'],
    spec: COMPACT_HOME,
  },
  {
    id: 'blank',
    name: 'Blank project',
    kind: 'blank',
    style: '—',
    description: 'An empty plan: draw rooms from scratch.',
    tags: [],
  },
]

export const KIND_LABELS: Record<TemplateKind, string> = {
  apartment: 'Apartments',
  house: 'Houses',
  villa: 'Villas',
  townhouse: 'Townhouses',
  blank: 'Blank',
}

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id)

/** A fresh, editable project from a template: a new id every time; the template itself never changes. */
export function buildTemplate(t: TemplateDef): Project {
  return t.spec ? buildHouse(t.spec, t.id) : emptyProject()
}

export interface TemplateStats {
  bedrooms: number
  bathrooms: number
  floors: number
  rooms: number
  /** Net internal floor area of indoor rooms, m². */
  area: number
  /** Open-air area (balconies, terraces, courtyards), m². */
  outdoorArea: number
  items: number
}

export function projectStats(p: Project): TemplateStats {
  const rooms = Object.values(p.rooms)
  const indoor = rooms.filter((r) => !isOutdoor(r))
  return {
    bedrooms: rooms.filter((r) => r.type === 'bedroom').length,
    bathrooms: rooms.filter((r) => r.type === 'bathroom').length,
    floors: new Set(rooms.map((r) => r.level)).size || 1,
    rooms: indoor.length,
    area: indoor.reduce((s, r) => s + roomMetrics(p, r.id).netArea, 0),
    outdoorArea: rooms.filter(isOutdoor).reduce((s, r) => s + roomMetrics(p, r.id).netArea, 0),
    items: Object.keys(p.items).length,
  }
}

const statsCache = new Map<string, { project: Project; stats: TemplateStats }>()
/** The built project and its stats (cached: templates are immutable). */
export function templatePreview(t: TemplateDef) {
  let hit = statsCache.get(t.id)
  if (!hit) {
    const project = buildTemplate(t)
    hit = { project, stats: projectStats(project) }
    statsCache.set(t.id, hit)
  }
  return hit
}

/** The engine's reference project (tests and first-run default). */
export const compactHome = (): Project => buildHouse(COMPACT_HOME, 'compact-home')
