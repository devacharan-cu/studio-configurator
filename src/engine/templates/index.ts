import { roomMetrics } from '../metrics'
import { emptyProject } from '../model/project'
import { isOutdoor, type Project } from '../model/types'
import { COMPACT_HOME } from './houses/compactHome'
import { CITY_APARTMENT_2BHK } from './houses/cityApartment2'
import { COURTYARD_HOUSE } from './houses/courtyardHouse'
import { FAMILY_APARTMENT_3BHK } from './houses/familyApartment3'
import { FAMILY_HOME_4 } from './houses/familyHome4'
import { L_BUNGALOW } from './houses/lBungalow'
import { STUDIO_APARTMENT } from './houses/studioApartment'
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
    id: 'studio-apartment',
    name: 'Studio apartment',
    kind: 'apartment',
    style: 'Urban compact',
    description: 'One light-filled open room for sleeping, living, dining and cooking, with a separate entry, a shower room, a walk-in dressing room and glazed doors to a balcony.',
    tags: ['studio', 'balcony', 'open plan', 'rental'],
    spec: STUDIO_APARTMENT,
  },
  {
    id: 'city-apartment-2bhk',
    name: 'Two-bedroom city apartment',
    kind: 'apartment',
    style: 'Indian urban',
    description: 'A 2BHK with an open living and dining room onto a balcony, a kitchen with a separate wash area, a master suite with attached bath, a pooja room, a study, a common bath and a store by the foyer.',
    tags: ['2BHK', 'pooja room', 'balcony', 'utility', 'attached bath'],
    spec: CITY_APARTMENT_2BHK,
  },
  {
    id: 'family-apartment-3bhk',
    name: 'Three-bedroom family apartment',
    kind: 'apartment',
    style: 'Contemporary family',
    description: 'A 3BHK with a central living and dining room onto a balcony, a lobby serving two bedrooms and the common bath, a master suite with a dressing room and its own bath, and a separate kitchen with a utility room.',
    tags: ['3BHK', 'master suite', 'dressing room', 'balcony', 'utility'],
    spec: FAMILY_APARTMENT_3BHK,
  },
  {
    id: 'l-bungalow',
    name: 'L-shaped bungalow',
    kind: 'house',
    style: 'Modern classic',
    description: 'Day wing and night wing around a garden terrace: a study and entrance hall, a large living room with glazed doors to the terrace, a kitchen with an island and a laundry; two bedrooms, a family bath and a master suite down a quiet corridor.',
    tags: ['3 bedroom', 'L-shaped', 'garden terrace', 'kitchen island', 'en-suite'],
    spec: L_BUNGALOW,
  },
  {
    id: 'courtyard-house',
    name: 'Courtyard house',
    kind: 'house',
    style: 'Courtyard (aangan)',
    description: 'A U-plan around an open courtyard: living, dining and kitchen across the north with glazed doors to the court, and glazed corridors down each wing to two bedrooms and a family bath on one side and a master suite and study on the other.',
    tags: ['3 bedroom', 'courtyard', 'brick', 'cross-ventilation', 'en-suite'],
    spec: COURTYARD_HOUSE,
  },
  {
    id: 'family-home-4bed',
    name: 'Contemporary family home',
    kind: 'house',
    style: 'Contemporary',
    description: 'Four bedrooms on one level: living room and an open kitchen-diner with an island along the garden side, a terrace off the living room, a master suite with en-suite and dressing room, a family bath and a laundry off a long corridor.',
    tags: ['4 bedroom', 'open kitchen', 'master suite', 'terrace', 'laundry'],
    spec: FAMILY_HOME_4,
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
