import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const compactEmojiData = require('emojibase-data/en/compact.json');

export const DEFAULT_EMOJI_DATA_VERSION = '17.0.0';

const GROUP_CATEGORIES = Object.freeze({
  0: 'faces',
  1: 'people',
  3: 'nature',
  4: 'food',
  5: 'travel',
  6: 'activities',
  7: 'objects',
  8: 'symbols',
  9: 'flags'
});

function normalizeEmoji(entry, baseTags = []) {
  const emoji = String(entry?.unicode ?? '').trim();
  const name = String(entry?.label ?? '').trim();
  const category = GROUP_CATEGORIES[entry?.group];
  if (!emoji || !name || !category) return null;
  const search = [...new Set([name, ...baseTags].map((value) => String(value ?? '').trim()).filter(Boolean))].join(' ');
  return { emoji, name, category, search };
}

export function buildDefaultEmojiData(source = compactEmojiData) {
  const emojis = [];
  for (const entry of source ?? []) {
    const base = normalizeEmoji(entry, entry?.tags);
    if (!base) continue;
    emojis.push(base);
    for (const skin of entry.skins ?? []) {
      const variation = normalizeEmoji(skin, entry?.tags);
      if (variation) emojis.push(variation);
    }
  }
  return emojis;
}

export const DEFAULT_EMOJIS = Object.freeze(buildDefaultEmojiData());
