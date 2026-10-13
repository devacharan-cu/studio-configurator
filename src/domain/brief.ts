import type { Configuration } from './types'

export type ContactPreference = 'email' | 'phone'

export interface BriefInput {
  name: string
  email: string
  phone: string
  preferredContact: ContactPreference
  notes: string
}

export interface Brief {
  reference: string
  submittedAt: string
  designName: string
  client: { name: string; email: string; phone: string; preferredContact: ContactPreference }
  notes: string
  config: Configuration
  shareUrl: string
}

export const LIMITS = { name: 80, email: 254, phone: 24, notes: 1000 } as const

// Pragmatic, not RFC-complete: one @, no spaces, a dot in the domain.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^\+?[0-9 ()-]{7,24}$/

/** Collapse whitespace and drop control characters from single-line input. */
export function cleanLine(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Keep newlines in multi-line notes, drop other control characters. */
export function cleanMultiline(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').trim()
}

export type BriefErrors = Partial<Record<keyof BriefInput, string>>

export function validateBrief(raw: BriefInput): { ok: true; value: BriefInput } | { ok: false; errors: BriefErrors } {
  const value: BriefInput = {
    name: cleanLine(raw.name),
    email: cleanLine(raw.email).toLowerCase(),
    phone: cleanLine(raw.phone),
    preferredContact: raw.preferredContact === 'phone' ? 'phone' : 'email',
    notes: cleanMultiline(raw.notes),
  }
  const errors: BriefErrors = {}

  if (value.name.length < 2) errors.name = 'Please enter your name.'
  else if (value.name.length > LIMITS.name) errors.name = `Please keep your name under ${LIMITS.name} characters.`

  if (!value.email) errors.email = 'We need an email address to send your designer’s reply.'
  else if (value.email.length > LIMITS.email || !EMAIL.test(value.email))
    errors.email = 'That doesn’t look like a valid email address — check for typos.'

  if (value.phone && !PHONE.test(value.phone))
    errors.phone = 'Use digits, spaces, brackets or a leading + (7–24 characters).'
  if (value.preferredContact === 'phone' && !value.phone)
    errors.phone = 'Add a phone number, or choose email as your preferred contact.'

  if (value.notes.length > LIMITS.notes) errors.notes = `Notes are limited to ${LIMITS.notes} characters.`

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value }
}

export function makeReference(now = new Date()): string {
  const bytes = new Uint8Array(3)
  crypto.getRandomValues(bytes)
  const code = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `FH-${now.getFullYear()}-${code}`
}
