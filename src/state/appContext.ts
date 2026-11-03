import { createContext, useContext } from 'react'
import type { OnsetRule } from '../lib/onset'
import type { Place } from '../lib/openMeteo'
import type { Units } from '../lib/units'
import type { Settings } from './settings'

export interface AppState extends Settings {
  setPlace: (place: Place | null) => void
  setUnits: (units: Units) => void
  setRule: (rule: OnsetRule) => void
}

export const AppContext = createContext<AppState | null>(null)

/** The chosen place and settings, shared by every screen. */
export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
