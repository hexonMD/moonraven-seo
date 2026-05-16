/**
 * Gift recipient pSEO configs — Tier 3.
 *
 * Deeper relationships and life-stages beyond Tier 2's mom/dad/daughter/son
 * pattern. Tier 2 already covers: gift-mom-raven, gift-mom-memorial,
 * gift-dad-skull, gift-dad-bronze, gift-dad-memorial, gift-daughter-talisman,
 * gift-daughter-graduation, gift-son-wolf, gift-sister-moon,
 * gift-brother-raven, gift-wife-anniversary, gift-husband-anniversary,
 * gift-grandmother, gift-grandfather-memorial, gift-witch,
 * gift-goth-girlfriend, gift-equestrian, gift-nature-lover,
 * gift-writer-raven, gift-pet-loss. Do not duplicate any of those.
 */

export type GiftRecipientConfig = {
  slug: string;
  handle: string;
  label: string;
  title: string;
  primaryQuery: string;
  relatedQueries: string[];
  // Recipient archetype — passed into copy generation
  recipient: string;
  // Emotional / symbolic anchor of the gift
  anchor: string;
  productFilters: string[];
  hook: string;
};

export const GIFT_RECIPIENTS_TIER3: GiftRecipientConfig[] = [
  {
    slug: 'gift-teen-witch-jewelry',
    handle: 'gift-teen-witch-jewelry',
    label: 'Jewelry Gifts for a Teen Witch',
    title: 'Jewelry Gifts for a Teen Witch',
    primaryQuery: 'gifts for teen witch',
    relatedQueries: [
      'witchy gifts for teenage girl',
      'jewelry for young witch',
      'pagan gift for teenager',
      'gothic gift teen girl',
      'baby witch starter jewelry',
    ],
    recipient: 'a teenage witch or young pagan practitioner',
    anchor: 'witch',
    productFilters: ['raven', 'moon', 'crescent', 'snake', 'feather', 'celtic'],
    hook: 'For the kid who reads tarot at the kitchen table and asks for an altar shelf for her birthday.',
  },
  {
    slug: 'gift-college-daughter-talisman',
    handle: 'gift-college-daughter-talisman',
    label: 'Talisman Jewelry Gifts for a College Daughter',
    title: 'Talisman Jewelry Gifts for a Daughter Leaving for College',
    primaryQuery: 'gift for college daughter jewelry',
    relatedQueries: [
      'going to college necklace daughter',
      'meaningful gift daughter college',
      'leaving home jewelry gift',
      'daughter freshman year gift',
      'symbolic going away gift college',
    ],
    recipient: 'a daughter starting college or university',
    anchor: 'talisman',
    productFilters: ['raven', 'moon', 'feather', 'talisman', 'celtic'],
    hook: 'For the dorm-room desk three thousand miles away from the kitchen she grew up in.',
  },
  {
    slug: 'gift-stepmom-meaningful-jewelry',
    handle: 'gift-stepmom-meaningful-jewelry',
    label: 'Meaningful Jewelry Gifts for a Stepmom',
    title: 'Meaningful Jewelry Gifts for a Stepmom',
    primaryQuery: 'meaningful gift for stepmom',
    relatedQueries: [
      'stepmom necklace gift',
      'jewelry for stepmother',
      'meaningful stepmom mothers day gift',
      'symbolic gift for stepmom',
      'thoughtful stepmom jewelry',
    ],
    recipient: 'a stepmother',
    anchor: 'stepmother',
    productFilters: ['raven', 'moon', 'celtic', 'feather', 'antler'],
    hook: 'For the woman who arrived in the middle of the story and stayed.',
  },
  {
    slug: 'gift-best-friend-symbolic-jewelry',
    handle: 'gift-best-friend-symbolic-jewelry',
    label: 'Symbolic Jewelry Gifts for a Best Friend',
    title: 'Symbolic Jewelry Gifts for a Best Friend',
    primaryQuery: 'meaningful jewelry gift for best friend',
    relatedQueries: [
      'symbolic best friend necklace',
      'soul sister jewelry gift',
      'meaningful gift for female friend',
      'best friend talisman necklace',
      'unique best friend jewelry gift',
    ],
    recipient: 'a best friend (chosen family)',
    anchor: 'friendship',
    productFilters: ['raven', 'moon', 'celtic', 'feather', 'talisman'],
    hook: 'For the friend who showed up in the years when nobody had to.',
  },
  {
    slug: 'gift-female-mentor-jewelry',
    handle: 'gift-female-mentor-jewelry',
    label: 'Jewelry Gifts for a Female Mentor',
    title: 'Meaningful Jewelry Gifts for a Female Mentor',
    primaryQuery: 'gift for female mentor jewelry',
    relatedQueries: [
      'thank you gift mentor woman',
      'meaningful gift female teacher',
      'thoughtful gift female boss',
      'jewelry gift for woman mentor',
      'symbolic thank you mentor',
    ],
    recipient: 'a female mentor, teacher, or guide',
    anchor: 'mentor',
    productFilters: ['raven', 'moon', 'celtic', 'antler', 'talisman'],
    hook: 'For the woman who said the thing you needed to hear at the moment you could not yet say it yourself.',
  },
  {
    slug: 'gift-creative-woman-jewelry',
    handle: 'gift-creative-woman-jewelry',
    label: 'Jewelry Gifts for a Creative Woman',
    title: 'Jewelry Gifts for a Creative or Artist Woman',
    primaryQuery: 'jewelry gift for creative woman',
    relatedQueries: [
      'gift for artist woman',
      'jewelry gift for painter',
      'meaningful gift creative friend',
      'jewelry for maker woman',
      'thoughtful gift artist',
    ],
    recipient: 'a creative, an artist, or a maker',
    anchor: 'creative practice',
    productFilters: ['raven', 'moon', 'feather', 'talisman', 'celtic'],
    hook: 'For the friend whose studio smells like coffee and turpentine in equal measure.',
  },
  {
    slug: 'gift-empath-protection-jewelry',
    handle: 'gift-empath-protection-jewelry',
    label: 'Protection Jewelry Gifts for an Empath',
    title: 'Protection Jewelry Gifts for an Empath',
    primaryQuery: 'protection jewelry for empath',
    relatedQueries: [
      'empath gift jewelry',
      'protection necklace highly sensitive',
      'jewelry for empathic person',
      'amulet gift for empath',
      'shielding jewelry empath',
    ],
    recipient: 'an empath or highly sensitive person',
    anchor: 'protection',
    productFilters: ['snake', 'moon', 'celtic', 'eye', 'talisman'],
    hook: 'For the friend who feels the room before she walks into it.',
  },
  {
    slug: 'gift-yoga-teacher-jewelry',
    handle: 'gift-yoga-teacher-jewelry',
    label: 'Jewelry Gifts for a Yoga Teacher',
    title: 'Meaningful Jewelry Gifts for a Yoga Teacher',
    primaryQuery: 'gift for yoga teacher jewelry',
    relatedQueries: [
      'yoga teacher thank you gift',
      'meaningful gift yoga instructor',
      'jewelry for yoga practitioner',
      'thoughtful yoga teacher gift',
      'symbolic gift yoga teacher',
    ],
    recipient: 'a yoga teacher or longtime practitioner',
    anchor: 'practice',
    productFilters: ['moon', 'snake', 'celtic', 'feather', 'talisman'],
    hook: 'For the teacher whose voice you can still hear at the bottom of a hard breath.',
  },
  {
    slug: 'gift-pagan-friend-jewelry',
    handle: 'gift-pagan-friend-jewelry',
    label: 'Jewelry Gifts for a Pagan Friend',
    title: 'Meaningful Jewelry Gifts for a Pagan Friend',
    primaryQuery: 'gift for pagan friend jewelry',
    relatedQueries: [
      'pagan jewelry gift',
      'heathen gift jewelry',
      'meaningful gift pagan woman',
      'witch friend jewelry gift',
      'pagan necklace gift',
    ],
    recipient: 'a pagan, heathen, or earth-religion practitioner',
    anchor: 'pagan',
    productFilters: ['raven', 'moon', 'celtic', 'norse', 'snake', 'antler'],
    hook: 'For the friend whose calendar runs on solstices, not Sundays.',
  },
  {
    slug: 'gift-grandma-memorial-jewelry',
    handle: 'gift-grandma-memorial-jewelry',
    label: 'Memorial Jewelry Gift for Someone Who Lost Their Grandma',
    title: 'Memorial Jewelry for the Loss of a Grandmother',
    primaryQuery: 'memorial gift for someone who lost their grandma',
    relatedQueries: [
      'grandma memorial necklace gift',
      'sympathy gift loss of grandmother',
      'remembrance jewelry grandma died',
      'keepsake for granddaughter grandma death',
      'in memory of grandma gift',
    ],
    recipient: 'someone grieving the loss of their grandmother',
    anchor: 'memorial',
    productFilters: ['memorial', 'cremation', 'urn', 'keepsake', 'feather'],
    hook: 'For the kitchen that smells like nothing the way it used to.',
  },
];

export function getGiftRecipientTier3(slug: string): GiftRecipientConfig | null {
  return GIFT_RECIPIENTS_TIER3.find((g) => g.slug === slug) ?? null;
}
