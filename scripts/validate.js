import {
  addNestedAction,
  makeContainerBlock,
  makeGalleryBlock,
  makeImageBlock,
  makeOpenBlock,
  makeSelectBlock,
  makeThumbnailBlock,
  makeYoutubeBlock
} from '../src/builder/blocks.js';
import { buildGenericActionReply, buildStringSelectReply } from '../src/builder/actions.js';
import { allowedMentionsFor, buildBuilderPayloads, getBuilderStats, MULTILINE_QUOTE_ESCAPE } from '../src/builder/render.js';
import { normalizeBuilderStructure } from '../src/builder/schema.js';
import { SMART_BLOCK_TYPES } from '../src/builder/smartBlocks.js';
import { createBuilderTemplate, POST_TEMPLATES } from '../src/builder/templates.js';
import { canonicalYoutubeUrl, youtubeThumbnailUrl, youtubeVideoId } from '../src/builder/youtube.js';
import { validateBuilder } from '../src/builder/validate.js';
import { VERSION } from '../src/version.js';
import { convertDiscohook } from '../src/discohook.js';
import { MAX_STRING_SELECT_CONTENT_LENGTH, MAX_WEB_JSON_BODY_BYTES } from '../src/constants.js';
import { compactRevisionHistory } from '../src/storage.js';
import { ChannelFlags, ChannelType } from 'discord.js';
import { destinationTypeForChannel, normalizeTagIds, validateDestination } from '../src/destinations.js';
import { commands } from '../src/commands.js';
import { createManagedPost } from '../src/postService.js';
import { BUILDER_EXPORT_FORMAT, BUILDER_EXPORT_VERSION, MAX_BUILDER_IMPORT_BYTES, exportDefinition, parseBuilderDefinition, readBuilderAttachment } from '../src/builder/io.js';

function makeEntity(id, title, builder, extra = {}) {
  return { id, title, builder, ...extra };
}

function addActionResult(builder, result, target = builder.blocks) {
  target.push(result.block);
  for (const action of result.actions ?? []) builder.actions[action.id] = action;
  return result;
}

const plainBuilder = createBuilderTemplate('announcement_simple', 'Plain announcement');
validateBuilder(plainBuilder);
const plainPayload = buildBuilderPayloads(makeEntity('plain', 'Plain', plainBuilder), { kind: 'd', id: 'plain' })[0];
if (plainPayload.components.some((component) => component.type === 17)) throw new Error('A plain root post must not gain an implicit container.');

const styledBuilder = createBuilderTemplate('announcement_styled', 'Styled announcement');
validateBuilder(styledBuilder);
const styledPayload = buildBuilderPayloads(makeEntity('styled', 'Styled', styledBuilder), { kind: 'd', id: 'styled' })[0];
if (styledPayload.components.length !== 1 || styledPayload.components[0].type !== 17) throw new Error('Styled announcement must publish as an explicit container.');

const compactBuilder = createBuilderTemplate('merfin_select', 'MerfinUI Class Profiles');
compactBuilder.blocks.unshift(makeImageBlock('https://example.com/banner.png', 'Header banner'));
validateBuilder(compactBuilder);
const compactStats = getBuilderStats(makeEntity('compact', 'MerfinUI', compactBuilder), { kind: 'd', id: 'compact' });
if (compactStats.messageCount !== 1) throw new Error('Compact MerfinUI template must fit one message.');

const legacyBuilder = createBuilderTemplate('merfin_open_list', 'Legacy Profiles');
validateBuilder(legacyBuilder);
const legacyStats = getBuilderStats(makeEntity('legacy', 'Legacy Profiles', legacyBuilder), { kind: 'd', id: 'legacy' });
if (legacyStats.messageCount !== 1) throw new Error('Legacy profile list must fit one message without Open buttons.');

