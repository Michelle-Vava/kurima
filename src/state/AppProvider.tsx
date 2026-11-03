import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppContext, type AppState } from './appContext'
import { readSettings, writeSettings, type Settings } from './settings'

/** Holds the chosen place and settings, and keeps them on the device. */
export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(readSettings)

  useEffect(() => {
    writeSettings(settings)
  }, [settings])

  const value = useMemo<AppState>(
    () => ({
      ...settings,
      setPlace: (place) => setSettings((s) => ({ ...s, place })),
      setUnits: (units) => setSettings((s) => ({ ...s, units })),
      setRule: (rule) => setSettings((s) => ({ ...s, rule })),
    }),
    [settings],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
