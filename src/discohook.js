import { makeShortId } from './builder/ids.js';
import { validateBuilder } from './builder/validate.js';

function block(type, values = {}) {
  return { id: makeShortId(3), type, ...values };
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

function walkV2(components, builder, warnings, context = { containerCount: 0 }) {
  for (const component of components ?? []) {
    if (!component || typeof component !== 'object') continue;
    if (component.type === 17) {
      const accentColor = Number.isInteger(component.accent_color) ? component.accent_color : builder.accentColor;
      if (context.containerCount === 0 && builder.blocks.length === 0) builder.accentColor = accentColor;
      else builder.blocks.push(block('container', { label: `Imported container ${context.containerCount + 1}`, accentColor }));
      context.containerCount += 1;
      walkV2(component.components, builder, warnings, context);
      continue;
    }
    if (component.type === 10 && component.content) {
      builder.blocks.push(block('text', { content: String(component.content).slice(0, 4000) }));
      continue;
    }
    if (component.type === 14) {
      builder.blocks.push(block('separator', { divider: component.divider !== false, spacing: component.spacing === 1 ? 1 : 2 }));
      continue;
    }
    if (component.type === 12 && Array.isArray(component.items)) {
      const items = component.items.map((item) => ({
        url: item?.media?.url || item?.url || '',
        description: item?.description || '',
        spoiler: Boolean(item?.spoiler)
      })).filter((item) => /^https?:\/\//i.test(item.url));
      if (items.length === 1) builder.blocks.push(block('image', items[0]));
      else if (items.length > 1) builder.blocks.push(block('gallery', { items: items.slice(0, 10) }));
      continue;
    }
    if (component.type === 9) {
      const text = (component.components ?? []).filter((child) => child.type === 10).map((child) => child.content).join('\n');
      const accessory = component.accessory;
      if (accessory?.type === 11 && accessory.media?.url) {
        builder.blocks.push(block('thumbnail', {
          text: text || '-# Thumbnail',
          url: accessory.media.url,
          description: accessory.description || '',
          spoiler: Boolean(accessory.spoiler)
        }));
      } else if (accessory?.type === 2 && accessory.style === 5 && accessory.url) {
        builder.blocks.push(block('link', { text: text || `🔗 **${accessory.label || 'Link'}**`, label: accessory.label || 'Open', url: accessory.url }));
      } else {
        if (text) builder.blocks.push(block('text', { content: text }));
        if (accessory) warnings.push('A non-link Section accessory could not be converted automatically.');
      }
      continue;
    }
    if (component.type === 1) {
      for (const child of component.components ?? []) {
        if (child.type === 2 && child.style === 5 && child.url) {
          builder.blocks.push(block('link', { text: `🔗 **${child.label || 'Link'}**`, label: child.label || 'Open', url: child.url }));
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
    schemaVersion: 1,
    mode: 'components_v2',
    accentColor: 0xF1C40F,
    blocks: [],
    actions: {}
  };

  if (message.content) builder.blocks.push(block('text', { content: String(message.content).slice(0, 4000) }));

  let embedIndex = 0;
  for (const embed of message.embeds ?? []) {
    const accentColor = Number.isInteger(embed.color) ? embed.color : builder.accentColor;
    if (embedIndex === 0 && builder.blocks.length === 0) builder.accentColor = accentColor;
    else builder.blocks.push(block('container', { label: embed.title || `Imported embed ${embedIndex + 1}`, accentColor }));
    const text = textFromEmbed(embed);
    if (text) builder.blocks.push(block('text', { content: text.slice(0, 4000) }));
    const imageUrl = embed.image?.url || embed.thumbnail?.url;
    if (imageUrl) builder.blocks.push(block('image', { url: imageUrl, description: embed.title || '' }));
    embedIndex += 1;
  }

  walkV2(message.components, builder, warnings);
  if (!builder.blocks.length) throw new Error('Ingen understøttet tekst, embeds eller Components V2-indhold blev fundet i DiscoHook JSON.');

  const title = String(titleOverride || message.thread_name || message.title || message.embeds?.[0]?.title || 'Imported DiscoHook').slice(0, 100);
  return { title, builder: validateBuilder(builder), warnings };
}