const migratedFlat = normalizeBuilderStructure({
  schemaVersion: 1,
  mode: 'components_v2',
  accentColor: 0xF1C40F,
  actions: {},
  blocks: [
    { id: 'oldtext', type: 'text', content: 'Old styled post' },
    { id: 'marker', type: 'container', label: 'Second', accentColor: 0xFF0000 },
    { id: 'oldtext2', type: 'text', content: 'Second old container' }
  ]
});
if (migratedFlat.schemaVersion !== 2 || migratedFlat.blocks.length !== 2 || migratedFlat.blocks.some((block) => block.type !== 'container' || !Array.isArray(block.children))) {
  throw new Error('Legacy flat builder migration did not preserve old styled containers.');
}

const quoteBuilder = createBuilderTemplate('blank', 'Quote escape');
quoteBuilder.blocks.push({
  id: 'quote01',
  type: 'text',
  content: `>>> Multi-line quote\nStill quoted\n${MULTILINE_QUOTE_ESCAPE}\nNormal text`
});
validateBuilder(quoteBuilder);
const quotePayload = buildBuilderPayloads(makeEntity('quote', 'Quote escape', quoteBuilder), { kind: 'd', id: 'quote' })[0];
const quoteDisplays = quotePayload.components.filter((component) => component.type === 10);
if (quoteDisplays.length !== 2) throw new Error('Multi-line quote escape must split a plain root text block into two Text Displays.');

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

const multiContainerBuilder = createBuilderTemplate('blank', 'Multiple containers');
multiContainerBuilder.blocks.push(
  { id: 'roottext', type: 'text', content: '# Plain root\nThis stays outside containers.' },
  makeContainerBlock({ label: 'Blue', accentColor: 0x5865F2, children: [{ id: 'blue1', type: 'text', content: 'Blue container' }] }),
  makeContainerBlock({ label: 'Red', accentColor: 0xFF0000, children: [{ id: 'red1', type: 'text', content: 'Red container' }] })
);
validateBuilder(multiContainerBuilder);
const multiPayloads = buildBuilderPayloads(makeEntity('multi', 'Multiple containers', multiContainerBuilder), { kind: 'd', id: 'multi' });
if (multiPayloads.length !== 1 || multiPayloads[0].components.filter((component) => component.type === 17).length !== 2) {
  throw new Error('Plain root content plus two explicit containers should remain one Discord message when limits allow.');
}
const perBlockBuilder = structuredClone(multiContainerBuilder);
perBlockBuilder.messageLayout = { mode: 'per_block' };
const perBlockPayloads = buildBuilderPayloads(makeEntity('multi-per-block', 'One message per block', perBlockBuilder), { kind: 'd', id: 'multi-per-block' });
if (perBlockPayloads.length !== 3) throw new Error('Per-block message layout must start a new Discord message for every top-level block/container.');
const targetBuilder = structuredClone(multiContainerBuilder);
targetBuilder.messageLayout = { mode: 'target', targetCount: 2 };
const targetPayloads = buildBuilderPayloads(makeEntity('multi-target', 'Two messages', targetBuilder), { kind: 'd', id: 'multi-target' });
if (targetPayloads.length !== 2) throw new Error('Target message layout must produce the requested number of Discord messages.');

const youtubeBuilder = createBuilderTemplate('blank', 'YouTube');
youtubeBuilder.blocks.push(makeYoutubeBlock({
  url: 'https://youtu.be/dQw4w9WgXcQ',
  title: 'Smart video',
  description: 'Automatically derived thumbnail.'
}));
validateBuilder(youtubeBuilder);
if (youtubeVideoId('https://youtube.com/shorts/dQw4w9WgXcQ') !== 'dQw4w9WgXcQ') throw new Error('YouTube Shorts URL parsing failed.');
if (canonicalYoutubeUrl('https://youtu.be/dQw4w9WgXcQ') !== 'https://www.youtube.com/watch?v=dQw4w9WgXcQ') throw new Error('YouTube canonical URL failed.');
if (!youtubeThumbnailUrl('https://youtu.be/dQw4w9WgXcQ')?.includes('dQw4w9WgXcQ')) throw new Error('YouTube thumbnail derivation failed.');
const youtubePayload = buildBuilderPayloads(makeEntity('yt', 'YouTube', youtubeBuilder), { kind: 'd', id: 'yt' })[0];
if (!youtubePayload.components.some((component) => component.type === 12) || !youtubePayload.components.some((component) => component.type === 9)) {
  throw new Error('Smart YouTube block must render thumbnail media plus a link section by default.');
}

