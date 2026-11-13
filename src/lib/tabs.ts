// Everywhere Kurima will eventually go, declared now.
//
// The sections that do not exist yet are here on purpose. Kurima is meant to
// follow a farmer through the year — plant, grow, harvest, sell — and a nav
// bar that only ever shows "Today / Season / Settings" quietly promises a
// weather app. Showing the whole shape, with the unbuilt parts honestly
// marked, costs one placeholder screen each and makes the gaps arguable
// instead of invisible.
//
// `milestone` is the rough order they are expected to arrive in.

export interface Section {
  id: string
  label: string
  /** One line, shown on the placeholder screen and as the nav title. */
  blurb: string
  /** Which roadmap milestone builds it. */
  milestone: number
  /** `live` is built; `soon` is a placeholder. */
  status: 'live' | 'soon'
  /** Settings and About are app-level, not part of the farming year. */
  group: 'farm' | 'app'
}

export const SECTIONS: Section[] = [
  {
    id: 'today',
    label: 'Today',
    blurb: 'Should I plant? Rain that has fallen, rain that is coming, and the answer.',
    milestone: 1,
    status: 'live',
    group: 'farm',
  },
  {
    id: 'season',
    label: 'Season',
    blurb: 'How this season compares with the last thirty, and what the next three months look like.',
    milestone: 1,
    status: 'live',
    group: 'farm',
  },
  {
    id: 'soil',
    label: 'Soil',
    blurb: 'What your soil is like, and how much fertiliser and seed it needs.',
    milestone: 2,
    status: 'soon',
    group: 'farm',
  },
  {
    id: 'crops',
    label: 'Crops',
    blurb: 'Which crop suits this season, how long it takes to grow, and the pests to watch for.',
    milestone: 3,
    status: 'soon',
    group: 'farm',
  },
  {
    id: 'harvest',
    label: 'Harvest',
    blurb: 'Drying and storing the crop, and what it is worth at nearby markets.',
    milestone: 4,
    status: 'soon',
    group: 'farm',
  },
  {
    id: 'settings',
    label: 'Settings',
    blurb: 'Units, the planting rule, and where the data comes from.',
    milestone: 1,
    status: 'live',
    group: 'app',
  },
  {
    id: 'about',
    label: 'About',
    blurb: 'What Kurima is, who it is for, and what it does not know.',
    milestone: 1,
    status: 'live',
    group: 'app',
  },
]

export type TabId = string

export function isTabId(v: string): boolean {
  return SECTIONS.some((s) => s.id === v)
}

export function sectionOf(id: string): Section | undefined {
  return SECTIONS.find((s) => s.id === id)
}

/**
 * Sections that cannot say anything until a district is chosen.
 *
 * A section that is not built yet shows the same words wherever you farm, so
 * it does not need one: you can walk the whole shape of the app before
 * committing to a place.
 */
export function needsPlace(id: string): boolean {
  const s = sectionOf(id)
  return !!s && s.group === 'farm' && s.status === 'live'
}
