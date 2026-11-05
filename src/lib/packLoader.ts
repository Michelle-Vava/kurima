// Finds the bundled climate pack for a place. Kept apart from climatePack.ts
// because import.meta.glob only exists under Vite, and scripts/build-packs.ts
// runs under plain Node.

import { packSlug, type ClimatePack } from './climatePack'

const PACKS = import.meta.glob<{ default: ClimatePack }>('./packs/*.json')

/** The bundled pack for a place, if there is one with the same coordinates. */
export async function loadPack(name: string, key: string): Promise<ClimatePack | null> {
  const loader = PACKS[`./packs/${packSlug(name)}.json`]
  if (!loader) return null
  const pack = (await loader()).default
  return pack.key === key ? pack : null
}