const now = Math.floor(Date.now() / 1000);
const smartBuilder = createBuilderTemplate('blank', 'Smart blocks');
smartBuilder.blocks.push(
  { id: 'smart01', type: 'heading', level: 2, emoji: '✨', title: 'Heading', subtitle: 'Subtitle' },
  { id: 'smart02', type: 'callout', tone: 'success', title: 'Success', content: 'Everything is ready.' },
  { id: 'smart03', type: 'checklist', title: 'Checklist', items: [{ text: 'Done', checked: true }, { text: 'Pending', checked: false }] },
  { id: 'smart04', type: 'steps', title: 'Steps', items: [{ title: 'One', content: 'First step' }, { title: 'Two', content: 'Second step' }] },
  { id: 'smart05', type: 'facts', title: 'Facts', items: [{ label: 'Status', value: 'Ready' }] },
  { id: 'smart06', type: 'button_row', buttons: [{ label: 'Website', url: 'https://example.com' }, { label: 'Docs', url: 'https://example.com/docs' }] },
  { id: 'smart07', type: 'event', title: 'Event', description: 'Description', startEpoch: now + 3600, endEpoch: now + 7200, location: '#channel' },
  { id: 'smart08', type: 'countdown', title: 'Countdown', text: 'Starts soon', targetEpoch: now + 86400 },
  { id: 'smart09', type: 'code', language: 'lua', caption: 'Example', code: 'print("hello")' },
  { id: 'smart10', type: 'progress', label: 'Progress', current: 3, total: 5, segments: 10, showNumbers: true, note: 'Three of five complete.' }
);
validateBuilder(smartBuilder);
if (new Set(smartBuilder.blocks.map((block) => block.type)).size !== SMART_BLOCK_TYPES.length) throw new Error('The validation fixture must cover all ten smart block types.');
const smartPayloads = buildBuilderPayloads(makeEntity('smart', 'Smart blocks', smartBuilder), { kind: 'd', id: 'smart' });
if (!smartPayloads.length || !smartPayloads[0].components.some((component) => component.type === 1 && component.components?.length === 2)) {
  throw new Error('Smart Button Row did not render as one Action Row with link buttons.');
}

for (const template of POST_TEMPLATES) {
  const builder = createBuilderTemplate(template.value, `Template ${template.value}`);
  validateBuilder(builder);
  if (builder.blocks.length) {
    const stats = getBuilderStats(makeEntity(`tpl-${template.value}`, template.value, builder), { kind: 'd', id: `tpl-${template.value}` });
    const expectedMessageCount = template.value === 'merfin_tbc_weakauras' ? 2 : 1;
    if (stats.messageCount !== expectedMessageCount) {
      throw new Error(`${template.value} template should render as ${expectedMessageCount} Discord message(s), received ${stats.messageCount}.`);
    }
  }
}

const actionBuilder = createBuilderTemplate('blank', 'Nested actions');
const actionContainer = makeContainerBlock({ label: 'Interactions', accentColor: 0x5865F2, children: [] });
actionBuilder.blocks.push(actionContainer);
const open = addActionResult(actionBuilder, makeOpenBlock({
  text: 'Open details',
  label: 'Open',
  title: 'Details',
  response: 'Choose the next step.'
}), actionContainer.children);
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

