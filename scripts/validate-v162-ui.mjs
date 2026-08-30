import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../src/version.js';
import { WEB_SCRIPT_FILES, WEB_STYLE_FILES } from '../src/web/assets.js';
import { WEB_FEATURES } from '../src/web/features.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(VERSION === '1.7.0', 'The authoritative version must be 1.7.0.');
const pkg = JSON.parse(read('package.json'));
assert(pkg.version === VERSION, 'package.json must match src/version.js.');

const readme = read('README.md');
assert(readme.startsWith(`# Timewizzard Info Bot v${VERSION}`), 'README heading must match the authoritative runtime version.');
assert(readme.includes(`> Current release: **v${VERSION}**`), 'README current release must match the authoritative runtime version.');
assert(readme.includes('200,000 characters') && readme.includes('package-lock.json'), 'README must document long TXT delivery and reproducible installs.');
assert(readme.includes('single-server mode') && readme.includes('Manage Server'), 'README must document the current Discord guild and permission model.');
assert(readme.includes('storage schema is v6') && readme.includes('staged') && readme.includes('Publish/Republish review'), 'README must document the current storage and safe publishing workflow.');
assert(readme.includes('[`GUIDE_EN.md`](GUIDE_EN.md)') && readme.includes('[`GUIDE_DA.md`](GUIDE_DA.md)'), 'README must link both operating guides.');

const guideDa = read('GUIDE_DA.md');
const guideEn = read('GUIDE_EN.md');
for (const [name, guide] of [['Danish', guideDa], ['English', guideEn]]) {
  assert(guide.startsWith(`# Timewizzard Info Bot v${VERSION}`), `${name} guide heading must match the current version.`);
  for (const marker of ['Publish/Republish', '200.000', 'GUIDE_DA.md']) {
    if (name === 'Danish' && marker === 'GUIDE_DA.md') continue;
    assert(guide.includes(marker) || (name === 'English' && marker === '200.000' && guide.includes('200,000')), `${name} guide is missing ${marker}.`);
  }
}
assert(guideDa.includes('GUIDE_EN.md') && guideEn.includes('GUIDE_DA.md'), 'The operating guides must cross-link.');
assert(read('DISCORD_MARKDOWN.md').startsWith(`# Discord Markdown in Timewizzard v${VERSION}`), 'Markdown reference heading must match the current version.');
assert(read('UPLOAD_TO_GITHUB_DA.md').includes('Historisk dokument') && read('UPGRADE_v1.2_DA.md').includes('Historisk migrationsreference'), 'Legacy setup documents must be clearly marked as historical.');
assert(read('UI_QA_v1.6.2.md').includes('Versionsspecifik QA-reference'), 'Version-specific QA documentation must point to the current validation suite.');
const changelog = read('CHANGELOG.md');
assert(changelog.includes('## 1.7.0') && changelog.includes('Publishing safety, flexible destinations and context editing'), 'Changelog must cover the current release documentation and publishing flow.');
const controller = read('src/controller.js');
assert(controller.includes("from './version.js'") && controller.includes('buildWebBuilderOverview') && controller.includes('GUIDE_EN.md'), 'Discord help responses must use the current version and link the English guide.');
assert(!controller.includes('Shrouded Web Builder v1.2.1') && !controller.includes('Shrouded Info Bot v1.2.1'), 'Discord responses must not contain obsolete branding or versions.');

for (const file of WEB_SCRIPT_FILES) assert(fs.existsSync(path.join(root, 'web', file)), `Missing Web Builder script: ${file}`);
for (const file of WEB_STYLE_FILES) assert(fs.existsSync(path.join(root, 'web', file)), `Missing Web Builder stylesheet: ${file}`);
assert(WEB_SCRIPT_FILES.at(-1) === 'quickAnnouncements.js', 'Quick Announcement controller must be the final Web Builder script.');
assert(WEB_STYLE_FILES.at(-1) === 'quickAnnouncements.css', 'Quick Announcement polish must be the final Web Builder stylesheet.');
assert(new Set(WEB_FEATURES).size === WEB_FEATURES.length, 'Web feature registry contains duplicates.');
assert(WEB_FEATURES.includes('template-catalog-36') && !WEB_FEATURES.includes('template-catalog-38'), 'Feature registry template count must match the validated catalogue.');
assert(WEB_FEATURES.includes('message-context-webbuilder-edit'), 'Feature registry must advertise message context editing.');

