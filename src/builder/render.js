import { MessageFlags } from 'discord.js';
import { RESOLUTIONS, WOW_CLASSES } from '../constants.js';
import { normalizeBuilderStructure, totalBuilderBlocks } from './schema.js';
import { isSmartBlockType, smartBlockToComponents } from './smartBlocks.js';
import { canonicalYoutubeUrl, youtubeThumbnailUrl } from './youtube.js';

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
  const resolutions = RESOLUTIONS.map((resolution) => `**${resolution.name}**`).join(' · ');
  const content = [
    '### MerfinUI profiles',
    ...WOW_CLASSES.map((wowClass) => `${customEmoji(wowClass)} **${wowClass.name}** — ${resolutions}`)
  ].join('\n');
  return [{ type: 10, content }];
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

function stringSelect(block, scope) {
  return {
    type: 1,
    components: [{
      type: 3,
      custom_id: `info_select:${scope.kind}:${scope.id}:${block.id}`,
      placeholder: block.placeholder || 'Vælg en string…',
      min_values: 1,
      max_values: 1,
      options: block.options.map((option) => ({
        label: option.label.slice(0, 100),
        value: `string:${option.id}`,
        ...(option.description ? { description: option.description.slice(0, 100) } : {})
      }))
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

function youtubeComponents(block) {
  const videoUrl = canonicalYoutubeUrl(block.url);
  if (!videoUrl) throw new Error('YouTube-blocket har en ugyldig URL.');
  const title = String(block.title || 'YouTube video').trim();
  const description = String(block.description || '').trim();
  const components = [];
  if (block.showThumbnail !== false) {
    components.push({
      type: 12,
      items: [{ media: { url: youtubeThumbnailUrl(block.url) }, description: `${title} thumbnail` }]
    });
  }
  const content = [`## ▶️ ${title}`, description].filter(Boolean).join('\n');
  if (block.showButton === false) {
    components.push({ type: 10, content });
  } else {
    components.push({
      type: 9,
      components: [{ type: 10, content }],
      accessory: {
        type: 2,
        style: 5,
        label: String(block.buttonLabel || 'Watch on YouTube').slice(0, 80),
        url: videoUrl
      }
    });
  }
  return components;
}

function contentBlockToComponents(block, scope) {
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
    case 'youtube':
      return youtubeComponents(block);
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
    case 'string_select': return [stringSelect(block, scope)];
    case 'profile_select': return [profileSelect(block, scope)];
    case 'profile_open_list': return profileOpenSections();
    default: {
      if (isSmartBlockType(block.type)) return smartBlockToComponents(block);
      throw new Error(`Ukendt builder block-type: ${block.type}`);
    }
  }
}

function splitContainer(container, scope) {
  const components = (container.children || []).flatMap((child) => contentBlockToComponents(child, scope));
  if (!components.length) return [];
  const chunks = [];
  let current = [];
  let currentCount = 1;
  let currentText = 0;

  const flush = () => {
    if (!current.length) return;
    chunks.push({ type: 17, accent_color: container.accentColor, components: current });
    current = [];
    currentCount = 1;
    currentText = 0;
  };

  for (const component of components) {
    const componentCount = countComponents(component);
    const textCount = countText(component);
    if (componentCount + 1 > MAX_COMPONENTS || textCount > MAX_TEXT) throw new Error('Et enkelt block i en container overskrider Discord-grænserne.');
    if (current.length && (currentCount + componentCount > MAX_COMPONENTS || currentText + textCount > MAX_TEXT)) flush();
    current.push(component);
    currentCount += componentCount;
    currentText += textCount;
  }
  flush();
  return chunks;
}

function topLevelComponents(entity, scope) {
  const builder = normalizeBuilderStructure(entity.builder, { preserveLegacyAppearance: true });
  const units = [];
  for (const block of builder.blocks) {
    const components = block.type === 'container' ? splitContainer(block, scope) : contentBlockToComponents(block, scope);
    if (components.length) units.push({ blockId: block.id, components });
  }
  return { builder, units, components: units.flatMap((unit) => unit.components) };
}

function packMessages(components) {
  const groups = [];
  let current = [];
  let currentCount = 0;
  let currentText = 0;
  for (const component of components) {
    const componentCount = countComponents(component);
    const textCount = countText(component);
    if (componentCount > MAX_COMPONENTS || textCount > MAX_TEXT) throw new Error('Et enkelt block/container overskrider Discord-grænserne.');
    if (current.length && (currentCount + componentCount > MAX_COMPONENTS || currentText + textCount > MAX_TEXT)) {
      groups.push(current);
      current = [];
      currentCount = 0;
      currentText = 0;
    }
    current.push(component);
    currentCount += componentCount;
    currentText += textCount;
  }
  if (current.length) groups.push(current);
  return groups;
}

function splitGroupsToTarget(groups, targetCount) {
  const result = groups.map((group) => [...group]);
  while (result.length < targetCount) {
    let splitIndex = -1;
    let largestSize = 1;
    for (let index = 0; index < result.length; index += 1) {
      if (result[index].length > largestSize) {
        largestSize = result[index].length;
        splitIndex = index;
      }
    }
    if (splitIndex < 0) break;
    const group = result[splitIndex];
    const midpoint = Math.ceil(group.length / 2);
    result.splice(splitIndex, 1, group.slice(0, midpoint), group.slice(midpoint));
  }
  return result;
}

function groupsForLayout(builder, units, components, { strict = true } = {}) {
  const automaticGroups = packMessages(components);
  const layout = builder.messageLayout ?? { mode: 'auto' };
  if (layout.mode === 'auto') return { groups: automaticGroups, automaticGroups };
  if (layout.mode === 'per_block') {
    return { groups: units.flatMap((unit) => packMessages(unit.components)), automaticGroups };
  }

  const targetCount = Number(layout.targetCount);
  if (!Number.isInteger(targetCount) || targetCount < automaticGroups.length) {
    const layoutError = `Discord limits require at least ${automaticGroups.length} messages for this post.`;
    if (strict) throw new Error(layoutError);
    return { groups: automaticGroups, automaticGroups, layoutError };
  }
  if (targetCount > components.length) {
    const layoutError = `This post can be split into at most ${components.length} non-empty messages with its current content.`;
    if (strict) throw new Error(layoutError);
    return { groups: automaticGroups, automaticGroups, layoutError };
  }
  return { groups: splitGroupsToTarget(automaticGroups, targetCount), automaticGroups };
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
  const { builder, units, components } = topLevelComponents(entity, scope);
  if (!components.length) {
    return {
      blockCount: totalBuilderBlocks(builder),
      rootCount: builder.blocks.length,
      componentCount: 0,
      textLength: 0,
      messageCount: 0,
      automaticMessageCount: 0,
      maximumMessageCount: 0,
      messageLayout: builder.messageLayout,
      layoutError: null,
      containerCount: builder.blocks.filter((block) => block.type === 'container').length
    };
  }
  const { groups, automaticGroups, layoutError = null } = groupsForLayout(builder, units, components, { strict: false });
  return {
    blockCount: totalBuilderBlocks(builder),
    rootCount: builder.blocks.length,
    componentCount: components.reduce((sum, component) => sum + countComponents(component), 0),
    textLength: components.reduce((sum, component) => sum + countText(component), 0),
    messageCount: groups.length,
    automaticMessageCount: automaticGroups.length,
    maximumMessageCount: components.length,
    messageLayout: builder.messageLayout,
    layoutError,
    containerCount: builder.blocks.filter((block) => block.type === 'container').length
  };
}

export function buildBuilderPayloads(entity, scope) {
  if (!entity?.builder?.blocks?.length) throw new Error('Opslaget har ingen blocks. Tilføj mindst ét block før Preview eller Publish.');
  const { builder, units, components } = topLevelComponents(entity, scope);
  if (!components.length) throw new Error('Opslaget har ingen publicerbart indhold. Tilføj mindst ét content block.');
  const { groups } = groupsForLayout(builder, units, components);
  const allowedMentions = allowedMentionsFor(entity);
  return groups.map((group) => ({
    flags: MessageFlags.IsComponentsV2,
    allowedMentions,
    components: group
  }));
}
