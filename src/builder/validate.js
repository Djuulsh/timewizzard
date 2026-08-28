import { isPublicHttpUrl } from '../utils.js';

const ALLOWED_TYPES = new Set([
  'text', 'image', 'gallery', 'thumbnail', 'separator', 'open', 'link', 'select', 'profile_select', 'profile_open_list'
]);

export function parseStrictHexColor(value) {
  const normalized = String(value ?? '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) throw new Error('Accentfarven skal være seks HEX-tegn, eksempelvis #F1C40F.');
  return Number.parseInt(normalized, 16);
}

export function colorToHex(color) {
  return `#${Number(color).toString(16).padStart(6, '0').toUpperCase()}`;
}

function validateMediaItem(item, label) {
  if (!item || !isPublicHttpUrl(item.url)) throw new Error(`${label} har en ugyldig URL.`);
  if (String(item.description ?? '').length > 1_000) throw new Error(`${label} beskrivelse er over 1000 tegn.`);
}

function validateActionGraph(actions) {
  const visiting = new Set();
  const visited = new Set();
  const walk = (id) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error('Nested ephemeral actions må ikke indeholde cirkulære links.');
    visiting.add(id);
    const action = actions[id];
    for (const child of action?.children ?? []) walk(child.actionId);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of Object.keys(actions)) walk(id);
}

export function validateBuilder(builder) {
  if (!builder || typeof builder !== 'object') throw new Error('Builder-data mangler.');
  if (builder.mode !== 'components_v2') throw new Error('Builderen understøtter kun components_v2 mode.');
  if (!Number.isInteger(builder.accentColor) || builder.accentColor < 0 || builder.accentColor > 0xFFFFFF) throw new Error('Builder accentColor er ugyldig.');
  if (!Array.isArray(builder.blocks) || builder.blocks.length > 25) throw new Error('Builderen kan højst have 25 blocks.');
  if (!builder.actions || typeof builder.actions !== 'object' || Array.isArray(builder.actions)) throw new Error('Builder actions skal være et objekt.');

  const ids = new Set();
  for (const block of builder.blocks) {
    if (!block || typeof block !== 'object' || !ALLOWED_TYPES.has(block.type)) throw new Error('Builderen indeholder en ukendt block-type.');
    if (!block.id || typeof block.id !== 'string' || block.id.length > 24 || ids.has(block.id)) throw new Error('Alle blocks skal have et unikt ID på maksimalt 24 tegn.');
    ids.add(block.id);

    if (block.type === 'text') {
      if (!String(block.content ?? '').trim() || String(block.content).length > 4_000) throw new Error('Text-blocks skal indeholde 1-4000 tegn.');
    }

    if (block.type === 'image') validateMediaItem(block, 'Image-block');

    if (block.type === 'gallery') {
      if (!Array.isArray(block.items) || block.items.length < 1 || block.items.length > 10) throw new Error('Media Gallery skal have 1-10 billeder.');
      block.items.forEach((item, index) => validateMediaItem(item, `Gallery item ${index + 1}`));
    }

    if (block.type === 'thumbnail') {
      validateMediaItem(block, 'Thumbnail-block');
      if (!String(block.text ?? '').trim() || String(block.text).length > 4_000) throw new Error('Thumbnail-block skal have 1-4000 tegn tekst.');
    }

    if (block.type === 'link') validateMediaItem(block, 'Link-block');

    if (block.type === 'open' || block.type === 'link') {
      if (!String(block.text ?? '').trim() || String(block.text).length > 4_000) throw new Error(`${block.type}-block mangler tekst eller er for lang.`);
      if (String(block.label ?? 'Open').length > 80) throw new Error(`${block.type}-button label er over 80 tegn.`);
    }

    if (block.type === 'open' && !block.actionId) throw new Error('Open-block mangler actionId.');
    if (block.type === 'profile_select' && String(block.placeholder ?? '').length > 150) throw new Error('MerfinUI select placeholder er over 150 tegn.');

    if (block.type === 'select') {
      if (!Array.isArray(block.options) || block.options.length < 1 || block.options.length > 25) throw new Error('Select-block skal have 1-25 options.');
      if (String(block.placeholder ?? '').length > 150) throw new Error('Select placeholder er over 150 tegn.');
      for (const option of block.options) {
        if (!option.label || option.label.length > 100 || !option.actionId) throw new Error('Select-option har ugyldig label eller actionId.');
        if (String(option.description ?? '').length > 100) throw new Error('Select-option description er over 100 tegn.');
      }
    }
  }

  for (const [id, action] of Object.entries(builder.actions)) {
    if (!id || id.length > 24 || !action || typeof action !== 'object') throw new Error('Builderen indeholder en ugyldig action.');
    if (action.type !== 'ephemeral_text') throw new Error(`Ukendt action-type: ${action.type}`);
    if (!String(action.content ?? '').trim() || String(action.content).length > 3_700) throw new Error(`Action ${id} har tom eller for lang svartekst.`);
    if (String(action.title ?? '').length > 180) throw new Error(`Action ${id} titel er for lang.`);

    if (action.children !== undefined) {
      if (!Array.isArray(action.children)) throw new Error(`Action ${id} children skal være en liste.`);
      const presentation = action.presentation === 'select' ? 'select' : 'buttons';
      const max = presentation === 'select' ? 25 : 5;
      if (action.children.length > max) throw new Error(`Action ${id} har for mange nested ${presentation === 'select' ? 'options' : 'buttons'}.`);
      for (const child of action.children) {
        if (!child?.label || String(child.label).length > 100 || !child.actionId) throw new Error(`Action ${id} har en ugyldig nested action.`);
        if (String(child.description ?? '').length > 100) throw new Error(`Nested action description er over 100 tegn.`);
      }
    }
  }

  for (const block of builder.blocks) {
    const references = [];
    if (block.actionId) references.push(block.actionId);
    for (const option of block.options ?? []) if (option.actionId) references.push(option.actionId);
    for (const actionId of references) if (!builder.actions[actionId]) throw new Error(`Block ${block.id} henviser til manglende action ${actionId}.`);

    if (block.type === 'select') {
      const editableLength = block.options.reduce((sum, option) => {
        const action = builder.actions[option.actionId];
        const response = String(action?.content ?? '').replaceAll('\n', '\\n');
        return sum + option.label.length + response.length + 4;
      }, 0);
      if (editableLength > 4_000) throw new Error('Select-blockets samlede options/svar er over 4000 tegn og kan ikke redigeres sikkert i Discord-builderen.');
    }
  }

  for (const [id, action] of Object.entries(builder.actions)) {
    for (const child of action.children ?? []) {
      if (!builder.actions[child.actionId]) throw new Error(`Nested action ${id} henviser til manglende action ${child.actionId}.`);
    }
  }
  validateActionGraph(builder.actions);
  return structuredClone(builder);
}