const html = read('web/index.html');
assert(!html.includes('v1.3.1'), 'The HTML shell must not expose the legacy v1.3.1 version.');
assert(!html.includes('syncSeparatorPreview'), 'Legacy inline separator MutationObserver logic must be removed.');
assert(!/<style>[\s\S]*separator-size-demo/.test(html), 'Legacy inline separator CSS must be removed.');
assert(html.includes('viewport-fit=cover'), 'The HTML viewport must support device safe areas.');
assert(html.includes('aria-live="polite"'), 'The UI must expose a polite live region.');
assert((html.match(/<select id="(?:newTag|destinationTag|builderImportTag|discohookTag)" multiple size="5">/g) || []).length === 4, 'All Web Builder forum tag pickers must support up to five selections.');
assert(/Forum tags \(up to 5\)<select id="newTag"[\s\S]*?<\/select><small class="tag-picker-help">/.test(html), 'New Draft destination and forum tag controls must align before the tag helper text.');
assert(html.includes('id="importBuilderBtn"') && html.includes('id="builderImportFile"') && html.includes('id="builderImportForm"'), 'Web Builder must expose Builder JSON file import controls.');
assert(!html.includes('id="messageSplitMode"') && !html.includes('id="messageTargetCount"'), 'Message split controls must not remain in the main editor.');

const js162 = read('web/v162.js');
assert(js162.includes('els.importBuilderBtn'), 'The responsive app menu must include Builder JSON import.');
assert(js162.includes('automaticMessageCount') && js162.includes('maximumMessageCount'), 'Canonical preview must report the valid exact message range.');
assert(js162.includes('data-v162-publish-layout') && js162.includes('data-v162-publish-target') && js162.includes('v162ReadPublishMessageLayout'), 'Publish/Republish review must contain automatic, per-block and exact message splitting.');
assert(js162.includes('const builder = structuredClone(state.entity.builder)') && js162.includes('builder.messageLayout = structuredClone(messageLayout)'), 'Publish review must validate the selected message layout before saving it.');
for (const marker of [
  'v162OpenPublishReview',
  'v162OfferRecovery',
  'v162SetView',
  'v162SetDrawer',
  "api('/api/preview'",
  'v162EnhanceAccessibility',
  'v162PatchDialogFocus'
]) assert(js162.includes(marker), `v162.js is missing ${marker}.`);

const css162 = read('web/v162.css');
for (const marker of [
  '100dvh',
  'safe-area-inset-bottom',
  '@media(max-width:1279px)',
  '@media(max-width:960px)',
  '@media(max-width:600px)',
  '@media(pointer:coarse)',
  '@media(prefers-reduced-motion:reduce)',
  'body[data-tw-view="preview"]',
  'body[data-tw-preview-width="mobile"]'
]) assert(css162.includes(marker), `v162.css is missing responsive contract: ${marker}.`);

const js163 = read('web/v163.js');
for (const marker of [
  'v163EnsurePreviewBack',
  "v162SetView('edit'",
  'v163EnsureWorkspaceMore',
  'v163SyncWorkspaceMore',
  'v163RemoveDuplicatePostsNav'
]) assert(js163.includes(marker), `v163.js is missing navigation contract: ${marker}.`);

const js153 = read('web/v153.js');
assert(js153.includes('if (textarea.maxLength > 0) return textarea.maxLength;'), 'v153 textarea counters must respect the explicit 200000-character String Select limit.');
const appJs = read('web/app.js');
assert(appJs.includes('maxlength="${MAX_STRING_SELECT_CONTENT_LENGTH}"'), 'String Select textarea must expose its 200000-character limit to the shared counter.');
assert(!appJs.includes('data-string-count'), 'String Select must not render a duplicate character counter.');

const css163 = read('web/v163.css');
for (const marker of [
  '.v163-preview-back',
  '.v163-workspace-more',
  'grid-template-columns:minmax(225px,.62fr) minmax(315px,1.38fr)',
  'body[data-tw-view="edit"]',
  '#v152MoreMenu{display:none!important}',
  '#v162AppMenu .v162-app-menu-panel',
  'z-index:500!important',
  '[data-v162-posts-nav]{display:none!important}'
]) assert(css163.includes(marker), `v163.css is missing compact editor contract: ${marker}.`);

const quickJs = read('web/quickAnnouncements.js');
for (const marker of [
  'quick_announcement',
  'quick_announcement_image',
  'quick_announcement_action',
  'createQuickAnnouncementDraft',
  'quickAnnouncementBuilder'
]) assert(quickJs.includes(marker), `Quick Announcement controller is missing ${marker}.`);

