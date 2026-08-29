import {
  addNestedAction,
  makeGalleryBlock,
  makeImageBlock,
  makeOpenBlock,
  makeSelectBlock,
  makeThumbnailBlock
} from '../src/builder/blocks.js';
import { buildGenericActionReply } from '../src/builder/actions.js';
import { buildBuilderPayloads, getBuilderStats, MULTILINE_QUOTE_ESCAPE } from '../src/builder/render.js';
import { createBuilderTemplate } from '../src/builder/templates.js';
import { validateBuilder } from '../src/builder/validate.js';
import { convertDiscohook } from '../src/discohook.js';

function makeEntity(id, title, builder) {
  return { id, title, builder };
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

console.log(`Compact template: ${compactStats.blockCount} blocks -> ${compactStats.messageCount} message.`);
console.log('Quote escape split validation passed.');
console.log('Gallery + thumbnail validation passed.');
console.log('Nested ephemeral action validation passed.');
console.log('DiscoHook import validation passed.');
console.log('Timewizzard v1.3.0 validation passed.');
