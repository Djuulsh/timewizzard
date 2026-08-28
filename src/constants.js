export const DEFAULT_ACCENT_COLOR = 0xF1C40F;
export const MAX_PROFILE_FILE_BYTES = 1_000_000;
export const MAX_ROWS_PER_MESSAGE = 10;

export const WOW_CLASSES = [
  { key: 'warrior', name: 'Warrior', emojiName: 'warrior', emojiId: '1387122765043335382' },
  { key: 'druid', name: 'Druid', emojiName: 'druid', emojiId: '1387122752590446632' },
  { key: 'hunter', name: 'Hunter', emojiName: 'hunter', emojiId: '1387122753970110464' },
  { key: 'mage', name: 'Mage', emojiName: 'mage', emojiId: '1387122756054679562' },
  { key: 'paladin', name: 'Paladin', emojiName: 'paladin', emojiId: '1387122758307282964' },
  { key: 'priest', name: 'Priest', emojiName: 'priest', emojiId: '1387122604170805379' },
  { key: 'rogue', name: 'Rogue', emojiName: 'rogue', emojiId: '1387122760240857098' },
  { key: 'shaman', name: 'Shaman', emojiName: 'shaman', emojiId: '1387122761704669277' },
  { key: 'warlock', name: 'Warlock', emojiName: 'warlock', emojiId: '1387122763407298622' }
];

export const RESOLUTIONS = [
  { key: 'fhd', name: 'FHD' },
  { key: 'qhd', name: 'QHD' }
];

export const PROFILE_ROWS = WOW_CLASSES.flatMap((wowClass) =>
  RESOLUTIONS.map((resolution) => ({ wowClass, resolution }))
);

export function findClass(key) {
  return WOW_CLASSES.find((item) => item.key === key) ?? null;
}

export function findResolution(key) {
  return RESOLUTIONS.find((item) => item.key === key) ?? null;
}
