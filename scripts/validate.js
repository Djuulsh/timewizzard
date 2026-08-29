import {
  addNestedAction,
  makeContainerBlock,
  makeGalleryBlock,
  makeImageBlock,
  makeOpenBlock,
  makeSelectBlock,
  makeThumbnailBlock
} from '../src/builder/blocks.js';
import { buildGenericActionReply } from '../src/builder/actions.js';
import { allowedMentionsFor, buildBuilderPayloads, getBuilderStats, MULTILINE_QUOTE_ESCAPE } from '../src/builder/render.js';
import { createBuilderTemplate } from '../src/builder/templates.js';
import { validateBuilder } from '../src/builder/validate.js';
import { convertDiscohook } from '../src/discohook.js';

function makeEntity(id, title, builder, extra = {}) {
  return { id, title, builder, ...extra };
}

function addActionResult(builder, result) {
  builder.blocks.push(result.block);
  for (const action of result.actions ?? []) builder.actions[action.id] = action;
  return result;
}

const compactBuilder = createBuilderTemplate('merfin_select', 'MerfinUI Class Profiles');
compactBuilder.blocks.unshift(makeImageBlock('https://example.com/banner.png', 'Header banner'));
validateBuilder(compactBuilder);
const compactStats = getBuilderStats(makeEntity('compact', 'MerfinUI', compactBuilder), { kind: 'd', id: 'compact' });
if (compactStats.messageCount !== 1) throw new Error('Compact MerfinUI template must fit one message.');

const legacyBuilder = createBuilderTemplate('merfin_open_list', 'Legacy Profiles');
validateBuilder(legacyBuilder);
const legacyStats = getBuilderStats(makeEntity('legacy', 'Legacy Profiles', legacyBuilder), { kind: 'd', id: 'legacy' });
if (legacyStats.messageCount !== 1) throw new Error('Legacy profile list must fit one message after removing Open buttons.');

const quoteBuilder = createBuilderTemplate('blank', 'Quote escape');
quoteBuilder.blocks.push({
  id: 'quote01',
  type: 'text',
  content: `>>> Multi-line quote\nStill quoted\n${MULTILINE_QUOTE_ESCAPE}\nNormal text`
});
validateBuilder(quoteBuilder);
const quotePayload = buildBuilderPayloads(makeEntity('quote', 'Quote escape', quoteBuilder), { kind: 'd', id: 'quote' })[0];
const quoteDisplays = quotePayload.components[0].components.filter((component) => component.type === 10);
if (quoteDisplays.length !== 2) throw new Error('Multi-line quote escape must split into two Text Display components.');

const mediaBuilder = createBuilderTemplate('blank', 'Media');
mediaBuilder.blocks.push(
  makeGalleryBlock([
    { url: 'https://example.com/one.png', description: 'One' },
    { url: 'https://example.com/two.png', description: 'Two' }
  ]),
  makeThumbnailBlock({ text: '**Thumbnail**', url: 'https://example.com/thumb.png', description: 'Thumb' })
);
validateBuilder(mediaBuilder);
const mediaPayloads = buildBuilderPayloads(makeEntity('media', 'Media', mediaBuilder), { kind: 'd', id: 'media' });
if (!mediaPayloads.length) throw new Error('Gallery/thumbnail rendering produced no payload.');

const multiContainerBuilder = createBuilderTemplate('blank', 'Multiple embeds');
multiContainerBuilder.blocks.push(
  { id: 'maintext', type: 'text', content: '# First embed\nPrimary content.' },
  makeContainerBlock({ label: 'Second embed', accentColor: 0xFF0000 }),
  { id: 'secondtext', type: 'text', content: '## Second embed\nSecondary content.' }
);
validateBuilder(multiContainerBuilder);
const multiPayloads = buildBuilderPayloads(makeEntity('multi', 'Multiple embeds', multiContainerBuilder), { kind: 'd', id: 'multi' });
if (multiPayloads.length !== 1 || multiPayloads[0].components.length !== 2) throw new Error('Two Components V2 containers should remain inside one Discord message when limits allow it.');

for (const template of ['announcement', 'guide', 'faq', 'links', 'youtube']) {
  const builder = createBuilderTemplate(template, `Template ${template}`);
  validateBuilder(builder);
  const stats = getBuilderStats(makeEntity(`tpl-${template}`, template, builder), { kind: 'd', id: `tpl-${template}` });
  if (stats.messageCount !== 1) throw new Error(`${template} template should fit one Discord message by default.`);
}

const actionBuilder = createBuilderTemplate('blank', 'Nested actions');
const open = addActionResult(actionBuilder, makeOpenBlock({
  text: 'Open details',
  label: 'Open',
  title: 'Details',
  response: 'Choose the next step.'
}));
addNestedAction(actionBuilder, open.block.actionId, {
  label: 'More',
  title: 'More information',
  content: 'Nested response.'
});
validateBuilder(actionBuilder);
const reply = buildGenericActionReply(actionBuilder.actions[open.block.actionId], { kind: 'p', id: 'stable-builder-id' });
const nestedRow = reply.components[0].components.find((component) => component.type === 1);
if (!nestedRow) throw new Error('Nested ephemeral action did not render a control row.');

const selectBuilder = createBuilderTemplate('blank', 'Select');
addActionResult(selectBuilder, makeSelectBlock({
  placeholder: 'Choose one…',
  specification: 'FHD | FHD response\nQHD | QHD response'
}));
validateBuilder(selectBuilder);

const imported = convertDiscohook({
  content: '# Imported',
  embeds: [{ title: 'Guide', description: 'Imported from DiscoHook', color: 0x5865f2 }]
});
if (!imported.builder.blocks.length) throw new Error('DiscoHook converter returned no blocks.');
validateBuilder(imported.builder);

const safeDefault = allowedMentionsFor(makeEntity('safe', 'Safe', compactBuilder));
if (safeDefault.parse.length !== 0 || safeDefault.users || safeDefault.roles) throw new Error('Default mention policy must not notify anyone.');
const selectedMentions = allowedMentionsFor(makeEntity('safe2', 'Selected', compactBuilder, {
  mentionPolicy: { mode: 'selected', users: ['123456789012345678'], roles: ['234567890123456789'], everyone: true }
}));
if (selectedMentions.parse.length !== 0 || selectedMentions.users?.[0] !== '123456789012345678' || selectedMentions.roles?.[0] !== '234567890123456789') {
  throw new Error('Selected mention policy did not preserve explicit user/role whitelist.');
}

console.log(`Compact template: ${compactStats.blockCount} blocks -> ${compactStats.messageCount} message.`);
console.log(`Legacy profile list: ${legacyStats.blockCount} blocks -> ${legacyStats.messageCount} message.`);
console.log('Multiple Components V2 containers in one message validation passed.');
console.log('Base + YouTube template validation passed.');
console.log('Quote escape split validation passed.');
console.log('Gallery + thumbnail validation passed.');
console.log('Nested ephemeral action validation passed.');
console.log('DiscoHook import validation passed.');
console.log('Safe mention validation passed.');
console.log('Timewizzard v1.3.2 validation passed.');
