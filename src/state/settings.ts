// Settings the farmer chooses, kept on their own device and nowhere else.

import { DEFAULT_RULE, type OnsetRule } from '../lib/onset'
import type { Place } from '../lib/openMeteo'
import { DEFAULT_UNITS, type Units } from '../lib/units'

export const STORAGE_KEY = 'kurima:settings'

/** How many recent places to keep. */
export const MAX_RECENT = 4

export interface Settings {
  /** The last district or town chosen, so the app opens where the farmer left it. */
  place: Place | null
  /** Places chosen before, most recent first, for a farmer with more than one field. */
  recent: Place[]
  units: Units
  rule: OnsetRule
}

export const DEFAULT_SETTINGS: Settings = { place: null, recent: [], units: DEFAULT_UNITS, rule: DEFAULT_RULE }

function isPlace(v: unknown): v is Place {
  const p = v as Place
  return !!p && typeof p.name === 'string' && typeof p.latitude === 'number' && typeof p.longitude === 'number'
}

/**
 * Read settings, falling back to the defaults for anything missing or
 * corrupt. Stored settings come from an older version of the app as often as
 * not, so every field is checked rather than trusted.
 */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS
  let v: Partial<Settings>
  try {
    v = JSON.parse(raw)
  } catch {
    return DEFAULT_SETTINGS
  }
  if (!v || typeof v !== 'object') return DEFAULT_SETTINGS
  return {
    place: isPlace(v.place) ? v.place : null,
    recent: Array.isArray(v.recent) ? v.recent.filter(isPlace).slice(0, MAX_RECENT) : [],
    units: {
      rain: v.units?.rain === 'in' ? 'in' : 'mm',
      temp: v.units?.temp === 'F' ? 'F' : 'C',
    },
    rule: { ...DEFAULT_RULE, ...numbersOnly(v.rule) },
  }
}

function numbersOnly(rule: Partial<OnsetRule> | undefined): Partial<OnsetRule> {
  const out: Record<string, number> = {}
  for (const [k, val] of Object.entries(rule ?? {})) {
    if (typeof val === 'number' && Number.isFinite(val)) out[k] = val
  }
  return out as Partial<OnsetRule>
}

/** `place` moved to the front of `recent`, without duplicates, capped. */
export function rememberPlace(recent: Place[], place: Place): Place[] {
  const same = (a: Place, b: Place) => a.latitude === b.latitude && a.longitude === b.longitude
  return [place, ...recent.filter((p) => !same(p, place))].slice(0, MAX_RECENT)
}

export function readSettings(): Settings {
  try {
    return parseSettings(localStorage.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function writeSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage full or blocked: the app still works for this visit.
  }
}
