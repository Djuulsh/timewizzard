import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = (value) => path.join(root, value);
const read = (value) => fs.readFile(file(value), 'utf8');
const write = (value, content) => fs.writeFile(file(value), content, 'utf8');

function replaceRequired(source, search, replacement, label) {
  const next = source.replace(search, replacement);
  if (next === source) throw new Error(`Could not apply migration step: ${label}`);
  return next;
}

let server = await read('src/web/server.js');
server = replaceRequired(
  server,
  "import { getBuilderStats } from '../builder/render.js';",
  "import { buildBuilderPayloads, getBuilderStats } from '../builder/render.js';",
  'canonical payload import'
);
server = replaceRequired(
  server,
  "} from './v131.js';\n\nconst VERSION = '1.4.0';",
  "} from './v131.js';\nimport { VERSION } from '../version.js';\nimport { WEB_SCRIPT_FILES, WEB_STYLE_FILES } from './assets.js';\nimport { WEB_FEATURES } from './features.js';",
  'authoritative runtime imports'
);
server = replaceRequired(
  server,
  "    if (url.pathname === '/api/discord-picker' && method === 'GET') {",
  `    if (url.pathname === '/api/preview' && method === 'POST') {
      const body = await readJsonBody(request);
      const title = String(body.title ?? 'Preview').trim().slice(0, 100) || 'Preview';
      const builder = validateBuilder(body.builder);
      const previewScope = {
        kind: ['d', 'p'].includes(body.scope?.kind) ? body.scope.kind : 'd',
        id: String(body.scope?.id || 'preview').slice(0, 100)
      };
      const entity = {
        title,
        builder,
        mentionPolicy: normalizeMentionPolicy(body.mentionPolicy)
      };
      const payloads = buildBuilderPayloads(entity, previewScope);
      json(response, 200, {
        payloads,
        stats: getBuilderStats(entity, previewScope)
      });
      return;
    }

    if (url.pathname === '/api/discord-picker' && method === 'GET') {`,
  'canonical preview route'
);
server = replaceRequired(
  server,
  /features:\s*\['orphan-recreate'[\s\S]*?\],\n\s*uptimeSeconds:/,
  'features: WEB_FEATURES,\n          uptimeSeconds:',
  'current health feature registry'
);
server = replaceRequired(
  server,
  "if (url.pathname === '/app.css') { await serveCombinedFiles(response, ['app.css', 'v131.css', 'v140.css'], 'text/css; charset=utf-8'); return; }",
  "if (url.pathname === '/app.css') { await serveCombinedFiles(response, WEB_STYLE_FILES, 'text/css; charset=utf-8'); return; }",
  'style manifest route'
);
server = replaceRequired(
  server,
  "if (url.pathname === '/app.js') { await serveCombinedFiles(response, ['app.js', 'v131.js', 'v140.js'], 'text/javascript; charset=utf-8'); return; }",
  "if (url.pathname === '/app.js') { await serveCombinedFiles(response, WEB_SCRIPT_FILES, 'text/javascript; charset=utf-8'); return; }",
  'script manifest route'
);
await write('src/web/server.js', server);

await fs.rm(file('src/web/serverV15.js'), { force: true });

let validation = await read('scripts/validate.js');
if (!validation.includes("../src/version.js")) {
  validation = validation.replace(
    "import { validateBuilder } from '../src/builder/validate.js';",
    "import { validateBuilder } from '../src/builder/validate.js';\nimport { VERSION } from '../src/version.js';"
  );
}
validation = validation.replace(
  "console.log('Timewizzard v1.5.0 validation passed.');",
  "if (VERSION !== '1.6.2') throw new Error('Runtime version is not v1.6.2.');\nconsole.log(`Timewizzard v${VERSION} validation passed.`);"
);
await write('scripts/validate.js', validation);

let changelog = await read('CHANGELOG.md');
if (!changelog.includes('## 1.6.2')) {
  const section = `## 1.6.2\n\n### v1.6.0 — UI foundation consolidation\n- Added one authoritative runtime version source and one Web Builder asset manifest.\n- Removed the obsolete serverV15 response-patching wrapper and legacy inline v1.3 separator observers.\n- Health, bootstrap, Discord status and Web Builder branding now share the same version and current feature registry.\n- Added a server-side canonical Components V2 preview endpoint using the normal publish payload generator.\n\n### v1.6.1 — Cross-platform workspace\n- Added a Posts drawer for laptop, iPad and phone layouts.\n- Added Blocks / Edit / Preview task navigation for iPad portrait and mobile.\n- Added Desktop / Mobile preview widths and eliminated horizontal workspace/header scrolling.\n- Standardized responsive Heading, Facts/Info List and Button Row layouts, touch targets, safe areas and dynamic viewport dialogs.\n\n### v1.6.2 — Safety, accessibility and QA\n- Added a pre-publish review with destination, message count, blocks, components, mention behaviour and payload warnings.\n- Added local crash recovery for unsaved editor work, cleared after successful Save.\n- Added keyboard-accessible blocks, visible focus states, dialog focus restoration, reduced-motion support and live payload status.\n- Added cross-platform UI contract validation and a documented desktop/iPad/phone QA matrix.\n\n`;
  changelog = changelog.replace('# Changelog\n\n', `# Changelog\n\n${section}`);
}
await write('CHANGELOG.md', changelog);

let readme = await read('README.md');
if (!readme.includes('Current release: **v1.6.2**')) {
  const marker = readme.indexOf('\n');
  if (marker >= 0) {
    readme = `${readme.slice(0, marker + 1)}\n> Current release: **v1.6.2** — consolidated cross-platform Web Builder, publish review and local crash recovery.\n${readme.slice(marker + 1)}`;
  }
}
await write('README.md', readme);

await fs.rm(file('scripts/apply-v162-upgrade.mjs'), { force: true });
await fs.rm(file('.github/workflows/apply-v162-upgrade.yml'), { force: true });

console.log('Applied Timewizzard v1.6.2 foundation migration.');
