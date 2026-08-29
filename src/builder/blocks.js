import { makeShortId } from './ids.js';

export function makeContainerBlock({ label = 'New embed', accentColor = 0xF1C40F } = {}) {
  return { id: makeShortId(3), type: 'container', label, accentColor };
}

export function makeTextBlock(content) {
  return { id: makeShortId(3), type: 'text', content };
}

export function makeImageBlock(url, description = '') {
  return { id: makeShortId(3), type: 'image', url, description };
}

export function makeGalleryBlock(items = []) {
  return {
    id: makeShortId(3),
    type: 'gallery',
    items: items.map((item) => ({
      url: String(item.url ?? '').trim(),
      description: String(item.description ?? '').trim(),
      spoiler: Boolean(item.spoiler)
    }))
  };
}

export function makeThumbnailBlock({ text, url, description = '', spoiler = false }) {
  return {
    id: makeShortId(3),
    type: 'thumbnail',
    text,
    url,
    description,
    spoiler: Boolean(spoiler)
  };
}

export function makeSeparatorBlock() {
  return { id: makeShortId(3), type: 'separator', divider: true, spacing: 2 };
}

export function makeOpenBlock({ text, label, title, response }) {
  const actionId = makeShortId(4);
  return {
    block: { id: makeShortId(3), type: 'open', text, label: label || 'Open', actionId },
    actions: [{ id: actionId, type: 'ephemeral_text', title: title || '', content: response, children: [], presentation: 'buttons' }]
  };
}

export function makeLinkBlock({ text, label, url }) {
  return { id: makeShortId(3), type: 'link', text, label: label || 'Open', url };
}

function decodeEscapedNewlines(value) {
  return value.replaceAll('\\n', '\n').trim();
}

export function parseSelectOptions(specification) {
  const lines = String(specification ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error('Tilføj mindst én select-option.');
  if (lines.length > 25) throw new Error('En Discord String Select kan højst have 25 options.');

  return lines.map((line, index) => {
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length < 2) throw new Error(`Option ${index + 1} skal bruge formatet: Label | Svartekst`);
    const label = parts.shift();
    const response = decodeEscapedNewlines(parts.join('|'));
    if (!label || !response) throw new Error(`Option ${index + 1} mangler label eller svartekst.`);
    if (label.length > 100) throw new Error(`Option ${index + 1} label er over 100 tegn.`);
    if (response.length > 3_700) throw new Error(`Option ${index + 1} svartekst er for lang.`);
    return { label, response };
  });
}

export function makeSelectBlock({ placeholder, specification }) {
  const definitions = parseSelectOptions(specification);
  const actions = definitions.map((definition) => ({
    id: makeShortId(4),
    type: 'ephemeral_text',
    title: definition.label,
    content: definition.response,
    children: [],
    presentation: 'buttons'
  }));

  return {
    block: {
      id: makeShortId(3),
      type: 'select',
      placeholder: placeholder || 'Vælg en mulighed…',
      options: definitions.map((definition, index) => ({ label: definition.label, actionId: actions[index].id }))
    },
    actions
  };
}

export function serializeSelectOptions(block, actions) {
  return (block.options ?? []).map((option) => {
    const response = String(actions?.[option.actionId]?.content ?? '').replaceAll('\n', '\\n');
    return `${option.label} | ${response}`;
  }).join('\n');
}

export function makeProfileSelectBlock() {
  return { id: makeShortId(3), type: 'profile_select', placeholder: 'Vælg class og opløsning…' };
}

export function makeProfileOpenListBlock() {
  return { id: makeShortId(3), type: 'profile_open_list' };
}

export function addNestedAction(builder, parentActionId, { label, title, content, description = '', presentation = null }) {
  const parent = builder.actions?.[parentActionId];
  if (!parent) throw new Error('Parent action blev ikke fundet.');
  const id = makeShortId(4);
  builder.actions[id] = {
    id,
    type: 'ephemeral_text',
    title: title || label || '',
    content,
    children: [],
    presentation: 'buttons'
  };
  if (!Array.isArray(parent.children)) parent.children = [];
  if (presentation) parent.presentation = presentation === 'select' ? 'select' : 'buttons';
  parent.children.push({ label, description, actionId: id });
  return builder.actions[id];
}

function cloneActionTree(builder, actionId, seen = new Map()) {
  if (seen.has(actionId)) return seen.get(actionId);
  const source = builder.actions?.[actionId];
  if (!source) return null;
  const id = makeShortId(4);
  seen.set(actionId, id);
  const copy = { ...structuredClone(source), id, children: [] };
  builder.actions[id] = copy;
  copy.children = (source.children ?? []).map((child) => {
    const cloned = cloneActionTree(builder, child.actionId, seen);
    if (!cloned) throw new Error('En nested action kunne ikke duplikeres.');
    return { ...structuredClone(child), actionId: cloned };
  });
  return id;
}

export function duplicateBuilderBlock(builder, blockId) {
  const index = builder.blocks.findIndex((block) => block.id === blockId);
  if (index < 0) throw new Error('Blocket findes ikke længere.');
  if (builder.blocks.length >= 25) throw new Error('Builderen kan højst have 25 blocks.');

  const copy = structuredClone(builder.blocks[index]);
  copy.id = makeShortId(3);
  const seen = new Map();

  if (copy.actionId) {
    const nextActionId = cloneActionTree(builder, copy.actionId, seen);
    if (!nextActionId) throw new Error('Blockets action kunne ikke duplikeres.');
    copy.actionId = nextActionId;
  }

  if (Array.isArray(copy.options)) {
    copy.options = copy.options.map((option) => {
      if (!option.actionId) return option;
      const nextActionId = cloneActionTree(builder, option.actionId, seen);
      if (!nextActionId) throw new Error('En select-action kunne ikke duplikeres.');
      return { ...option, actionId: nextActionId };
    });
  }

  builder.blocks.splice(index + 1, 0, copy);
  return copy;
}
