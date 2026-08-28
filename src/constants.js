export const VERSION = '2.0.0-clean';

export const WOW_CLASSES = [
  { key: 'warrior', name: 'Warrior', emoji: { name: 'warrior', id: '1387122765043335382' } },
  { key: 'druid', name: 'Druid', emoji: { name: 'druid', id: '1387122752590446632' } },
  { key: 'hunter', name: 'Hunter', emoji: { name: 'hunter', id: '1387122753970110464' } },
  { key: 'mage', name: 'Mage', emoji: { name: 'mage', id: '1387122756054679562' } },
  { key: 'paladin', name: 'Paladin', emoji: { name: 'paladin', id: '1387122758307282964' } },
  { key: 'priest', name: 'Priest', emoji: { name: 'priest', id: '1387122604170805379' } },
  { key: 'rogue', name: 'Rogue', emoji: { name: 'rogue', id: '1387122760240857098' } },
  { key: 'shaman', name: 'Shaman', emoji: { name: 'shaman', id: '1387122761704669277' } },
  { key: 'warlock', name: 'Warlock', emoji: { name: 'warlock', id: '1387122763407298622' } }
];

export const RESOLUTIONS = [
  { key: 'fhd', name: 'FHD' },
  { key: 'qhd', name: 'QHD' }
];

export const DEFAULT_COLOR = 0xF1C40F;

export function getClass(classKey) {
  return WOW_CLASSES.find((item) => item.key === classKey);
}

export function getResolution(resolutionKey) {
  return RESOLUTIONS.find((item) => item.key === resolutionKey);
}
