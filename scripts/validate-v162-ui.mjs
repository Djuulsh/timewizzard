import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../src/version.js';
import { WEB_SCRIPT_FILES, WEB_STYLE_FILES } from '../src/web/assets.js';
import { WEB_FEATURES } from '../src/web/features.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(VERSION === '1.6.3', 'The authoritative version must be 1.6.3.');
const pkg = JSON.parse(read('package.json'));
assert(pkg.version === VERSION, 'package.json must match src/version.js.');

for (const file of WEB_SCRIPT_FILES) assert(fs.existsSync(path.join(root, 'web', file)), `Missing Web Builder script: ${file}`);
for (const file of WEB_STYLE_FILES) assert(fs.existsSync(path.join(root, 'web', file)), `Missing Web Builder stylesheet: ${file}`);
assert(WEB_SCRIPT_FILES.at(-1) === 'v163.js', 'v163.js must be the final Web Builder script.');
assert(WEB_STYLE_FILES.at(-1) === 'v163.css', 'v163.css must be the final Web Builder stylesheet.');
assert(new Set(WEB_FEATURES).size === WEB_FEATURES.length, 'Web feature registry contains duplicates.');

const html = read('web/index.html');
assert(!html.includes('v1.3.1'), 'The HTML shell must not expose the legacy v1.3.1 version.');
assert(!html.includes('syncSeparatorPreview'), 'Legacy inline separator MutationObserver logic must be removed.');
assert(!/<style>[\s\S]*separator-size-demo/.test(html), 'Legacy inline separator CSS must be removed.');
assert(html.includes('viewport-fit=cover'), 'The HTML viewport must support device safe areas.');
assert(html.includes('aria-live="polite"'), 'The UI must expose a polite live region.');

const js162 = read('web/v162.js');
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
  'v163SyncWorkspaceMore'
]) assert(js163.includes(marker), `v163.js is missing navigation contract: ${marker}.`);

const css163 = read('web/v163.css');
for (const marker of [
  '.v163-preview-back',
  '.v163-workspace-more',
  'grid-template-columns:minmax(225px,.62fr) minmax(315px,1.38fr)',
  'body[data-tw-view="edit"]',
  '#v152MoreMenu{display:none!important}'
]) assert(css163.includes(marker), `v163.css is missing compact editor contract: ${marker}.`);

const server = read('src/web/server.js');
assert(server.includes("url.pathname === '/api/preview'"), 'Server must expose canonical preview validation.');
assert(server.includes('WEB_SCRIPT_FILES') && server.includes('WEB_STYLE_FILES'), 'Server must use the consolidated asset manifest.');
assert(server.includes('WEB_FEATURES'), 'Server must use the current feature registry.');
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
