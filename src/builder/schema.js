import { DEFAULT_ACCENT_COLOR } from '../constants.js';
import { makeShortId } from './ids.js';

export const BUILDER_SCHEMA_VERSION = 2;
const LEGACY_DOWNLOAD_LABELS = new Set(['MerfinUI_v7.80.zip', 'TBC_AddOns.zip']);

function migrateKnownDownloadSelector(block) {
  if (block?.type !== 'string_select' || !Array.isArray(block.options) || block.options.length !== LEGACY_DOWNLOAD_LABELS.size) return cloneBlock(block);
  const labels = new Set(block.options.map((option) => String(option?.label ?? '')));
  if (labels.size !== LEGACY_DOWNLOAD_LABELS.size || [...LEGACY_DOWNLOAD_LABELS].some((label) => !labels.has(label))) return cloneBlock(block);

  const buttons = block.options.map((option) => {
    const match = String(option.content ?? '').match(/\]\((https?:\/\/[^\s)]+)\)/i);
    return match ? { label: `Download ${String(option.label)}`, url: match[1] } : null;
  });
  if (buttons.some((button) => !button)) return cloneBlock(block);
  return { id: block.id || makeShortId(3), type: 'button_row', buttons };
}

function cloneBlock(block) {
  return structuredClone(block);
}

function containerFromMarker(marker, fallbackAccent) {
  return {
    id: marker?.id || makeShortId(3),
    type: 'container',
    label: String(marker?.label || 'Embed').slice(0, 80),
    accentColor: Number.isInteger(marker?.accentColor) ? marker.accentColor : fallbackAccent,
    collapsed: false,
    children: []
  };
}

function isNestedV2(builder) {
  return Number(builder?.schemaVersion) >= BUILDER_SCHEMA_VERSION &&
    Array.isArray(builder?.blocks) &&
    builder.blocks.every((block) => block?.type !== 'container' || Array.isArray(block.children));
}

/**
 * Converts the old flat v1/v1.3.2 marker model to the v1.4 hierarchy.
 * Existing layouts are wrapped in explicit containers so their published
 * appearance is preserved. New schema-v2 builders can contain plain root
 * blocks and optional nested containers.
 */
export function normalizeBuilderStructure(input, { preserveLegacyAppearance = true } = {}) {
  if (!input || typeof input !== 'object') return input;
  const builder = structuredClone(input);
  builder.mode = builder.mode || 'components_v2';
  builder.actions = builder.actions && typeof builder.actions === 'object' && !Array.isArray(builder.actions) ? builder.actions : {};
  builder.accentColor = Number.isInteger(builder.accentColor) ? builder.accentColor : DEFAULT_ACCENT_COLOR;
  builder.blocks = Array.isArray(builder.blocks) ? builder.blocks : [];

  if (isNestedV2(builder)) {
    builder.schemaVersion = BUILDER_SCHEMA_VERSION;
    builder.blocks = builder.blocks.map((block) => {
      if (block.type !== 'container') return migrateKnownDownloadSelector(block);
      return {
        ...cloneBlock(block),
        label: String(block.label || 'Embed').slice(0, 80),
        accentColor: Number.isInteger(block.accentColor) ? block.accentColor : builder.accentColor,
        children: (block.children || []).filter((child) => child?.type !== 'container').map(migrateKnownDownloadSelector)
      };
    });
    return builder;
  }

  // Empty old drafts should stay truly empty/plain rather than gaining an
  // invisible container during migration.
  if (!builder.blocks.length) {
    builder.schemaVersion = BUILDER_SCHEMA_VERSION;
    return builder;
  }

  if (!preserveLegacyAppearance) {
    builder.schemaVersion = BUILDER_SCHEMA_VERSION;
    builder.blocks = builder.blocks.filter((block) => block?.type !== 'container').map(migrateKnownDownloadSelector);
    return builder;
  }

  const roots = [];
  let current = containerFromMarker({ label: 'Primary embed', accentColor: builder.accentColor }, builder.accentColor);

  const flush = () => {
    if (!current.children.length) return;
    roots.push(current);
  };

  for (const rawBlock of builder.blocks) {
    if (!rawBlock || typeof rawBlock !== 'object') continue;
    if (rawBlock.type === 'container') {
      flush();
      current = containerFromMarker(rawBlock, builder.accentColor);
      continue;
    }
    current.children.push(migrateKnownDownloadSelector(rawBlock));
  }
  flush();

  builder.schemaVersion = BUILDER_SCHEMA_VERSION;
  builder.blocks = roots;
  return builder;
}

export function totalBuilderBlocks(builder) {
  return (builder?.blocks || []).reduce((total, block) => total + 1 + (block?.type === 'container' ? (block.children?.length || 0) : 0), 0);
}

export function walkBuilderBlocks(builder, callback) {
  for (const block of builder?.blocks || []) {
    callback(block, null);
    if (block?.type === 'container') {
      for (const child of block.children || []) callback(child, block);
    }
  }
}

export function findBuilderBlock(builder, blockId) {
  for (const block of builder?.blocks || []) {
    if (block.id === blockId) return { block, parent: null, list: builder.blocks, index: builder.blocks.indexOf(block) };
    if (block?.type === 'container') {
      const index = (block.children || []).findIndex((child) => child.id === blockId);
      if (index >= 0) return { block: block.children[index], parent: block, list: block.children, index };
    }
  }
  return null;
}

export function removeBuilderBlock(builder, blockId, { keepChildren = false } = {}) {
  const found = findBuilderBlock(builder, blockId);
  if (!found) return null;
  const [removed] = found.list.splice(found.index, 1);
  if (removed?.type === 'container' && keepChildren && !found.parent) {
    found.list.splice(found.index, 0, ...(removed.children || []));
  }
  return removed;
}
