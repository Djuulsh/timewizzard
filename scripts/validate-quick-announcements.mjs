import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../src/version.js';
import { WEB_FEATURES } from '../src/web/features.js';
import { WEB_SCRIPT_FILES, WEB_STYLE_FILES } from '../src/web/assets.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(VERSION === '1.7.0', 'Quick Announcement validation expects runtime v1.7.0.');
assert(WEB_SCRIPT_FILES.includes('quickAnnouncements.js'), 'Quick Announcement script must be loaded.');
assert(WEB_STYLE_FILES.includes('quickAnnouncements.css'), 'Quick Announcement stylesheet must be loaded.');

const js = read('web/quickAnnouncements.js');
for (const key of ['quick_announcement', 'quick_announcement_image', 'quick_announcement_action']) {
  assert(js.includes(key), `Missing Quick Announcement template key: ${key}`);
}
assert(js.includes("template: 'blank'"), 'Quick templates must create through the existing blank-draft API.');
assert(js.includes("method: 'PUT'"), 'Quick templates must replace the blank draft through normal validated entity save.');
assert(js.includes("quickAnnouncementBlock('image'"), 'Image variant must contain a real Image block.');
assert(js.includes("quickAnnouncementBlock('button_row'"), 'Action variant must contain a Button Row.');

const css = read('web/quickAnnouncements.css');
for (const marker of [
  '#newDraftDialog',
  'overflow:hidden!important',
  'scrollbar-gutter:auto!important',
  '.v150-template-badges i',
  'height:17px!important',
  'font-style:normal!important'
]) assert(css.includes(marker), `Quick Announcement CSS contract missing: ${marker}`);

for (const feature of ['template-catalog-36', 'quick-announcement-template-family', 'new-draft-single-scroll', 'uniform-template-badges']) {
  assert(WEB_FEATURES.includes(feature), `Feature registry missing ${feature}.`);
}

console.log('Quick Announcement template family validation passed.');
console.log('New Draft single-scroll and uniform template badge contracts passed.');
