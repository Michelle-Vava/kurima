// What is being planted.
//
// "Too dry to plant" begged the question: plant what? Every threshold in
// Kurima was derived for rain-fed maize and the app never said so, which
// made a maize answer look like a universal one. Naming the crop is the
// smallest honest fix, and it is also the hook everything later hangs on —
// days to maturity, the latest date worth sowing, fertiliser, pests.
//
// Only maize is checked. The others carry their own days-to-maturity, which
// is enough to say "this crop needs a longer season than you have left", and
// are marked unchecked everywhere they appear. None of these numbers has been
// through an agronomist yet; they are the common published ranges and are
// flagged provisional in the same way as the thresholds in agronomy.ts.

export interface Crop {
  id: string
  name: string
  /** Days from sowing to a harvestable crop, for a mid-length variety. */
  daysToMaturity: number
  /** Rough range across short and long varieties, for the honest version. */
  maturityRange: [number, number]
  /** Has the planting rule been checked for this crop? */
  checked: boolean
  /** One line, in a farmer's terms. */
  note: string
}

export const CROPS: Crop[] = [
  {
    id: 'maize',
    name: 'Maize',
    daysToMaturity: 135,
    maturityRange: [110, 160],
    checked: true,
    note: 'The crop Kurima is built and checked for. Thirsty, and unforgiving of a dry spell just after sowing.',
  },
  {
    id: 'sorghum',
    name: 'Sorghum',
    daysToMaturity: 115,
    maturityRange: [95, 140],
    checked: false,
    note: 'Handles drought better than maize and needs a shorter season, so it stays worth sowing later.',
  },
  {
    id: 'groundnut',
    name: 'Groundnuts',
    daysToMaturity: 130,
    maturityRange: [100, 150],
    checked: false,
    note: 'Needs steady rain while the pods fill, not just at planting.',
  },
  {
    id: 'millet',
    name: 'Pearl millet',
    daysToMaturity: 95,
    maturityRange: [75, 120],
    checked: false,
    note: 'The shortest season of the four, and the most tolerant of a dry year.',
  },
  {
    id: 'beans',
    name: 'Beans',
    daysToMaturity: 90,
    maturityRange: [75, 110],
    checked: false,
    note: 'Quick, but easily lost to a dry spell or to waterlogging.',
  },
]

export const DEFAULT_CROP = 'maize'

export function cropById(id: string | null | undefined): Crop {
  return CROPS.find((c) => c.id === id) ?? CROPS[0]
}
