import { makeShortId } from './builder/ids.js';
import { BUILDER_SCHEMA_VERSION } from './builder/schema.js';
import { validateBuilder } from './builder/validate.js';

function block(type, values = {}) {
  return { id: makeShortId(3), type, ...values };
}

function container(label, accentColor, children = []) {
  return block('container', { label, accentColor, collapsed: false, children });
}

function textFromEmbed(embed) {
  const parts = [];
  if (embed.title) parts.push(`# ${embed.url ? `[${embed.title}](${embed.url})` : embed.title}`);
  if (embed.description) parts.push(embed.description);
  for (const field of embed.fields ?? []) {
    parts.push(`## ${field.name || 'Field'}`);
    parts.push(field.value || '');
  }
  if (embed.footer?.text) parts.push(`-# ${embed.footer.text}`);
  return parts.filter(Boolean).join('\n');
}

function walkV2Content(components, builder, warnings, target) {
  for (const component of components ?? []) {
    if (!component || typeof component !== 'object') continue;
    if (component.type === 17) {
      const children = [];
      walkV2Content(component.components, builder, warnings, children);
      if (children.length) {
        target.push(container('Imported container', Number.isInteger(component.accent_color) ? component.accent_color : builder.accentColor, children));
      }
      continue;
    }
    if (component.type === 10 && component.content) {
      target.push(block('text', { content: String(component.content).slice(0, 4000) }));
      continue;
    }
    if (component.type === 14) {
      target.push(block('separator', { divider: component.divider !== false, spacing: component.spacing === 1 ? 1 : 2 }));
      continue;
    }
    if (component.type === 12 && Array.isArray(component.items)) {
      const items = component.items.map((item) => ({
        url: item?.media?.url || item?.url || '',
        description: item?.description || '',
        spoiler: Boolean(item?.spoiler)
      })).filter((item) => /^https?:\/\//i.test(item.url));
      if (items.length === 1) target.push(block('image', items[0]));
      else if (items.length > 1) target.push(block('gallery', { items: items.slice(0, 10) }));
      continue;
    }
    if (component.type === 9) {
      const text = (component.components ?? []).filter((child) => child.type === 10).map((child) => child.content).join('\n');
      const accessory = component.accessory;
      if (accessory?.type === 11 && accessory.media?.url) {
        target.push(block('thumbnail', {
          text: text || '-# Thumbnail',
          url: accessory.media.url,
          description: accessory.description || '',
          spoiler: Boolean(accessory.spoiler)
        }));
      } else if (accessory?.type === 2 && accessory.style === 5 && accessory.url) {
        target.push(block('link', { text: text || `🔗 **${accessory.label || 'Link'}**`, label: accessory.label || 'Open', url: accessory.url }));
      } else {
        if (text) target.push(block('text', { content: text }));
        if (accessory) warnings.push('A non-link Section accessory could not be converted automatically.');
      }
      continue;
    }
    if (component.type === 1) {
      for (const child of component.components ?? []) {
        if (child.type === 2 && child.style === 5 && child.url) {
          target.push(block('link', { text: `🔗 **${child.label || 'Link'}**`, label: child.label || 'Open', url: child.url }));
        } else {
          warnings.push('An interactive Action Row component was skipped because DiscoHook does not contain a Timewizzard response action.');
        }
      }
      continue;
    }
    warnings.push(`Unsupported DiscoHook component type ${component.type} was skipped.`);
  }
}

export function convertDiscohook(input, titleOverride = null) {
  const source = typeof input === 'string' ? JSON.parse(input) : input;
  if (!source || typeof source !== 'object') throw new Error('DiscoHook JSON skal være et JSON-objekt.');
  const message = Array.isArray(source.messages) ? source.messages[0] ?? {} : source;
  const warnings = [];
  const builder = {
    schemaVersion: BUILDER_SCHEMA_VERSION,
    mode: 'components_v2',
    accentColor: 0xF1C40F,
    blocks: [],
    actions: {}
  };

  if (message.content) builder.blocks.push(block('text', { content: String(message.content).slice(0, 4000) }));

  for (const [index, embed] of (message.embeds ?? []).entries()) {
    const children = [];
    const text = textFromEmbed(embed);
    if (text) children.push(block('text', { content: text.slice(0, 4000) }));
    const imageUrl = embed.image?.url;
    if (imageUrl) children.push(block('image', { url: imageUrl, description: embed.title || '' }));
    if (embed.thumbnail?.url) {
      children.push(block('thumbnail', {
        text: embed.description ? String(embed.description).slice(0, 4000) : '-# Imported thumbnail',
        url: embed.thumbnail.url,
        description: embed.title || '',
        spoiler: false
      }));
    }
    if (children.length) builder.blocks.push(container(embed.title || `Imported embed ${index + 1}`, Number.isInteger(embed.color) ? embed.color : builder.accentColor, children));
  }

  walkV2Content(message.components, builder, warnings, builder.blocks);
  if (!builder.blocks.length) throw new Error('Ingen understøttet tekst, embeds eller Components V2-indhold blev fundet i DiscoHook JSON.');

  const title = String(titleOverride || message.thread_name || message.title || message.embeds?.[0]?.title || 'Imported DiscoHook').slice(0, 100);
  return { title, builder: validateBuilder(builder), warnings };
}