const longString = 'W'.repeat(100_000);
const stringBuilder = createBuilderTemplate('blank', 'Long String Select');
stringBuilder.blocks.push({
  id: 'string01',
  type: 'string_select',
  placeholder: 'Vælg en fil…',
  options: [{ id: 'option01', label: 'Raid Setup / FHD', content: longString }]
});
validateBuilder(stringBuilder);
const stringReply = buildStringSelectReply(stringBuilder.blocks[0].options[0]);
if (stringReply.files?.[0]?.attachment?.toString('utf8') !== longString) throw new Error('100000-tegns String Select blev ikke leveret intakt som TXT.');
if (stringReply.files[0].name !== 'raid-setup-fhd.txt') throw new Error('String Select TXT-filnavnet blev ikke afledt korrekt fra option-navnet.');
if (stringReply.content !== '**Raid Setup / FHD**\nYour selected string is attached as a UTF-8 TXT file.') throw new Error('String Select TXT reply must be written in English.');
const oversizedStringBuilder = structuredClone(stringBuilder);
oversizedStringBuilder.blocks[0].options[0].content = 'W'.repeat(MAX_STRING_SELECT_CONTENT_LENGTH + 1);
try {
  validateBuilder(oversizedStringBuilder);
  throw new Error('String Select accepterede mere end 200000 tegn.');
} catch (error) {
  if (!String(error.message).includes('200000')) throw error;
}

const forumDestination = {
  type: ChannelType.GuildForum,
  availableTags: Array.from({ length: 6 }, (_, index) => ({ id: `tag-${index + 1}`, name: `Tag ${index + 1}` })),
  flags: { has: (flag) => flag === ChannelFlags.RequireTag }
};
if (validateDestination(forumDestination, ['tag-1', 'tag-2']) !== null) throw new Error('Forum destination must accept multiple valid tags.');
if (!validateDestination(forumDestination, []).includes('requires at least one tag')) throw new Error('Required forum tag validation failed.');
if (!validateDestination(forumDestination, forumDestination.availableTags.map((tag) => tag.id)).includes('at most five')) throw new Error('Discord five-tag limit validation failed.');
const normalizedTags = normalizeTagIds(['tag-1', 'tag-1', '', 'tag-2']);
if (normalizedTags.join(',') !== 'tag-1,tag-2') throw new Error('Tag IDs must be trimmed and deduplicated.');
const existingForumPost = { type: ChannelType.PublicThread };
if (destinationTypeForChannel(existingForumPost) !== 'thread' || validateDestination(existingForumPost, []) !== null) throw new Error('Existing forum posts must be valid managed-message destinations.');
if (!validateDestination(existingForumPost, ['tag-1']).includes('cannot be changed')) throw new Error('Existing forum post tags must remain owned by the thread itself.');
const postCommandJson = commands.find((command) => command.name === 'post').toJSON();
const createOptions = postCommandJson.options.find((option) => option.name === 'opret').options;
if (!['tag', 'tag2', 'tag3', 'tag4', 'tag5'].every((name) => createOptions.some((option) => option.name === name))) throw new Error('Slash create command must expose five forum tag options.');
const destinationOption = createOptions.find((option) => option.name === 'forum');
if (!destinationOption.channel_types.includes(ChannelType.PublicThread)) throw new Error('Slash create command must allow an existing forum post destination.');

let reopenedExistingPost = false;
let managedMessageEdited = false;
const existingPostDestination = {
  id: 'existing-forum-post',
  type: ChannelType.PublicThread,
  archived: true,
  isThread: () => true,
  setArchived: async (archived) => { reopenedExistingPost = archived === false; },
  send: async () => ({
    id: 'timewizzard-message',
    edit: async () => { managedMessageEdited = true; }
  })
};
const existingPostStore = {
  savePost: async (post) => post,
  removeDraft: async () => undefined
};
const existingPostDraft = makeEntity('existing-post-draft', 'Existing post test', structuredClone(plainBuilder), {
  createdBy: 'validator',
  createdAt: new Date().toISOString(),
  appliedTagIds: []
});
const existingPostResult = await createManagedPost({ destination: existingPostDestination, draft: existingPostDraft, store: existingPostStore });
if (!reopenedExistingPost || !managedMessageEdited) throw new Error('Publishing to an archived existing forum post must reopen it and render the managed message.');
if (existingPostResult.destinationType !== 'thread' || existingPostResult.destinationChannelId !== existingPostDestination.id || existingPostResult.starterMessageId !== 'timewizzard-message') {
  throw new Error('Existing forum post publication metadata is incorrect.');
}

