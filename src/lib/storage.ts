import { cleanLine, type Brief } from '../domain/brief'
import { sanitizeConfiguration } from '../domain/configuration'
import type { Configuration } from '../domain/types'

/**
 * Phase 1 persistence: this browser's localStorage only.
 * Everything read back is treated as untrusted and re-validated — storage can be edited by hand,
 * written by an older version, or be unavailable (private mode, quota, disabled).
 */

const KEYS = {
  working: 'fernhall.roomset.v1.working',
  saved: 'fernhall.roomset.v1.saved',
  briefs: 'fernhall.roomset.v1.briefs',
} as const

export const MAX_SAVED = 12
const MAX_BRIEFS = 50
export const NAME_LIMIT = 40

export interface SavedDesign {
  id: string
  name: string
  config: Configuration
  savedAt: string
}

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function cleanName(name: string, fallback: string): string {
  const cleaned = cleanLine(name).slice(0, NAME_LIMIT)
  return cleaned || fallback
}

function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v))
}

export function loadSavedDesigns(): SavedDesign[] {
  const data = read(KEYS.saved)
  if (!Array.isArray(data)) return []
  const out: SavedDesign[] = []
  for (const item of data.slice(0, MAX_SAVED)) {
    if (typeof item !== 'object' || item === null) continue
    const rec = item as Record<string, unknown>
    if (typeof rec.id !== 'string' || !/^[a-z0-9-]{4,40}$/.test(rec.id)) continue
    const { config, issues } = sanitizeConfiguration(rec.config)
    // Drop entries whose stored configuration was not fully valid rather than silently changing them.
    if (issues.length) continue
    out.push({
      id: rec.id,
      name: cleanName(typeof rec.name === 'string' ? rec.name : '', 'Untitled design'),
      config,
      savedAt: isIsoDate(rec.savedAt) ? rec.savedAt : new Date(0).toISOString(),
    })
  }
  return out
}

export function storeSavedDesigns(designs: SavedDesign[]): boolean {
  return write(KEYS.saved, designs.slice(0, MAX_SAVED))
}

/** The design currently in the room, so a reload picks up where the client left off. */
export function loadWorkingDesign(): Configuration | null {
  const data = read(KEYS.working)
  if (data === null) return null
  const { config, issues } = sanitizeConfiguration(data)
  return issues.length ? null : config
}

export function storeWorkingDesign(config: Configuration): boolean {
  return write(KEYS.working, config)
}

export function loadBriefs(): Brief[] {
  const data = read(KEYS.briefs)
  if (!Array.isArray(data)) return []
  return data.filter((b): b is Brief => {
    if (typeof b !== 'object' || b === null) return false
    const r = b as Record<string, unknown>
    return typeof r.reference === 'string' && sanitizeConfiguration(r.config).issues.length === 0
  })
}

export function storeBrief(brief: Brief): boolean {
  const all = [brief, ...loadBriefs()].slice(0, MAX_BRIEFS)
  return write(KEYS.briefs, all)
}

export function newId(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return 'd-' + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Remove everything this app stored in this browser (designs, briefs, working design). */
export function clearAllData(): boolean {
  try {
    for (const key of Object.values(KEYS)) localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}
