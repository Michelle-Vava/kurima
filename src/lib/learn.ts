// Plain explanations of the ideas Kurima uses.
//
// Written for someone new to farming, or new to these terms. Every entry says
// what the thing is, why it matters, and what Kurima does with it — in that
// order, because the third part is only useful once the first two land.
//
// Kept as data rather than markup so the Learn screen stays a list, and so
// these can be translated in one place later (Milestone 7).

export interface LearnEntry {
  id: string
  question: string
  body: string[]
  /** What Kurima does with it. */
  inApp?: string
}

export const LEARN: LearnEntry[] = [
  {
    id: 'onset',
    question: 'What is the onset of the rains?',
    body: [
      'The onset is the day the rainy season truly begins — not the first shower, but the point where enough rain has fallen, and keeps falling, for a crop planted that day to survive.',
      'It matters because maize planted at the right moment uses the whole season. Planted too early it may germinate and then die in the dry spell that follows. Planted too late it may still be filling grain when the rains stop.',
    ],
    inApp: 'Kurima’s default rule treats the rains as started when 20 mm falls within 3 days with no dry spell of 7 days or more afterwards. Zimbabwe’s own guidance is 20 mm over 3 days or 25 mm in a week. You can change the numbers under Settings.',
  },
  {
    id: 'false-start',
    question: 'What is a false start?',
    body: [
      'A false start is a good rain that is not the real beginning of the season. It wets the soil, tempts everyone to plant, and is then followed by two or three dry weeks that kill the seedlings.',
      'Replanting costs seed, fertiliser and labour a second time, and the crop that finally grows has a shorter season.',
    ],
    inApp: 'This is the main thing Kurima is built to avoid. It is why the signal looks ahead at the forecast for a long dry spell, and not only backwards at the rain that has already fallen.',
  },
  {
    id: 'evaporation',
    question: 'Why does rain not simply add up?',
    body: [
      'Sun and wind pull water back out of the soil every day. Agronomists measure this as reference evapotranspiration, or ET0, in millimetres a day — the same unit as rainfall, so the two can be compared directly.',
      'In Harare in early November, ET0 runs about 7 mm a day. So 20 mm of rain over three days arrives while roughly 21 mm is leaving. The soil can end a rainy week drier than it started.',
      'This is why rainfall on its own is a poor guide to whether the ground is actually wetting up.',
    ],
    inApp: 'Kurima compares rain against ET0 over the days ahead. When rain is not keeping pace, the answer is marked as marginal and the shortfall is shown.',
  },
  {
    id: 'dry-spell',
    question: 'Why do dry spells matter so much?',
    body: [
      'A young seedling has short roots and can only reach water in the top few centimetres of soil. That layer dries within days.',
      'An established plant with deep roots can ride out two dry weeks. The same two weeks just after emergence will kill it.',
      'This is why the days immediately after planting matter more than the total rain for the season.',
    ],
    inApp: 'Kurima refuses to say plant when the forecast shows a dry spell of 7 days or more ahead. Across 116 past onset events in Zimbabwe, that check alone blocked 28 of the 38 starts that were followed by a killing dry spell.',
  },
  {
    id: 'soil-temperature',
    question: 'Does soil temperature matter?',
    body: [
      'Yes, though usually less than water. Maize seed germinates poorly below about 12 °C, and emergence suffers when soil at seeding depth is much above 35 °C.',
      'What counts is the average through the day at the depth you sow, not the midday peak at the surface, which is always much hotter.',
    ],
    inApp: 'Kurima reads the daily mean at 0–7 cm and says so if it falls outside that range. In Zimbabwe it rarely does: across the same 116 events it ran between 13.5 °C and 28.9 °C. It matters more at altitude in East Africa.',
  },
  {
    id: 'normals',
    question: 'What does "normal rainfall" mean?',
    body: [
      'A normal is the average for a place over a fixed 30-year period — here 1991 to 2020, the standard run that meteorologists use worldwide.',
      'It answers "what usually happens here", which is what makes this season’s weather meaningful. 40 mm in a month is a drought in one district and a wet spell in another.',
    ],
    inApp: 'The Season screen shows the monthly normal for your district, and Kurima uses it to tell when a month is outside the rainy season altogether.',
  },
  {
    id: 'outlook',
    question: 'How much can a three-month outlook be trusted?',
    body: [
      'Less than a three-day forecast, and in a different way. A seasonal model is run many times with slightly different starting conditions; the spread of those runs suggests whether the season leans wet or dry.',
      'It cannot tell you the weather on a given day three months out, and it is more reliable about direction than amount.',
    ],
    inApp: 'Kurima shows only which way the model leans, not a percentage. The model has not yet been checked against its own past forecasts, and until it is, a number like "37% chance of a drier season" would sound more precise than it is.',
  },
  {
    id: 'modelled',
    question: 'Where do these numbers come from, and are they measured?',
    body: [
      'Mostly they are modelled, not measured. There is no rain gauge in most villages, so past rainfall comes from a weather model that reconstructs it from satellites and the gauges that do exist.',
      'It is good, but it is an estimate. Rainfall in particular varies sharply over a few kilometres — a storm can soak one field and miss the next.',
    ],
    inApp: 'Kurima labels past days as modelled everywhere, never as observed. Trust your own eyes and rain gauge over the app for what fell on your field.',
  },
]
