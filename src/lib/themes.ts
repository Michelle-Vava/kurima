// Themes.
//
// Each one is a full palette rather than a tint, because the colours in
// Kurima carry meaning — green is "plant", amber is "careful", rust is "no" —
// and a theme that only swaps a background would leave those meanings
// looking wrong against it. Every palette therefore restates the status
// colours at a contrast that works on its own surface.
//
// `sun` is not a novelty: the app is read outdoors on a cheap screen, and a
// high-contrast, shadowless palette is the difference between legible and
// not. `auto` follows the device.

export type ThemeId = 'auto' | 'field' | 'dusk' | 'sun'

export interface Theme {
  id: ThemeId
  label: string
  /** One line in the settings list, so the choice is not a guess. */
  hint: string
  /** Swatch colours shown in the picker: surface, ink, accent. */
  preview: [string, string, string]
}

export const THEMES: Theme[] = [
  { id: 'auto', label: 'Match my device', hint: 'Light by day, dark at night, following your phone or laptop.', preview: ['#f6f4ef', '#1c2420', '#2e7d4f'] },
  { id: 'field', label: 'Field', hint: 'Warm and light. The default.', preview: ['#f6f4ef', '#1c2420', '#2e7d4f'] },
  { id: 'dusk', label: 'Dusk', hint: 'Dark, for evening and for saving battery.', preview: ['#141714', '#ecf0ea', '#5ec47f'] },
  { id: 'sun', label: 'Bright sun', hint: 'Hard contrast and no shadows, for reading outdoors.', preview: ['#ffffff', '#000000', '#0a6b2d'] },
]

export const DEFAULT_THEME: ThemeId = 'auto'

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && THEMES.some((t) => t.id === v)
}

/**
 * Put the theme on the document. `auto` removes the attribute so the
 * stylesheet's own prefers-color-scheme rules take over, rather than this
 * code trying to second-guess the device.
 */
export function applyTheme(theme: ThemeId): void {
  const root = document.documentElement
  if (theme === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}