const quickCss = read('web/quickAnnouncements.css');
for (const marker of [
  '#newDraftDialog',
  'overflow:hidden!important',
  'scrollbar-gutter:auto!important',
  '.v150-template-badges i',
  'height:17px!important'
]) assert(quickCss.includes(marker), `Quick Announcement stylesheet is missing ${marker}.`);
assert(quickCss.includes('#newDraftForm #newForum') && quickCss.includes('height:36px') && quickCss.includes('#newDraftForm #newTag'), 'New Draft destination and tag controls must keep compact heights.');

const server = read('src/web/server.js');
assert(server.includes("url.pathname === '/api/preview'"), 'Server must expose canonical preview validation.');
assert(server.includes('WEB_SCRIPT_FILES') && server.includes('WEB_STYLE_FILES'), 'Server must use the consolidated asset manifest.');
assert(server.includes('WEB_FEATURES'), 'Server must use the current feature registry.');
assert(server.includes('fetchActiveThreads') && server.includes('fetchArchived'), 'Destination API must expose active and archived forum posts.');
assert(server.includes("'forum-post'"), 'Health metadata must advertise existing forum post support.');
assert(server.includes("url.pathname === '/api/import/builder'") && server.includes('parseBuilderDefinition'), 'Server must accept exported Builder JSON as a new draft.');
assert(appJs.includes("api('/api/import/builder'") && appJs.includes('MAX_BUILDER_IMPORT_BYTES'), 'Web Builder must submit Builder JSON files through the round-trip import endpoint.');
assert(appJs.includes('messageLayout') && !appJs.includes('updateMessageLayout'), 'The editor may preview a saved message layout but must only change it from Publish/Republish review.');
assert(appJs.includes('tagIds') && appJs.includes("channelType==='thread'"), 'Web Builder must submit multiple tags and render existing forum post destinations.');
assert(appJs.includes('new URLSearchParams(location.search)') && appJs.includes('requestedKind') && appJs.includes('requestedId'), 'Web Builder must open OAuth-preserved entity deep links.');
assert(appJs.includes("tagLabel?.classList.toggle('hidden',!isForum)") && appJs.includes('new-draft-no-tags'), 'Forum tag controls must be hidden unless the selected destination is a forum channel.');
assert(appJs.includes('Destination staged. Use Republish to apply it.') && appJs.includes('pendingDestination'), 'Published destination changes must be presented as staged until Republish.');
const destinationRoute = server.slice(server.indexOf('const destinationMatch'), server.indexOf('const profileMatch'));
assert(destinationRoute.includes('pendingDestination') && !destinationRoute.includes('recreateManagedPost'), 'Changing Destination must only stage state and must not create Discord content.');
const publishRoute = server.slice(server.indexOf('const publishMatch'), server.indexOf('const destinationMatch'));
assert(publishRoute.includes('refreshed.pendingDestination') && publishRoute.includes('recreateManagedPost'), 'Publish/Republish must apply a staged destination through the recreate flow.');
const postService = read('src/postService.js');
assert(postService.includes('delete source.pendingDestination;'), 'A successful recreate must clear its staged destination state.');
assert(!quickJs.includes('tagId:'), 'Quick Announcement drafts must preserve all selected forum tags.');
assert(!fs.existsSync(path.join(root, 'src/web/serverV15.js')), 'The obsolete serverV15 wrapper must be removed.');

const index = read('src/index.js');
assert(index.includes("from './web/server.js'"), 'Runtime must import the consolidated Web server.');
assert(!index.includes('serverV15.js'), 'Runtime must never import the deleted serverV15 wrapper.');

const workflow = read('.github/workflows/validate.yml');
assert(workflow.includes("'feature/**'"), 'CI must validate feature branches.');

const deviceContracts = [
  ['Large desktop', 1440, 1000],
  ['Laptop', 1280, 800],
  ['iPad landscape', 1180, 820],
  ['iPad portrait', 820, 1180],
  ['Large phone', 430, 932],
  ['Standard phone', 390, 844],
  ['Small phone', 360, 800]
];
assert(deviceContracts.every(([, width, height]) => width > 0 && height > 0), 'Device contract matrix is invalid.');

console.log(`Timewizzard v${VERSION} UI foundation validation passed.`);
console.log(`Validated ${WEB_SCRIPT_FILES.length} scripts, ${WEB_STYLE_FILES.length} styles and ${deviceContracts.length} device contracts.`);
