import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(__dirname, '..', 'web', 'app.js');
const MARKER = 'GENERIC_DESTINATION_UI_V1';

let source = await fs.readFile(appPath, 'utf8');
if (!source.includes(MARKER)) {
  source = source.replace(
    "const label = state.scope.kind === 'p' ? 'This permanently deletes the entire Discord forum post.' : 'This deletes the draft.';",
    "const label = state.scope.kind === 'p' ? 'This removes the post from Builder and deletes its Discord message/thread when it still exists.' : 'This deletes the draft.';"
  );

  const oldTagFunction = `function updateTagSelect() {
  const forum = state.forums?.find((item) => item.id === els.newForum.value);
  const base = \`<option value=\"\">\${forum?.requireTag ? 'Choose required tag…' : 'No tag'}</option>\`;
  els.newTag.innerHTML = base + (forum?.tags || []).map((tag) => \`<option value=\"\${tag.id}\">\${escapeHtml(tag.name)}</option>\`).join('');
}`;

  const newTagFunction = `function updateTagSelect() {
  const destination = state.forums?.find((item) => item.id === els.newForum.value);
  const isForum = destination?.type === 'forum';
  const base = \`<option value=\"\">\${destination?.requireTag ? 'Choose required tag…' : 'No tag'}</option>\`;
  els.newTag.innerHTML = base + (destination?.tags || []).map((tag) => \`<option value=\"\${tag.id}\">\${escapeHtml(tag.name)}</option>\`).join('');
  els.newTag.disabled = !isForum;
  if (!isForum) els.newTag.value = '';
}`;

  source = source.replace(oldTagFunction, newTagFunction);
  source = `// ${MARKER}\n${source}`;
  await fs.writeFile(appPath, source, 'utf8');
  console.log('Prepared generic destination Web Builder UX.');
}
