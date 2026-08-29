import { MessageFlags } from 'discord.js';
import { RESOLUTIONS, WOW_CLASSES } from '../constants.js';

const MAX_COMPONENTS = 40;
const MAX_TEXT = 4_000;
export const MULTILINE_QUOTE_ESCAPE = '\\>>>';

function countComponents(component) {
  let count = 1;
  if (Array.isArray(component.components)) {
    for (const child of component.components) count += countComponents(child);
  }
  if (component.accessory) count += countComponents(component.accessory);
  return count;
}

function countText(component) {
  let count = component.type === 10 ? String(component.content ?? '').length : 0;
  if (Array.isArray(component.components)) {
    for (const child of component.components) count += countText(child);
  }
  return count;
}

function customEmoji(wowClass) {
  return `<:${wowClass.emojiName}:${wowClass.emojiId}>`;
}

function emojiObject(wowClass) {
  return { name: wowClass.emojiName, id: wowClass.emojiId };
}

function splitTextDisplays(content) {
  const lines = String(content ?? '').split(/\r?\n/);
  const segments = [];
  let current = [];
  const flush = () => {
    const text = current.join('\n').replace(/^\n+|\n+$/g, '');
    if (text) segments.push(text);
    current = [];
  };

  for (const line of lines) {
    if (line.trim() === MULTILINE_QUOTE_ESCAPE) {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return segments.length ? segments : [''];
}

function profileOpenSections() {
  return WOW_CLASSES.flatMap((wowClass) =>
    RESOLUTIONS.map((resolution) => ({
      type: 9,
      components: [{ type: 10, content: `🔗 • ${customEmoji(wowClass)} **${wowClass.name} — ${resolution.name}**` }],
      accessory: {
        type: 2,
        style: 2,
        label: 'Open',
        custom_id: `profile:${wowClass.key}:${resolution.key}`
      }
    }))
  );
}

function profileSelect(block, scope) {
  return {
    type: 1,
    components: [{
      type: 3,
      custom_id: `info_select:${scope.kind}:${scope.id}:${block.id}`,
      placeholder: block.placeholder || 'Vælg class og opløsning…',
      min_values: 1,
      max_values: 1,
      options: WOW_CLASSES.flatMap((wowClass) =>
        RESOLUTIONS.map((resolution) => ({
          label: `${wowClass.name} — ${resolution.name}`,
          value: `profile:${wowClass.key}:${resolution.key}`,
          description: `Modtag ${wowClass.name} ${resolution.name} privat`,
          emoji: emojiObject(wowClass)
        }))
      )
    }]
  };
}

function genericSelect(block, scope) {
  return {
    type: 1,
    components: [{
      type: 3,
      custom_id: `info_select:${scope.kind}:${scope.id}:${block.id}`,
      placeholder: block.placeholder || 'Vælg en mulighed…',
      min_values: 1,
      max_values: 1,
      options: block.options.map((option) => ({
        label: option.label.slice(0, 100),
        value: `action:${option.actionId}`,
        ...(option.description ? { description: option.description.slice(0, 100) } : {})
      }))
    }]
  };
}

function mediaItem(item) {
  return {
    media: { url: item.url },
    ...(item.description ? { description: item.description } : {}),
    ...(item.spoiler ? { spoiler: true } : {})
  };
}

function blockToComponents(block, scope) {
  switch (block.type) {
    case 'text':
      return splitTextDisplays(block.content).map((content) => ({ type: 10, content }));

    case 'image':
      return [{ type: 12, items: [mediaItem(block)] }];

    case 'gallery':
      return [{ type: 12, items: block.items.map(mediaItem) }];

    case 'thumbnail':
      return [{
        type: 9,
        components: [{ type: 10, content: block.text }],
        accessory: {
          type: 11,
          media: { url: block.url },
          ...(block.description ? { description: block.description } : {}),
          ...(block.spoiler ? { spoiler: true } : {})
        }
      }];

    case 'separator':
      return [{ type: 14, divider: block.divider !== false, spacing: block.spacing === 1 ? 1 : 2 }];

    case 'open':
      return [{
        type: 9,
        components: [{ type: 10, content: block.text }],
        accessory: {
          type: 2,
          style: 2,
          label: (block.label || 'Open').slice(0, 80),
          custom_id: `info_action:${scope.kind}:${scope.id}:${block.actionId}`
        }
      }];

    case 'link':
      return [{
        type: 9,
        components: [{ type: 10, content: block.text }],
        accessory: {
          type: 2,
          style: 5,
          label: (block.label || 'Open').slice(0, 80),
          url: block.url
        }
      }];

    case 'select': return [genericSelect(block, scope)];
    case 'profile_select': return [profileSelect(block, scope)];
    case 'profile_open_list': return profileOpenSections();
    default: throw new Error(`Ukendt builder block-type: ${block.type}`);
  }
}

export function allowedMentionsFor(entity) {
  const policy = entity?.mentionPolicy;
  if (policy?.mode !== 'selected') return { parse: [], replied_user: false };
  const snowflake = /^\d{16,22}$/;
  const users = [...new Set((Array.isArray(policy.users) ? policy.users : []).map(String).filter((id) => snowflake.test(id)))].slice(0, 100);
  const roles = [...new Set((Array.isArray(policy.roles) ? policy.roles : []).map(String).filter((id) => snowflake.test(id)))].slice(0, 100);
  return { parse: [], users, roles, replied_user: false };
}

export function getBuilderStats(entity, scope = { kind: 'd', id: 'preview' }) {
  const components = entity.builder.blocks.flatMap((block) => blockToComponents(block, scope));
  if (components.length === 0) return { blockCount: 0, componentCount: 0, textLength: 0, messageCount: 0 };

  let messageCount = 1;
  let messageComponents = 1;
  let messageText = 0;
  let totalComponents = 0;
  let totalText = 0;

  for (const component of components) {
    const componentCount = countComponents(component);
    const textCount = countText(component);
    if (componentCount + 1 > MAX_COMPONENTS || textCount > MAX_TEXT) throw new Error('Et enkelt builder-block overskrider Discord-grænserne.');
    if (messageComponents + componentCount > MAX_COMPONENTS || messageText + textCount > MAX_TEXT) {
      messageCount += 1;
      messageComponents = 1;
      messageText = 0;
    }
    messageComponents += componentCount;
    messageText += textCount;
    totalComponents += componentCount;
    totalText += textCount;
  }

  return { blockCount: entity.builder.blocks.length, componentCount: totalComponents, textLength: totalText, messageCount };
}

export function buildBuilderPayloads(entity, scope) {
  if (!entity?.builder?.blocks?.length) throw new Error('Opslaget har ingen blocks. Tilføj mindst ét block før Preview eller Publish.');

  const components = entity.builder.blocks.flatMap((block) => blockToComponents(block, scope));
  const groups = [];
  let current = [];
  let currentComponentCount = 1;
  let currentText = 0;

  for (const component of components) {
    const componentCount = countComponents(component);
    const textCount = countText(component);
    if (componentCount + 1 > MAX_COMPONENTS || textCount > MAX_TEXT) throw new Error('Et enkelt builder-block overskrider Discord-grænserne.');
    if (current.length > 0 && (currentComponentCount + componentCount > MAX_COMPONENTS || currentText + textCount > MAX_TEXT)) {
      groups.push(current);
      current = [];
      currentComponentCount = 1;
      currentText = 0;
    }
    current.push(component);
    currentComponentCount += componentCount;
    currentText += textCount;
  }
  if (current.length > 0) groups.push(current);

  const allowedMentions = allowedMentionsFor(entity);
  return groups.map((group) => ({
    flags: MessageFlags.IsComponentsV2,
    allowedMentions,
    components: [{ type: 17, accent_color: entity.builder.accentColor, components: group }]
  }));
}