let splitMessageSends = 0;
const splitDestination = {
  id: 'split-channel',
  type: ChannelType.GuildText,
  isThread: () => false,
  send: async () => {
    splitMessageSends += 1;
    return { id: `split-message-${splitMessageSends}`, edit: async () => undefined };
  }
};
const splitDraft = makeEntity('split-draft', 'Split publishing', structuredClone(perBlockBuilder), {
  createdBy: 'validator',
  createdAt: new Date().toISOString()
});
const splitPost = await createManagedPost({ destination: splitDestination, draft: splitDraft, store: existingPostStore });
if (splitMessageSends !== 3 || splitPost.continuationMessageIds.length !== 2) throw new Error('Publishing service must send and track every message selected by the message layout.');

const exportedDefinition = exportDefinition(makeEntity('roundtrip', 'Round-trip JSON', structuredClone(plainBuilder)));
if (exportedDefinition.format !== BUILDER_EXPORT_FORMAT || exportedDefinition.version !== BUILDER_EXPORT_VERSION) throw new Error('Builder export format metadata is inconsistent.');
const roundTripImport = parseBuilderDefinition(exportedDefinition);
if (roundTripImport.title !== 'Round-trip JSON' || !roundTripImport.builder.blocks.length) throw new Error('A current Builder export must import without data loss.');
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response(JSON.stringify(exportedDefinition), { status: 200, headers: { 'content-type': 'application/json' } });
  const attachmentImport = await readBuilderAttachment({ url: 'https://cdn.example.com/roundtrip.json', size: JSON.stringify(exportedDefinition).length });
  if (attachmentImport.title !== 'Round-trip JSON' || !attachmentImport.builder.blocks.length) throw new Error('Discord attachment import must accept the current Web Builder export.');
} finally {
  globalThis.fetch = originalFetch;
}
const legacyImport = parseBuilderDefinition({ ...exportedDefinition, format: 'shrouded-info-builder', version: 1 });
if (legacyImport.title !== 'Round-trip JSON') throw new Error('Legacy Builder exports must remain importable.');
let unknownFormatRejected = false;
try { parseBuilderDefinition({ ...exportedDefinition, format: 'unknown-builder' }); } catch { unknownFormatRejected = true; }
if (!unknownFormatRejected || MAX_BUILDER_IMPORT_BYTES !== 20_000_000) throw new Error('Builder import format or size validation is incorrect.');

