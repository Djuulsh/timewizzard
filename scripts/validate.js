import { makeImageBlock, makeOpenBlock, makeSelectBlock } from '../src/builder/blocks.js';
import { buildBuilderPayloads, getBuilderStats } from '../src/builder/render.js';
import { createBuilderTemplate } from '../src/builder/templates.js';
import { validateBuilder } from '../src/builder/validate.js';

function makeEntity(id, title, builder) {
  return { id, title, builder };
}

function addActionResult(builder, result) {
  builder.blocks.push(result.block);
  for (const action of result.actions ?? []) builder.actions[action.id] = action;
}

const compactBuilder = createBuilderTemplate('merfin_select', 'MerfinUI Class Profiles');
compactBuilder.blocks.unshift(makeImageBlock('https://example.com/banner.png', 'Header banner'));
const compact = makeEntity('compact', 'MerfinUI Class Profiles', compactBuilder);
validateBuilder(compact.builder);
const compactStats = getBuilderStats(compact, { kind: 'd', id: 'compact' });
if (compactStats.messageCount !== 1) {
  throw new Error(`Compact MerfinUI template should use 1 Discord message, got ${compactStats.messageCount}`);
}

const legacy = makeEntity('legacy', 'Legacy', createBuilderTemplate('merfin_open_list', 'Legacy'));
validateBuilder(legacy.builder);
const legacyStats = getBuilderStats(legacy, { kind: 'd', id: 'legacy' });
if (legacyStats.messageCount < 2) {
  throw new Error('Legacy 18-row Open list should be split across at least 2 Discord messages.');
}

const genericBuilder = createBuilderTemplate('blank', 'Generic');
addActionResult(genericBuilder, makeOpenBlock({
  text: '🔗 • **Read me**',
  label: 'Open',
  title: 'Private information',
  response: 'This is an ephemeral response.'
}));
addActionResult(genericBuilder, makeSelectBlock({
  placeholder: 'Choose one…',
  specification: 'FHD | FHD response\nQHD | QHD response'
}));
validateBuilder(genericBuilder);
const generic = makeEntity('generic', 'Generic', genericBuilder);
const payloads = buildBuilderPayloads(generic, { kind: 'd', id: 'generic' });
if (payloads.length !== 1) throw new Error('Generic validation fixture unexpectedly spans multiple messages.');

console.log(`Compact template: ${compactStats.blockCount} blocks -> ${compactStats.messageCount} message.`);
console.log(`Legacy Open list: ${legacyStats.blockCount} blocks -> ${legacyStats.messageCount} messages.`);
console.log('Generic Open + Select validation passed.');
console.log('Shrouded Info Bot v1.2.1 validation passed.');
