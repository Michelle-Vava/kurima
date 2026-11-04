export const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'season', label: 'Season' },
  { id: 'learn', label: 'Learn' },
  { id: 'settings', label: 'Settings' },
] as const

export type TabId = (typeof TABS)[number]['id']

export function isTabId(v: string): v is TabId {
  return TABS.some((t) => t.id === v)
}