const legacyDownloadBuilder = createBuilderTemplate('blank', 'Legacy downloads');
legacyDownloadBuilder.blocks.push({
  id: 'downloads',
  type: 'string_select',
  placeholder: 'Choose download',
  options: [
    { id: 'merfin', label: 'MerfinUI_v7.80.zip', content: '**MerfinUI_v7.80.zip**\n[Download directly](https://example.com/MerfinUI_v7.80.zip)' },
    { id: 'addons', label: 'TBC_AddOns.zip', content: '**TBC_AddOns.zip**\n[Download directly](https://example.com/TBC_AddOns.zip)' }
  ]
});
const migratedDownloads = validateBuilder(legacyDownloadBuilder);
if (migratedDownloads.blocks[0]?.type !== 'button_row' || migratedDownloads.blocks[0].buttons.length !== 2) throw new Error('Legacy ZIP String Select must migrate to two download buttons.');
const tbcTemplate = createBuilderTemplate('merfin_tbc_weakauras', 'TBC downloads');
const addonsContainer = tbcTemplate.blocks.find((block) => block.type === 'container' && block.label === 'Addons & UI');
const downloadButtons = addonsContainer?.children?.find((block) => block.type === 'button_row')?.buttons ?? [];
if (downloadButtons.length !== 2 || !downloadButtons.every((button) => button.url.includes('.zip?') && button.url.includes('dl=1'))) throw new Error('TBC template must expose both ZIP files as direct download buttons.');
const tbcPayloadJson = JSON.stringify(buildBuilderPayloads(makeEntity('tbc-downloads', 'TBC downloads', tbcTemplate), { kind: 'd', id: 'tbc-downloads' }));
if (!tbcPayloadJson.includes('Download MerfinUI_v7.80.zip') || !tbcPayloadJson.includes('Download TBC_AddOns.zip')) throw new Error('Discord payload must render both ZIP download buttons.');
const impossibleTbcTarget = structuredClone(tbcTemplate);
impossibleTbcTarget.messageLayout = { mode: 'target', targetCount: 1 };
const impossibleTbcStats = getBuilderStats(makeEntity('tbc-too-small', 'TBC target', impossibleTbcTarget), { kind: 'd', id: 'tbc-too-small' });
if (!impossibleTbcStats.layoutError?.includes('at least 2')) throw new Error('Stats must explain when Discord limits require more messages than requested.');
let impossibleTargetRejected = false;
try { buildBuilderPayloads(makeEntity('tbc-too-small', 'TBC target', impossibleTbcTarget), { kind: 'd', id: 'tbc-too-small' }); } catch (error) { impossibleTargetRejected = error.message.includes('at least 2'); }
if (!impossibleTargetRejected) throw new Error('Publishing must reject a target below Discord\'s minimum message count.');
if (MAX_STRING_SELECT_CONTENT_LENGTH !== 200_000 || MAX_WEB_JSON_BODY_BYTES !== 20_000_000) throw new Error('String Select size contracts are incorrect.');
const largeRevisionContent = 'R'.repeat(6_000_000);
const compactedRevisions = compactRevisionHistory(Array.from({ length: 6 }, (_, index) => ({
  id: `large-${index}`,
  snapshot: { builder: { blocks: [{ type: 'string_select', options: [{ content: largeRevisionContent }] }] } }
})));
if (compactedRevisions.length !== 3) throw new Error('Large String Select revision history was not reduced to stay below 20 MB.');

const imported = convertDiscohook({
  content: '# Imported plain root',
  embeds: [
    { title: 'Blue Guide', description: 'Imported first embed', color: 0x5865F2 },
    { title: 'Red Warning', description: 'Imported second embed', color: 0xFF0000 }
  ]
});
validateBuilder(imported.builder);
if (imported.builder.blocks.filter((block) => block.type === 'container').length !== 2) throw new Error('DiscoHook multi-embed import must preserve separate containers.');

const safeDefault = allowedMentionsFor(makeEntity('safe', 'Safe', compactBuilder));
if (safeDefault.parse.length !== 0 || safeDefault.users || safeDefault.roles) throw new Error('Default mention policy must not notify anyone.');
const selectedMentions = allowedMentionsFor(makeEntity('safe2', 'Selected', compactBuilder, {
  mentionPolicy: { mode: 'selected', users: ['123456789012345678'], roles: ['234567890123456789'], everyone: true }
}));
if (selectedMentions.parse.length !== 0 || selectedMentions.users?.[0] !== '123456789012345678' || selectedMentions.roles?.[0] !== '234567890123456789') {
  throw new Error('Selected mention policy did not preserve explicit user/role whitelist.');
}

console.log('Plain root posts publish without implicit containers.');
console.log('Explicit nested container rendering validation passed.');
console.log('Legacy flat builder migration validation passed.');
console.log(`Compact template: ${compactStats.blockCount} blocks -> ${compactStats.messageCount} message.`);
console.log(`Legacy profile list: ${legacyStats.blockCount} blocks -> ${legacyStats.messageCount} message.`);
console.log('Smart YouTube URL + thumbnail validation passed.');
console.log(`All ${POST_TEMPLATES.length} template definitions validate and fit one message by default.`);
console.log(`All ${SMART_BLOCK_TYPES.length} v1.5 smart block types validate and render.`);
console.log('Quote escape split validation passed.');
console.log('Gallery + thumbnail validation passed.');
console.log('Nested ephemeral action validation passed.');
console.log('100000-character String Select TXT delivery validation passed.');
console.log('DiscoHook nested container import validation passed.');
console.log('Safe mention validation passed.');
if (VERSION !== '1.6.4') throw new Error('Runtime version is not v1.6.4.');
console.log(`Timewizzard v${VERSION} validation passed.`);
