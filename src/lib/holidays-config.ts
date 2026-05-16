/**
 * Holiday pSEO configs — Tier 3.
 *
 * Holiday × strongest Moon Raven angle. The page exists because someone is
 * choosing a specific meaningful piece for a specific holiday, so the brief
 * targets commercial-intent gift queries tied to that holiday.
 *
 * Pages are exported as Shopify native pages with templateSuffix='pseo'.
 */

export type HolidayConfig = {
  slug: string;
  handle: string;
  label: string;
  title: string;
  // Primary commercial query targeted
  primaryQuery: string;
  relatedQueries: string[];
  // The holiday / occasion noun
  holiday: string;
  // Emotional / symbolic anchor for the writer
  anchor: string;
  // Tone hint: "celebration" | "memorial" | "transition" | "everyday" | "romance"
  tone: 'celebration' | 'memorial' | 'transition' | 'everyday' | 'romance';
  productFilters: string[];
  hook: string;
};

export const HOLIDAYS: HolidayConfig[] = [
  {
    slug: 'christmas-jewelry-meaningful-gift',
    handle: 'christmas-jewelry-meaningful-gift',
    label: 'Meaningful Christmas Jewelry Gifts',
    title: 'Meaningful Christmas Jewelry Gifts',
    primaryQuery: 'meaningful christmas jewelry gift',
    relatedQueries: [
      'handcrafted christmas necklace gift',
      'symbolic christmas jewelry',
      'unique christmas gift jewelry',
      'christmas talisman necklace',
      'thoughtful christmas jewelry gift',
    ],
    holiday: 'Christmas',
    anchor: 'winter solstice and the dark months',
    tone: 'celebration',
    productFilters: ['raven', 'moon', 'feather', 'antler', 'celtic'],
    hook: 'For the long dark night and the small light kept burning in it.',
  },
  {
    slug: 'valentines-day-talismanic-jewelry',
    handle: 'valentines-day-talismanic-jewelry',
    label: 'Talismanic Valentine\'s Day Jewelry',
    title: 'Talismanic Jewelry for Valentine\'s Day',
    primaryQuery: 'meaningful valentines day jewelry',
    relatedQueries: [
      'unique valentines day necklace',
      'symbolic valentines jewelry gift',
      'handcrafted valentines day jewelry',
      'unconventional valentines gift jewelry',
      'gothic valentines necklace',
    ],
    holiday: 'Valentine\'s Day',
    anchor: 'talisman',
    tone: 'romance',
    productFilters: ['raven', 'moon', 'snake', 'celtic', 'feather'],
    hook: 'For the love that does not need a red ribbon to recognize itself.',
  },
  {
    slug: 'mothers-day-memorial-jewelry',
    handle: 'mothers-day-memorial-jewelry',
    label: 'Mother\'s Day Memorial Jewelry',
    title: 'Mother\'s Day Memorial Jewelry — When She Is the One Being Remembered',
    primaryQuery: 'mothers day memorial jewelry',
    relatedQueries: [
      'mothers day gift for someone who lost their mom',
      'mothers day jewelry for grieving daughter',
      'memorial necklace mothers day',
      'mothers day remembrance jewelry',
      'jewelry for first mothers day without mom',
    ],
    holiday: 'Mother\'s Day',
    anchor: 'memorial',
    tone: 'memorial',
    productFilters: ['memorial', 'cremation', 'urn', 'keepsake'],
    hook: 'For the Sunday that arrives whether you are ready for it or not.',
  },
  {
    slug: 'fathers-day-talisman-gift',
    handle: 'fathers-day-talisman-gift',
    label: 'Father\'s Day Talisman Jewelry',
    title: 'Father\'s Day Talisman Jewelry',
    primaryQuery: 'meaningful fathers day jewelry gift',
    relatedQueries: [
      'fathers day necklace symbolic',
      'handcrafted jewelry gift for dad',
      'mens talisman fathers day',
      'unique fathers day gift jewelry',
      'fathers day pendant gift',
    ],
    holiday: 'Father\'s Day',
    anchor: 'talisman',
    tone: 'celebration',
    productFilters: ['bronze', 'wolf', 'antler', 'raven', 'skull'],
    hook: 'For the father who would rather have something to carry than something to display.',
  },
  {
    slug: 'anniversary-gift-handcrafted-jewelry',
    handle: 'anniversary-gift-handcrafted-jewelry',
    label: 'Handcrafted Anniversary Jewelry Gifts',
    title: 'Handcrafted Anniversary Jewelry Gifts',
    primaryQuery: 'handcrafted anniversary jewelry gift',
    relatedQueries: [
      'meaningful anniversary necklace',
      'handmade anniversary jewelry',
      'symbolic wedding anniversary gift',
      'unique anniversary jewelry gift',
      'artisan anniversary necklace',
    ],
    holiday: 'Wedding Anniversary',
    anchor: 'anniversary',
    tone: 'romance',
    productFilters: ['raven', 'moon', 'celtic', 'feather', 'antler'],
    hook: 'For the years that kept arriving, one after the next, and were good.',
  },
  {
    slug: 'birthday-symbolism-jewelry-gift',
    handle: 'birthday-symbolism-jewelry-gift',
    label: 'Symbolic Birthday Jewelry Gifts',
    title: 'Symbolic Birthday Jewelry Gifts',
    primaryQuery: 'meaningful birthday jewelry gift',
    relatedQueries: [
      'symbolic birthday necklace',
      'handcrafted birthday jewelry',
      'unique birthday talisman',
      'birthday pendant meaningful',
      'thoughtful birthday jewelry gift',
    ],
    holiday: 'Birthday',
    anchor: 'birthday',
    tone: 'celebration',
    productFilters: ['raven', 'moon', 'feather', 'talisman', 'celtic'],
    hook: 'For another lap around the sun and whatever they are carrying into it.',
  },
  {
    slug: 'wedding-ceremony-jewelry-meaningful',
    handle: 'wedding-ceremony-jewelry-meaningful',
    label: 'Meaningful Wedding Ceremony Jewelry',
    title: 'Meaningful Wedding Ceremony Jewelry',
    primaryQuery: 'meaningful wedding jewelry',
    relatedQueries: [
      'symbolic wedding necklace',
      'handfasting jewelry meaningful',
      'unique wedding day jewelry',
      'pagan wedding jewelry',
      'celtic wedding necklace',
      'something old wedding jewelry',
    ],
    holiday: 'Wedding',
    anchor: 'wedding',
    tone: 'romance',
    productFilters: ['celtic', 'raven', 'moon', 'feather'],
    hook: 'For the vow that is older than the paperwork.',
  },
  {
    slug: 'engagement-raven-ring-meaning',
    handle: 'engagement-raven-ring-meaning',
    label: 'Raven Engagement Ring Meaning',
    title: 'Raven Engagement Rings — Meaning and Symbolism',
    primaryQuery: 'raven engagement ring meaning',
    relatedQueries: [
      'gothic engagement ring symbolism',
      'unconventional engagement ring meaning',
      'raven wedding ring symbolism',
      'corvid engagement jewelry',
      'alternative engagement ring meaning',
    ],
    holiday: 'Engagement',
    anchor: 'raven',
    tone: 'romance',
    productFilters: ['raven', 'crow', 'corvid'],
    hook: 'For the proposal made over a window full of corvids on the wire.',
  },
  {
    slug: 'graduation-jewelry-symbolism-gift',
    handle: 'graduation-jewelry-symbolism-gift',
    label: 'Symbolic Graduation Jewelry Gifts',
    title: 'Graduation Jewelry — Symbolism and Meaning',
    primaryQuery: 'graduation jewelry symbolism gift',
    relatedQueries: [
      'symbolic graduation necklace',
      'meaningful graduation pendant',
      'graduation talisman meaning',
      'symbolic gift for graduate',
      'thoughtful graduation jewelry',
    ],
    holiday: 'Graduation',
    anchor: 'graduation',
    tone: 'celebration',
    productFilters: ['raven', 'moon', 'feather', 'talisman', 'antler'],
    hook: 'For the threshold whose other side is unwritten.',
  },
  {
    slug: 'everyday-talisman-just-because',
    handle: 'everyday-talisman-just-because',
    label: 'Everyday Talisman Jewelry — Just Because',
    title: 'Everyday Talisman Jewelry — A Gift for No Reason at All',
    primaryQuery: 'just because jewelry gift',
    relatedQueries: [
      'everyday talisman necklace',
      'meaningful jewelry no occasion',
      'daily wear talisman',
      'symbolic everyday necklace',
      'thinking of you jewelry gift',
    ],
    holiday: 'Just Because',
    anchor: 'everyday talisman',
    tone: 'everyday',
    productFilters: ['raven', 'moon', 'feather', 'celtic', 'talisman'],
    hook: 'For the Tuesday afternoon she did not expect a small good thing to arrive.',
  },
];

export function getHoliday(slug: string): HolidayConfig | null {
  return HOLIDAYS.find((h) => h.slug === slug) ?? null;
}
