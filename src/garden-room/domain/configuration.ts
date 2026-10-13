import { GROUPS, TEMPLATE, getOption } from './catalog'
import { GROUP_IDS, type Configuration, type GroupId } from './types'

export function defaultConfiguration(): Configuration {
  return { templateId: TEMPLATE.id, ...TEMPLATE.defaults }
}

const ID_PATTERN = /^[a-z0-9-]{1,48}$/

export function isValidOption(group: GroupId, value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value) && getOption(group, value) !== undefined
}

export interface ConfigIssue {
  group: GroupId | 'templateId'
  reason: 'missing' | 'unknown' | 'malformed'
}

/**
 * Coerce untrusted data (localStorage, URL, imported JSON) into a valid Configuration.
 * Each field is validated independently against the catalogue; anything invalid falls back
 * to the template default and is reported, so one bad field never discards the rest.
 */
export function sanitizeConfiguration(input: unknown): { config: Configuration; issues: ConfigIssue[] } {
  const config = defaultConfiguration()
  const issues: ConfigIssue[] = []
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { config, issues: [{ group: 'templateId', reason: 'malformed' }] }
  }
  const record = input as Record<string, unknown>
  if (record.templateId !== TEMPLATE.id) {
    issues.push({ group: 'templateId', reason: record.templateId === undefined ? 'missing' : 'unknown' })
  }
  for (const group of GROUP_IDS) {
    const value = record[group]
    if (isValidOption(group, value)) config[group] = value
    else issues.push({ group, reason: value === undefined ? 'missing' : 'unknown' })
  }
  return { config, issues }
}

/* ---------- Share URLs ---------- */

/** Short, readable query keys. The `v` param lets the format evolve without breaking old links. */
const PARAM_KEYS: Record<GroupId, string> = {
  sofa: 'sofa',
  coffeeTable: 'table',
  flooring: 'floor',
  wallFinish: 'wall',
  rug: 'rug',
}
const SHARE_VERSION = '1'

export function toSearchParams(config: Configuration): URLSearchParams {
  const params = new URLSearchParams()
  params.set('v', SHARE_VERSION)
  params.set('room', config.templateId)
  for (const group of GROUP_IDS) params.set(PARAM_KEYS[group], config[group])
  return params
}

export function toShareUrl(config: Configuration, base: string): string {
  const url = new URL(base)
  url.search = toSearchParams(config).toString()
  url.hash = ''
  return url.toString()
}

export type ShareParseResult =
  | { status: 'none' }
  | { status: 'ok'; config: Configuration }
  | { status: 'partial'; config: Configuration; issues: ConfigIssue[] }
  | { status: 'invalid'; config: Configuration; issues: ConfigIssue[] }

const MAX_QUERY_LENGTH = 1024

export function parseShareParams(search: string): ShareParseResult {
  if (search.length > MAX_QUERY_LENGTH) {
    return { status: 'invalid', config: defaultConfiguration(), issues: [{ group: 'templateId', reason: 'malformed' }] }
  }
  const params = new URLSearchParams(search)
  const keys = ['room', ...Object.values(PARAM_KEYS)]
  if (!keys.some((k) => params.has(k))) return { status: 'none' }

  const issues: ConfigIssue[] = []
  const config = defaultConfiguration()

  const version = params.getAll('v')
  const rooms = params.getAll('room')
  if (version.length > 1 || (version.length === 1 && version[0] !== SHARE_VERSION)) {
    issues.push({ group: 'templateId', reason: 'unknown' })
  } else if (rooms.length !== 1 || rooms[0] !== TEMPLATE.id) {
    issues.push({ group: 'templateId', reason: rooms.length === 0 ? 'missing' : 'unknown' })
  }

  let valid = 0
  for (const group of GROUP_IDS) {
    const values = params.getAll(PARAM_KEYS[group])
    if (values.length === 0) issues.push({ group, reason: 'missing' })
    else if (values.length > 1) issues.push({ group, reason: 'malformed' })
    else if (!isValidOption(group, values[0])) issues.push({ group, reason: 'unknown' })
    else {
      config[group] = values[0]
      valid++
    }
  }

  if (issues.length === 0) return { status: 'ok', config }
  // A link for another room template, or one where nothing was recognisable, is not partially usable.
  if (valid === 0 || issues.some((i) => i.group === 'templateId' && i.reason !== 'missing')) {
    return { status: 'invalid', config: defaultConfiguration(), issues }
  }
  return { status: 'partial', config, issues }
}

/* ---------- Comparison & description ---------- */

export function isSameConfiguration(a: Configuration, b: Configuration): boolean {
  return a.templateId === b.templateId && GROUP_IDS.every((g) => a[g] === b[g])
}

export function differingGroups(a: Configuration, b: Configuration): GroupId[] {
  return GROUP_IDS.filter((g) => a[g] !== b[g])
}

export function optionName(group: GroupId, id: string): string {
  return getOption(group, id)?.name ?? 'Unknown option'
}

export function describeConfiguration(config: Configuration): { group: GroupId; label: string; option: string }[] {
  return GROUP_IDS.map((group) => ({ group, label: GROUPS[group].label, option: optionName(group, config[group]) }))
}
