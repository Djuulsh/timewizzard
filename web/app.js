const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  bootstrap: null,
  destinations: null,
  scope: null,
  entity: null,
  stats: null,
  revisions: [],
  dirty: false,
  selectedBlockId: null,
  search: '',
  profileTarget: null,
  pointerDrag: null,
  undoStack: [],
  redoStack: [],
  inputCheckpoint: null
};

const els = Object.fromEntries([
  'identity','entityList','entityCount','entitySearch','emptyState','editor','postTitle','postAccent','editorMeta','dirtyBadge','blockList','inspector','previewContent','previewStats','saveBtn','publishBtn','cloneBtn','exportBtn','deleteBtn','refreshBtn','newDraftBtn','undoBtn','redoBtn','destinationBtn','historyBtn','orphanBanner','messageSplitMode','messageTargetWrap','messageTargetCount','messageSplitHint','newDraftDialog','newDraftForm','newTitle','newForum','newTag','newTemplate','destinationDialog','destinationForm','destinationSelect','destinationTag','destinationHint','historyDialog','historyList','builderImportDialog','builderImportForm','builderImportFile','builderImportTitle','builderImportDestination','builderImportTag','importBuilderBtn','discohookDialog','discohookForm','discohookTitle','discohookDestination','discohookTag','discohookJson','importDiscohookBtn','profileDialog','profileForm','profileDialogTitle','profileDialogMeta','profileText','clearProfileBtn','toastHost'
].map((id) => [id, document.getElementById(id)]));

const TYPE_INFO = {
  text: ['📝', 'Text / Markdown'],
  image: ['🖼️', 'Image / banner'],
  gallery: ['🖼️', 'Media Gallery'],
  thumbnail: ['🔲', 'Thumbnail'],
  separator: ['➖', 'Separator'],
  open: ['🔘', 'Open + ephemeral'],
  link: ['🔗', 'Link button'],
  select: ['🔽', 'Select + ephemeral'],
  string_select: ['🧵', 'String Select + ephemeral'],
  profile_select: ['🎮', 'MerfinUI class/resolution select'],
  profile_open_list: ['📋', 'MerfinUI Open list (legacy)']
};

const QUOTE_ESCAPE = '\\>>>';
const MAX_STRING_SELECT_CONTENT_LENGTH = 200_000;
const MAX_BUILDER_IMPORT_BYTES = 20_000_000;

function toast(message, type = '') {
  const node = document.createElement('div');
  node.className = `toast ${type}`.trim();
  node.textContent = message;
  els.toastHost.append(node);
  setTimeout(() => node.remove(), 4500);
}

async function api(url, options = {}) {
  const request = { credentials: 'same-origin', ...options };
  if (request.body && typeof request.body !== 'string') {
    request.headers = { 'content-type': 'application/json', ...(request.headers || {}) };
    request.body = JSON.stringify(request.body);
  }
  const response = await fetch(url, request);
  if (response.status === 401) {
    location.href = '/auth/discord';
    throw new Error('Session expired.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function escapeAttr(value) { return escapeHtml(value).replaceAll('`', '&#096;'); }
function shortId(bytes = 3) {
  const array = crypto.getRandomValues(new Uint8Array(bytes));
  return [...array].map((value) => value.toString(16).padStart(2, '0')).join('');
}
function colorHex(value) { return `#${Number(value || 0).toString(16).padStart(6, '0').slice(-6)}`; }
function actionFor(block) { return block?.actionId ? state.entity?.builder?.actions?.[block.actionId] : null; }

function snapshot() {
  if (!state.entity) return null;
  return structuredClone({ title: state.entity.title, builder: state.entity.builder });
}
function snapshotKey(value) { return JSON.stringify(value); }
function pushUndo(previous = snapshot()) {
  if (!previous) return;
  const last = state.undoStack.at(-1);
  if (!last || snapshotKey(last) !== snapshotKey(previous)) state.undoStack.push(structuredClone(previous));
  if (state.undoStack.length > 60) state.undoStack.shift();
  state.redoStack = [];
  renderUndoRedo();
}
function applySnapshot(value) {
  if (!state.entity || !value) return;
  state.entity.title = value.title;
  state.entity.builder = structuredClone(value.builder);
  els.postTitle.value = state.entity.title;
  els.postAccent.value = colorHex(state.entity.builder.accentColor);
  if (!state.entity.builder.blocks.some((block) => block.id === state.selectedBlockId)) state.selectedBlockId = state.entity.builder.blocks[0]?.id || null;
  markDirty();
  renderAll();
}
function undo() {
  const previous = state.undoStack.pop();
  if (!previous) return;
  state.redoStack.push(snapshot());
  applySnapshot(previous);
  renderUndoRedo();
}
function redo() {
  const next = state.redoStack.pop();
  if (!next) return;
  state.undoStack.push(snapshot());
  applySnapshot(next);
  renderUndoRedo();
}
function renderUndoRedo() {
  els.undoBtn.disabled = !state.undoStack.length;
  els.redoBtn.disabled = !state.redoStack.length;
}
function beginInputEdit() { if (!state.inputCheckpoint) state.inputCheckpoint = snapshot(); }
function endInputEdit() {
  if (!state.inputCheckpoint) return;
  if (snapshotKey(state.inputCheckpoint) !== snapshotKey(snapshot())) pushUndo(state.inputCheckpoint);
  state.inputCheckpoint = null;
}

function referencedActionIds(block) {
  const ids = [];
  if (block?.actionId) ids.push(block.actionId);
  for (const option of block?.options || []) if (option.actionId) ids.push(option.actionId);
  return ids;
}
function collectActionTreeIds(actionId, result = new Set()) {
  if (!actionId || result.has(actionId)) return result;
  result.add(actionId);
  const action = state.entity?.builder?.actions?.[actionId];
  for (const child of action?.children || []) collectActionTreeIds(child.actionId, result);
  return result;
}
function removeActionTree(actionId) {
  for (const id of collectActionTreeIds(actionId)) delete state.entity.builder.actions[id];
}

function blockSummary(block) {
  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  if (block.type === 'text') return clean(block.content).slice(0, 80) || 'Empty text';
  if (block.type === 'image') return clean(block.url).slice(0, 80) || 'No image URL';
  if (block.type === 'gallery') return `${block.items?.length || 0} media items`;
  if (block.type === 'thumbnail') return clean(block.text).slice(0, 80) || 'Thumbnail';
  if (block.type === 'separator') return `Spacing ${block.spacing === 1 ? 'small' : 'large'}`;
  if (block.type === 'open') return clean(block.text).slice(0, 80) || 'Open row';
  if (block.type === 'link') return clean(block.text).slice(0, 80) || 'Link row';
  if (block.type === 'select' || block.type === 'string_select') return `${block.options?.length || 0} options · ${block.placeholder || 'Choose…'}`;
  if (block.type === 'profile_select') return block.placeholder || 'Choose class and resolution…';
  if (block.type === 'profile_open_list') return '18 class/resolution rows';
  return block.type;
}

function markDirty() {
  if (!state.entity) return;
  state.dirty = true;
  renderEditorMeta();
  renderPreview();
}

function discordState() { return state.scope?.kind === 'p' ? state.entity?.discordState ?? { status: 'unknown' } : null; }
function renderEditorMeta() {
  if (!state.entity || !state.scope) return;
  const kind = state.scope.kind === 'd' ? 'Draft' : 'Published';
  const deleted = discordState()?.status === 'deleted';
  const modified = state.scope.kind === 'p' && state.entity.publishedBuilder && (state.entity.title !== state.entity.publishedTitle || JSON.stringify(state.entity.builder) !== JSON.stringify(state.entity.publishedBuilder));
  const status = state.dirty ? 'Unsaved changes' : deleted ? `Deleted on Discord · ${discordState().reason || 'missing target'}` : state.scope.kind === 'd' ? 'Draft saved' : modified ? 'Saved · not published' : 'Synced with Discord';
  els.editorMeta.textContent = `${kind} · ID ${state.scope.id} · ${status}`;
  els.dirtyBadge.textContent = state.dirty ? 'Unsaved' : deleted ? 'Deleted' : modified ? 'Modified' : 'Saved';
  els.dirtyBadge.className = `pill ${deleted ? 'danger' : state.dirty || modified ? 'warn' : 'good'}`;
  els.saveBtn.disabled = !state.dirty;
  els.publishBtn.textContent = state.scope.kind === 'd' ? 'Publish' : deleted ? 'Re-create' : modified || state.dirty ? 'Publish changes' : 'Republish';
  els.orphanBanner.classList.toggle('hidden', !deleted);
  if (deleted) {
    const reason = discordState().reason === 'destination_missing' ? 'The destination channel is missing.' : 'The Discord message/thread is missing.';
    els.orphanBanner.innerHTML = `<strong>🔴 Deleted on Discord</strong><span>${escapeHtml(reason)} Builder-data is safe. Use <b>Re-create</b> or choose a new destination.</span>`;
  }
  renderUndoRedo();
}

async function refreshBootstrap({ keepSelection = true } = {}) {
  const previous = keepSelection && state.scope ? { ...state.scope } : null;
  state.bootstrap = await api('/api/bootstrap');
  els.identity.textContent = `${state.bootstrap.user.username} · ${state.bootstrap.guild.name || state.bootstrap.guild.id}`;
  renderEntityList();
  if (previous) {
    const exists = [...state.bootstrap.drafts, ...state.bootstrap.posts].some((item) => item.kind === previous.kind && item.id === previous.id);
    if (exists) await loadEntity(previous.kind, previous.id, { skipDirtyCheck: true });
  }
}

function renderEntityList() {
  if (!state.bootstrap) return;
  const query = state.search.toLowerCase();
  const drafts = state.bootstrap.drafts.filter((item) => item.title.toLowerCase().includes(query));
  const posts = state.bootstrap.posts.filter((item) => item.title.toLowerCase().includes(query));
  els.entityCount.textContent = String(state.bootstrap.drafts.length + state.bootstrap.posts.length);
  els.entityList.innerHTML = '';
  const section = (title) => { const el = document.createElement('div'); el.className = 'entity-section'; el.textContent = title; els.entityList.append(el); };
  const add = (item) => {
    const active = state.scope?.kind === item.kind && state.scope?.id === item.id;
    const deleted = item.kind === 'p' && item.discordState?.status === 'deleted';
    const card = document.createElement('div');
    card.className = `entity-card${active ? ' active' : ''}`;
    const statusClass = item.kind === 'd' ? 'draft' : deleted ? 'deleted' : item.modified ? 'modified' : '';
    const statusText = item.kind === 'd' ? 'Draft' : deleted ? 'Deleted on Discord' : item.modified ? 'Published · modified' : 'Published · synced';
    card.innerHTML = `<strong>${escapeHtml(item.title)}</strong><small><i class="status-dot ${statusClass}"></i>${statusText} · ${escapeHtml(item.id)}</small>`;
    card.addEventListener('click', () => loadEntity(item.kind, item.id));
    els.entityList.append(card);
  };
  section('Drafts');
  drafts.length ? drafts.forEach(add) : els.entityList.insertAdjacentHTML('beforeend', '<div class="entity-card">No drafts</div>');
  section('Published');
  posts.length ? posts.forEach(add) : els.entityList.insertAdjacentHTML('beforeend', '<div class="entity-card">No published posts</div>');
}

async function loadEntity(kind, id, { skipDirtyCheck = false } = {}) {
  if (!skipDirtyCheck && state.dirty && !confirm('You have unsaved changes. Discard them and open another post?')) return;
  const data = await api(`/api/entities/${kind}/${encodeURIComponent(id)}`);
  state.scope = data.scope;
  state.entity = data.entity;
  state.stats = data.stats;
  state.revisions = data.revisions || [];
  state.dirty = false;
  state.undoStack = [];
  state.redoStack = [];
  state.inputCheckpoint = null;
  state.selectedBlockId = state.entity.builder.blocks[0]?.id || null;
  els.emptyState.classList.add('hidden');
  els.editor.classList.remove('hidden');
  els.postTitle.value = state.entity.title;
  els.postAccent.value = colorHex(state.entity.builder.accentColor);
  renderEntityList();
  renderAll();
}

function renderAll() {
  renderEditorMeta();
  syncMessageLayoutControls();
  renderBlockList();
  renderInspector();
  renderPreview();
}

function renderBlockList() {
  if (!state.entity) return;
  els.blockList.innerHTML = '';
  state.entity.builder.blocks.forEach((block, index) => {
    const info = TYPE_INFO[block.type] || ['▫️', block.type];
    const card = document.createElement('div');
    card.className = `block-card${state.selectedBlockId === block.id ? ' selected' : ''}`;
    card.dataset.blockId = block.id;
    card.draggable = true;
    card.innerHTML = `<div class="drag-handle" title="Drag to reorder">☰</div><div class="block-main"><strong>${index + 1}. ${info[0]} ${escapeHtml(info[1])}</strong><small>${escapeHtml(blockSummary(block))}</small></div><div class="block-actions"><button class="mini-btn" data-mini="duplicate" title="Duplicate">⧉</button><button class="mini-btn" data-mini="delete" title="Delete">×</button></div>`;
    $('.block-main', card).addEventListener('click', () => { state.selectedBlockId = block.id; renderBlockList(); renderInspector(); });
    $('[data-mini="duplicate"]', card).addEventListener('click', (event) => { event.stopPropagation(); duplicateBlock(block.id); });
    $('[data-mini="delete"]', card).addEventListener('click', (event) => { event.stopPropagation(); deleteBlock(block.id); });
    card.addEventListener('dragstart', (event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', block.id); card.classList.add('dragging'); });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); $$('.drag-target').forEach((node) => node.classList.remove('drag-target')); });
    card.addEventListener('dragover', (event) => { event.preventDefault(); card.classList.add('drag-target'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-target'));
    card.addEventListener('drop', (event) => { event.preventDefault(); card.classList.remove('drag-target'); const sourceId = event.dataTransfer.getData('text/plain'); const rect = card.getBoundingClientRect(); reorderBlock(sourceId, block.id, event.clientY > rect.top + rect.height / 2); });
    $('.drag-handle', card).addEventListener('pointerdown', (event) => beginPointerDrag(event, block.id, card));
    els.blockList.append(card);
  });
}

function beginPointerDrag(event, blockId, card) {
  if (event.pointerType === 'mouse') return;
  event.preventDefault();
  state.pointerDrag = { pointerId: event.pointerId, blockId, card };
  card.classList.add('dragging');
  card.setPointerCapture?.(event.pointerId);
  const move = (moveEvent) => {
    if (!state.pointerDrag || moveEvent.pointerId !== state.pointerDrag.pointerId) return;
    const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest('.block-card');
    if (!target || target.dataset.blockId === blockId) return;
    const rect = target.getBoundingClientRect();
    reorderBlock(blockId, target.dataset.blockId, moveEvent.clientY > rect.top + rect.height / 2, false);
  };
  const end = (endEvent) => {
    if (endEvent.pointerId !== event.pointerId) return;
    card.classList.remove('dragging');
    state.pointerDrag = null;
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', end);
    document.removeEventListener('pointercancel', end);
    renderBlockList(); renderInspector();
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
}

function reorderBlock(sourceId, targetId, after, rerender = true) {
  if (!sourceId || sourceId === targetId || !state.entity) return;
  const blocks = state.entity.builder.blocks;
  const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
  if (sourceIndex < 0 || blocks.findIndex((block) => block.id === targetId) < 0) return;
  pushUndo();
  const [moved] = blocks.splice(sourceIndex, 1);
  let targetIndex = blocks.findIndex((block) => block.id === targetId);
  if (after) targetIndex += 1;
  blocks.splice(targetIndex, 0, moved);
  state.selectedBlockId = sourceId;
  markDirty();
  if (rerender) { renderBlockList(); renderInspector(); }
}

function cloneActionTree(actionId, seen = new Map()) {
  if (seen.has(actionId)) return seen.get(actionId);
  const source = state.entity.builder.actions[actionId];
  if (!source) return null;
  const id = shortId(4);
  seen.set(actionId, id);
  state.entity.builder.actions[id] = { ...structuredClone(source), id, children: [] };
  state.entity.builder.actions[id].children = (source.children || []).map((child) => ({ ...child, actionId: cloneActionTree(child.actionId, seen) }));
  return id;
}
function duplicateBlock(blockId) {
  const builder = state.entity.builder;
  if (builder.blocks.length >= 25) return toast('The builder can contain at most 25 blocks.', 'error');
  const index = builder.blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return;
  pushUndo();
  const copy = structuredClone(builder.blocks[index]);
  copy.id = shortId(3);
  const seen = new Map();
  if (copy.actionId) copy.actionId = cloneActionTree(copy.actionId, seen);
  if (Array.isArray(copy.options)) copy.options = copy.options.map((option) => ({ ...option, actionId: option.actionId ? cloneActionTree(option.actionId, seen) : option.actionId }));
  builder.blocks.splice(index + 1, 0, copy);
  state.selectedBlockId = copy.id;
  markDirty(); renderBlockList(); renderInspector();
}
function deleteBlock(blockId) {
  const builder = state.entity.builder;
  const index = builder.blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return;
  const block = builder.blocks[index];
  if (!confirm(`Delete ${TYPE_INFO[block.type]?.[1] || block.type}?`)) return;
  pushUndo();
  for (const actionId of referencedActionIds(block)) removeActionTree(actionId);
  builder.blocks.splice(index, 1);
  state.selectedBlockId = builder.blocks[Math.min(index, builder.blocks.length - 1)]?.id || null;
  markDirty(); renderBlockList(); renderInspector();
}

function addBlock(type) {
  if (!state.entity) return;
  if (state.entity.builder.blocks.length >= 25) return toast('The builder can contain at most 25 blocks.', 'error');
  pushUndo();
  const builder = state.entity.builder;
  let block;
  if (type === 'text') block = { id: shortId(3), type, content: '# Heading\nDescription…' };
  else if (type === 'image') block = { id: shortId(3), type, url: 'https://example.com/image.png', description: '' };
  else if (type === 'gallery') block = { id: shortId(3), type, items: [{ url: 'https://example.com/image1.png', description: '', spoiler: false }, { url: 'https://example.com/image2.png', description: '', spoiler: false }] };
  else if (type === 'thumbnail') block = { id: shortId(3), type, text: '## Thumbnail section\nDescription…', url: 'https://example.com/image.png', description: '', spoiler: false };
  else if (type === 'separator') block = { id: shortId(3), type, divider: true, spacing: 2 };
  else if (type === 'open') {
    const actionId = shortId(4);
    block = { id: shortId(3), type, text: '🔗 • **Information**', label: 'Open', actionId };
    builder.actions[actionId] = { id: actionId, type: 'ephemeral_text', title: 'Information', content: 'Ephemeral response…', children: [], presentation: 'buttons' };
  } else if (type === 'link') block = { id: shortId(3), type, text: '🔗 • **Website**', label: 'Open', url: 'https://example.com' };
  else if (type === 'select') {
    const actionId = shortId(4);
    block = { id: shortId(3), type, placeholder: 'Choose an option…', options: [{ label: 'Option 1', actionId }] };
    builder.actions[actionId] = { id: actionId, type: 'ephemeral_text', title: 'Option 1', content: 'Ephemeral response…', children: [], presentation: 'buttons' };
  } else if (type === 'string_select') {
    block = { id: shortId(3), type, placeholder: 'Choose a string…', options: [{ id: shortId(4), label: 'Option 1', content: 'Private string response…' }] };
  } else if (type === 'profile_select') block = { id: shortId(3), type, placeholder: 'Choose class and resolution…' };
  else if (type === 'profile_open_list') block = { id: shortId(3), type };
  else return;
  builder.blocks.push(block);
  state.selectedBlockId = block.id;
  markDirty(); renderBlockList(); renderInspector();
}

function selectedBlock() { return state.entity?.builder?.blocks?.find((block) => block.id === state.selectedBlockId) || null; }
function bind(selector, event, callback, root = els.inspector) { const node = $(selector, root); if (node) node.addEventListener(event, callback); return node; }
function bindInput(node, onInput) {
  node?.addEventListener('focus', beginInputEdit);
  node?.addEventListener('input', onInput);
  node?.addEventListener('change', endInputEdit);
  node?.addEventListener('blur', endInputEdit);
}

function toolbarHtml(targetId) {
  const actions = [['bold','B'],['italic','I'],['underline','U'],['strike','S'],['h1','H1'],['h2','H2'],['h3','H3'],['subtext','-#'],['quote','>'],['multiquote','>>>'],['quoteexit','Exit >>>'],['ul','•'],['ol','1.'],['code','`code`'],['codeblock','```'],['link','Link'],['spoiler','Spoiler']];
  return `<div class="markdown-toolbar" data-toolbar-for="${targetId}">${actions.map(([action,label]) => `<button type="button" class="toolbar-btn" data-md="${action}">${escapeHtml(label)}</button>`).join('')}</div>`;
}

function applyMarkdownAction(textarea, action) {
  if (!textarea) return;
  beginInputEdit();
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || 'text';
  const wraps = { bold:['**','**'], italic:['*','*'], underline:['__','__'], strike:['~~','~~'], code:['`','`'], spoiler:['||','||'] };
  let replacement = selected;
  if (wraps[action]) replacement = `${wraps[action][0]}${selected}${wraps[action][1]}`;
  else if (action === 'link') replacement = `[${selected}](https://example.com)`;
  else if (action === 'codeblock') replacement = `\`\`\`\n${selected}\n\`\`\``;
  else if (action === 'quoteexit') replacement = `${start > 0 && value[start - 1] !== '\n' ? '\n' : ''}${QUOTE_ESCAPE}\n`;
  else {
    const prefix = { h1:'# ', h2:'## ', h3:'### ', subtext:'-# ', quote:'> ', multiquote:'>>> ', ul:'- ', ol:'1. ' }[action];
    if (prefix) replacement = selected.split('\n').map((line, index) => action === 'multiquote' && index > 0 ? line : `${prefix}${line}`).join('\n');
  }
  textarea.setRangeText(replacement, start, end, 'end');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
}
function bindToolbar(root = els.inspector) {
  $$('[data-toolbar-for]', root).forEach((toolbar) => {
    const target = document.getElementById(toolbar.dataset.toolbarFor);
    $$('[data-md]', toolbar).forEach((button) => button.addEventListener('click', () => applyMarkdownAction(target, button.dataset.md)));
  });
}

function resolveName(kind, id) {
  const map = state.bootstrap?.entities?.[kind] || {};
  return map[id] || null;
}
function safeLinkTarget(value) {
  try { const url = new URL(String(value ?? '').replaceAll('&amp;', '&')); return ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
function discordRelativeTime(date) {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000); const abs = Math.abs(seconds); let value = seconds; let unit = 'second';
  if (abs >= 31536000) { value = Math.round(seconds / 31536000); unit = 'year'; }
  else if (abs >= 2592000) { value = Math.round(seconds / 2592000); unit = 'month'; }
  else if (abs >= 604800) { value = Math.round(seconds / 604800); unit = 'week'; }
  else if (abs >= 86400) { value = Math.round(seconds / 86400); unit = 'day'; }
  else if (abs >= 3600) { value = Math.round(seconds / 3600); unit = 'hour'; }
  else if (abs >= 60) { value = Math.round(seconds / 60); unit = 'minute'; }
  return new Intl.RelativeTimeFormat(navigator.language || 'en', { numeric: 'auto' }).format(value, unit);
}
function renderDiscordTimestamp(epoch, style = 'f') {
  const date = new Date(Number(epoch) * 1000); if (Number.isNaN(date.getTime())) return String(epoch); if (style === 'R') return discordRelativeTime(date);
  const options = { t:{hour:'2-digit',minute:'2-digit'}, T:{hour:'2-digit',minute:'2-digit',second:'2-digit'}, d:{year:'numeric',month:'2-digit',day:'2-digit'}, D:{year:'numeric',month:'long',day:'numeric'}, f:{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}, F:{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}, s:{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}, S:{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'} };
  return new Intl.DateTimeFormat(navigator.language || 'en-US', options[style] || options.f).format(date);
}
function renderInline(text) {
  const tokens = [];
  const stash = (html) => `\uE000${tokens.push(html) - 1}\uE001`;
  let raw = String(text ?? '');
  raw = raw.replace(/\\([\\`*_{}\[\]()#+\-.!>|~])/g, (_, value) => stash(escapeHtml(value)));
  raw = raw.replace(/`([^`\n]+)`/g, (_, code) => stash(`<code class="discord-inline-code">${escapeHtml(code)}</code>`));
  raw = raw.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gi, (_, label, href) => { const target = safeLinkTarget(href); return target ? stash(`<a class="discord-link" href="${escapeAttr(target)}" target="_blank" rel="noreferrer">${renderInline(label)}</a>`) : `${label} (${href})`; });
  raw = raw.replace(/<(https?:\/\/[^>\s]+)>/gi, (_, href) => { const target = safeLinkTarget(href); return target ? stash(`<a class="discord-link" href="${escapeAttr(target)}" target="_blank" rel="noreferrer">${escapeHtml(href)}</a>`) : href; });
  let out = escapeHtml(raw);
  out = out.replace(/__\*\*\*(.+?)\*\*\*__/g, '<u><strong><em>$1</em></strong></u>').replace(/__\*\*(.+?)\*\*__/g, '<u><strong>$1</strong></u>').replace(/__\*(.+?)\*__/g, '<u><em>$1</em></u>').replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<u>$1</u>').replace(/~~(.+?)~~/g, '<s>$1</s>').replace(/\|\|(.+?)\|\|/g, '<span class="discord-spoiler">$1</span>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  out = out.replace(/&lt;a:([A-Za-z0-9_]+):(\d+)&gt;/g, '<img class="inline-emoji" alt="$1" src="https://cdn.discordapp.com/emojis/$2.webp?size=32&animated=true">').replace(/&lt;:([A-Za-z0-9_]+):(\d+)&gt;/g, '<img class="inline-emoji" alt="$1" src="https://cdn.discordapp.com/emojis/$2.webp?size=32&quality=lossless">');
  out = out.replace(/&lt;@&amp;(\d+)&gt;/g, (_, id) => `<span class="discord-mention role">@${escapeHtml(resolveName('roles', id) || `role:${id}`)}</span>`);
  out = out.replace(/&lt;@!?(\d+)&gt;/g, (_, id) => `<span class="discord-mention">@${escapeHtml(resolveName('users', id) || `user:${id}`)}</span>`);
  out = out.replace(/&lt;#(\d+)&gt;/g, (_, id) => `<span class="discord-mention channel">#${escapeHtml(resolveName('channels', id) || `channel:${id}`)}</span>`);
  out = out.replace(/&lt;\/([^:]+):(\d+)&gt;/g, '<span class="discord-mention command">/$1</span>');
  out = out.replace(/&lt;t:(\d+)(?::([tTdDfFsSR]))?&gt;/g, (_, epoch, style) => `<span class="discord-timestamp">${escapeHtml(renderDiscordTimestamp(epoch, style || 'f'))}</span>`);
  return out.replace(/\uE000(\d+)\uE001/g, (_, index) => tokens[Number(index)] ?? '');
}

function renderMarkdown(content) {
  const lines = String(content || '').split(/\r?\n/); const html = []; let multiQuote = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === QUOTE_ESCAPE) { multiQuote = false; continue; }
    if (line.startsWith('```')) {
      const language = line.slice(3).trim(); const code = []; index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) { code.push(lines[index]); index += 1; }
      html.push(`<pre class="discord-codeblock">${language ? `<span class="discord-code-language">${escapeHtml(language)}</span>` : ''}<code>${escapeHtml(code.join('\n'))}</code></pre>`); continue;
    }
    if (multiQuote) { html.push(`<blockquote class="discord-quote multiline">${renderInline(line)}</blockquote>`); continue; }
    if (line === '>>>' || line.startsWith('>>> ')) { multiQuote = true; html.push(`<blockquote class="discord-quote multiline">${renderInline(line === '>>>' ? '' : line.slice(4))}</blockquote>`); continue; }
    if (line.startsWith('> ')) { html.push(`<blockquote class="discord-quote">${renderInline(line.slice(2))}</blockquote>`); continue; }
    if (line.startsWith('-# ')) { html.push(`<div class="discord-subtext">${renderInline(line.slice(3))}</div>`); continue; }
    if (line.startsWith('### ')) { html.push(`<h3>${renderInline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith('## ')) { html.push(`<h2>${renderInline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('# ')) { html.push(`<h1>${renderInline(line.slice(2))}</h1>`); continue; }
    const unordered = line.match(/^(\s*)[-*]\s+(.+)$/); if (unordered) { html.push(`<div class="discord-list-item" style="--list-depth:${Math.floor(unordered[1].length / 2)}"><span>•</span><div>${renderInline(unordered[2])}</div></div>`); continue; }
    const ordered = line.match(/^(\s*)(\d+)\.\s+(.+)$/); if (ordered) { html.push(`<div class="discord-list-item ordered" style="--list-depth:${Math.floor(ordered[1].length / 2)}"><span>${ordered[2]}.</span><div>${renderInline(ordered[3])}</div></div>`); continue; }
    if (!line.trim()) { html.push('<div class="discord-blank-line"></div>'); continue; }
    html.push(`<div>${renderInline(line)}</div>`);
  }
  return html.join('');
}

function markdownReferenceHtml() {
  const rows = [
    ['# Heading','# Heading'],['## Heading','## Heading'],['### Heading','### Heading'],['-# Subtext','-# Subtext'],['**Bold**','**Bold**'],['*Italic*','*Italic*'],['__Underline__','__Underline__'],['~~Strike~~','~~Strike~~'],['||Spoiler||','||Spoiler||'],['`inline code`','`inline code`'],['> Quote','> Quote'],['- Bullet','- Bullet'],['1. Ordered','1. Ordered'],['[Link](https://example.com)','[Link](https://example.com)'],['>>> Multi-line\ncontinues\n\\>>>\nNormal text','>>> Multi-line\ncontinues\n\\>>>\nNormal text']
  ];
  return `<details class="markdown-help"><summary>Discord Markdown reference · syntax + result</summary><div class="markdown-help-content"><div class="markdown-example-list">${rows.map(([raw,example]) => `<div class="markdown-example"><code>${escapeHtml(raw)}</code><div class="markdown-result">${renderMarkdown(example)}</div></div>`).join('')}</div><p class="markdown-help-note"><b>${escapeHtml(QUOTE_ESCAPE)}</b> on its own line is a Timewizzard escape marker. It splits the Text Display so a Discord <code>&gt;&gt;&gt;</code> multi-line quote ends and following text renders normally.</p></div></details>`;
}

function nestedEditorHtml(action, prefix) {
  const children = action?.children || [];
  return `<div class="nested-editor"><div class="nested-head"><strong>Next steps</strong><select id="${prefix}Presentation"><option value="buttons" ${action?.presentation !== 'select' ? 'selected' : ''}>Buttons</option><option value="select" ${action?.presentation === 'select' ? 'selected' : ''}>Select menu</option></select></div><div id="${prefix}Rows">${children.map((child, index) => { const target = state.entity.builder.actions[child.actionId] || {}; return `<div class="nested-row" data-nested-index="${index}"><input data-nested-label maxlength="100" value="${escapeAttr(child.label || '')}" placeholder="Label"><input data-nested-title maxlength="180" value="${escapeAttr(target.title || '')}" placeholder="Title"><textarea data-nested-content rows="3" placeholder="Response">${escapeHtml(target.content || '')}</textarea><button type="button" class="mini-btn" data-nested-remove>×</button></div>`; }).join('')}</div><button type="button" id="${prefix}Add" class="btn ghost">+ Next step</button></div>`;
}
function bindNestedEditor(action, prefix) {
  bind(`#${prefix}Presentation`, 'change', (event) => { beginInputEdit(); action.presentation = event.target.value; markDirty(); endInputEdit(); });
  $$(`#${prefix}Rows .nested-row`, els.inspector).forEach((row) => {
    const index = Number(row.dataset.nestedIndex); const child = action.children[index]; const target = state.entity.builder.actions[child.actionId];
    bindInput($('[data-nested-label]', row), (event) => { child.label = event.target.value; markDirty(); });
    bindInput($('[data-nested-title]', row), (event) => { target.title = event.target.value; markDirty(); });
    bindInput($('[data-nested-content]', row), (event) => { target.content = event.target.value; markDirty(); });
    $('[data-nested-remove]', row).addEventListener('click', () => { pushUndo(); const [removed] = action.children.splice(index, 1); removeActionTree(removed.actionId); markDirty(); renderInspector(); });
  });
  bind(`#${prefix}Add`, 'click', () => {
    const max = action.presentation === 'select' ? 25 : 5; if ((action.children || []).length >= max) return toast(`Max ${max} next steps for this layout.`, 'error');
    pushUndo(); const id = shortId(4); state.entity.builder.actions[id] = { id, type:'ephemeral_text', title:'Next step', content:'Next response…', children:[], presentation:'buttons' }; action.children ||= []; action.children.push({ label:`Next ${action.children.length + 1}`, actionId:id }); markDirty(); renderInspector();
  });
}

function renderInspector() {
  const block = selectedBlock();
  if (!block) { els.inspector.className = 'inspector-placeholder'; els.inspector.textContent = state.entity?.builder?.blocks?.length ? 'Select a block to edit it.' : 'Add a block to start building.'; return; }
  els.inspector.className = 'inspector-form';
  const info = TYPE_INFO[block.type] || ['▫️', block.type];

  if (block.type === 'text') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3>${toolbarHtml('iContent')}<label>Discord Markdown<textarea id="iContent" rows="12">${escapeHtml(block.content)}</textarea></label>${markdownReferenceHtml()}</div>`;
    bindInput($('#iContent', els.inspector), (event) => { block.content = event.target.value; markDirty(); }); bindToolbar(); return;
  }
  if (block.type === 'image') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><label>Image URL<input id="iUrl" value="${escapeAttr(block.url)}"></label><label>Alt text<input id="iDescription" value="${escapeAttr(block.description || '')}"></label><label><input id="iSpoiler" type="checkbox" ${block.spoiler ? 'checked' : ''}> Spoiler</label></div>`;
    bindInput($('#iUrl', els.inspector), (e) => { block.url = e.target.value; markDirty(); }); bindInput($('#iDescription', els.inspector), (e) => { block.description = e.target.value; markDirty(); }); bind('#iSpoiler','change',(e)=>{ pushUndo(); block.spoiler=e.target.checked; markDirty(); }); return;
  }
  if (block.type === 'gallery') {
    const items = (block.items || []).map((item,index)=>`<div class="gallery-editor-row" data-gallery-index="${index}"><input data-gallery-url value="${escapeAttr(item.url)}" placeholder="https://..."><input data-gallery-desc value="${escapeAttr(item.description || '')}" placeholder="Alt text"><label><input data-gallery-spoiler type="checkbox" ${item.spoiler ? 'checked':''}> spoiler</label><button type="button" class="mini-btn" data-gallery-remove>×</button></div>`).join('');
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><div id="galleryRows">${items}</div><button id="galleryAdd" type="button" class="btn ghost" ${(block.items?.length||0)>=10?'disabled':''}>+ Media item</button></div>`;
    $$('.gallery-editor-row',els.inspector).forEach((row)=>{ const i=Number(row.dataset.galleryIndex), item=block.items[i]; bindInput($('[data-gallery-url]',row),(e)=>{item.url=e.target.value;markDirty();}); bindInput($('[data-gallery-desc]',row),(e)=>{item.description=e.target.value;markDirty();}); $('[data-gallery-spoiler]',row).addEventListener('change',(e)=>{pushUndo();item.spoiler=e.target.checked;markDirty();}); $('[data-gallery-remove]',row).addEventListener('click',()=>{if(block.items.length<=1)return toast('Gallery needs at least one item.','error');pushUndo();block.items.splice(i,1);markDirty();renderInspector();}); });
    bind('#galleryAdd','click',()=>{if(block.items.length>=10)return;pushUndo();block.items.push({url:'https://example.com/image.png',description:'',spoiler:false});markDirty();renderInspector();}); return;
  }
  if (block.type === 'thumbnail') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3>${toolbarHtml('iThumbText')}<label>Section text<textarea id="iThumbText" rows="8">${escapeHtml(block.text)}</textarea></label><label>Thumbnail URL<input id="iUrl" value="${escapeAttr(block.url)}"></label><label>Alt text<input id="iDescription" value="${escapeAttr(block.description || '')}"></label><label><input id="iSpoiler" type="checkbox" ${block.spoiler?'checked':''}> Spoiler</label>${markdownReferenceHtml()}</div>`;
    bindInput($('#iThumbText',els.inspector),(e)=>{block.text=e.target.value;markDirty();}); bindInput($('#iUrl',els.inspector),(e)=>{block.url=e.target.value;markDirty();}); bindInput($('#iDescription',els.inspector),(e)=>{block.description=e.target.value;markDirty();}); bind('#iSpoiler','change',(e)=>{pushUndo();block.spoiler=e.target.checked;markDirty();}); bindToolbar(); return;
  }
  if (block.type === 'separator') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><label>Spacing<select id="iSpacing"><option value="1" ${block.spacing===1?'selected':''}>Small</option><option value="2" ${block.spacing!==1?'selected':''}>Large</option></select></label><label><input id="iDivider" type="checkbox" ${block.divider!==false?'checked':''}> Show divider line</label></div>`;
    bind('#iSpacing','change',(e)=>{pushUndo();block.spacing=Number(e.target.value);markDirty();}); bind('#iDivider','change',(e)=>{pushUndo();block.divider=e.target.checked;markDirty();}); return;
  }
  if (block.type === 'open') {
    const action = actionFor(block) || { id:block.actionId,type:'ephemeral_text',title:'',content:'',children:[],presentation:'buttons' }; state.entity.builder.actions[block.actionId]=action;
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><label>Row text<textarea id="iText" rows="4">${escapeHtml(block.text)}</textarea></label><label>Button label<input id="iLabel" maxlength="80" value="${escapeAttr(block.label||'Open')}"></label><label>Ephemeral title<input id="iActionTitle" maxlength="180" value="${escapeAttr(action.title||'')}"></label><label>Ephemeral response<textarea id="iActionContent" rows="8">${escapeHtml(action.content||'')}</textarea></label>${nestedEditorHtml(action,'openNested')}</div>`;
    bindInput($('#iText',els.inspector),(e)=>{block.text=e.target.value;markDirty();}); bindInput($('#iLabel',els.inspector),(e)=>{block.label=e.target.value;markDirty();}); bindInput($('#iActionTitle',els.inspector),(e)=>{action.title=e.target.value;markDirty();}); bindInput($('#iActionContent',els.inspector),(e)=>{action.content=e.target.value;markDirty();}); bindNestedEditor(action,'openNested'); return;
  }
  if (block.type === 'link') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><label>Row text<textarea id="iText" rows="4">${escapeHtml(block.text)}</textarea></label><label>Button label<input id="iLabel" maxlength="80" value="${escapeAttr(block.label||'Open')}"></label><label>URL<input id="iUrl" value="${escapeAttr(block.url)}"></label></div>`;
    bindInput($('#iText',els.inspector),(e)=>{block.text=e.target.value;markDirty();}); bindInput($('#iLabel',els.inspector),(e)=>{block.label=e.target.value;markDirty();}); bindInput($('#iUrl',els.inspector),(e)=>{block.url=e.target.value;markDirty();}); return;
  }
  if (block.type === 'select') {
    const rows=(block.options||[]).map((option,index)=>{const action=state.entity.builder.actions[option.actionId]||{id:option.actionId,type:'ephemeral_text',content:'',children:[],presentation:'buttons'};state.entity.builder.actions[option.actionId]=action;return `<div class="option-card" data-option-index="${index}"><div class="option-row"><input data-option-label value="${escapeAttr(option.label)}" maxlength="100"><textarea data-option-response rows="3">${escapeHtml(action.content||'')}</textarea><button class="mini-btn" type="button" data-remove-option>×</button></div>${nestedEditorHtml(action,`nested${index}`)}</div>`;}).join('');
    els.inspector.innerHTML=`<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><label>Placeholder<input id="iPlaceholder" maxlength="150" value="${escapeAttr(block.placeholder||'')}"></label><div id="optionRows">${rows}</div><button id="addOptionBtn" type="button" class="btn ghost" ${block.options.length>=25?'disabled':''}>+ Option</button></div>`;
    bindInput($('#iPlaceholder',els.inspector),(e)=>{block.placeholder=e.target.value;markDirty();}); $$('.option-card',els.inspector).forEach((card)=>{const i=Number(card.dataset.optionIndex), option=block.options[i], action=state.entity.builder.actions[option.actionId]; bindInput($('[data-option-label]',card),(e)=>{option.label=e.target.value;action.title=e.target.value;markDirty();}); bindInput($('[data-option-response]',card),(e)=>{action.content=e.target.value;markDirty();}); $('[data-remove-option]',card).addEventListener('click',()=>{if(block.options.length<=1)return toast('A select must contain at least one option.','error');pushUndo();const [removed]=block.options.splice(i,1);removeActionTree(removed.actionId);markDirty();renderInspector();}); bindNestedEditor(action,`nested${i}`); });
    bind('#addOptionBtn','click',()=>{if(block.options.length>=25)return;pushUndo();const actionId=shortId(4),number=block.options.length+1;block.options.push({label:`Option ${number}`,actionId});state.entity.builder.actions[actionId]={id:actionId,type:'ephemeral_text',title:`Option ${number}`,content:'Ephemeral response…',children:[],presentation:'buttons'};markDirty();renderInspector();}); return;
  }
  if (block.type === 'string_select') {
    const rows=(block.options||[]).map((option,index)=>`<div class="option-card" data-option-index="${index}"><div class="option-row"><input data-option-label value="${escapeAttr(option.label)}" maxlength="100"><div class="string-option-content"><textarea data-option-response rows="5" maxlength="${MAX_STRING_SELECT_CONTENT_LENGTH}">${escapeHtml(option.content||'')}</textarea><div class="string-option-meta"><button class="mini-btn string-import-btn" type="button" data-import-string>Importér .txt</button><input type="file" accept=".txt,text/plain" data-string-file hidden></div></div><button class="mini-btn" type="button" data-remove-option>×</button></div></div>`).join('');
    els.inspector.innerHTML=`<div class="inspector-card"><h3>🧵 String Select + privat TXT</h3><p>Hver option leveres privat som en UTF-8 .txt-fil. Maksimum er ${MAX_STRING_SELECT_CONTENT_LENGTH.toLocaleString('da-DK')} tegn.</p><label>Placeholder<input id="iPlaceholder" maxlength="150" value="${escapeAttr(block.placeholder||'')}"></label><div id="optionRows">${rows}</div><button id="addOptionBtn" type="button" class="btn ghost" ${block.options.length>=25?'disabled':''}>+ Option</button></div>`;
    bindInput($('#iPlaceholder',els.inspector),(e)=>{block.placeholder=e.target.value;markDirty();}); $$('.option-card',els.inspector).forEach((card)=>{const i=Number(card.dataset.optionIndex), option=block.options[i], textarea=$('[data-option-response]',card), fileInput=$('[data-string-file]',card);bindInput($('[data-option-label]',card),(e)=>{option.label=e.target.value;markDirty();});bindInput(textarea,(e)=>{option.content=e.target.value;markDirty();});$('[data-import-string]',card).addEventListener('click',()=>fileInput.click());fileInput.addEventListener('change',async()=>{const file=fileInput.files?.[0];if(!file)return;try{const content=(await file.text()).replace(/^\uFEFF/,'');if(content.length>MAX_STRING_SELECT_CONTENT_LENGTH)return toast(`TXT-filen er for lang. Maksimum er ${MAX_STRING_SELECT_CONTENT_LENGTH.toLocaleString('da-DK')} tegn.`,'error');pushUndo();textarea.value=content;textarea.dispatchEvent(new Event('input',{bubbles:true}));toast(`${file.name} importeret (${content.length.toLocaleString('da-DK')} tegn).`,'success');}catch(error){toast(`TXT-filen kunne ikke læses: ${error.message}`,'error');}finally{fileInput.value='';}});$('[data-remove-option]',card).addEventListener('click',()=>{if(block.options.length<=1)return toast('A String Select must contain at least one option.','error');pushUndo();block.options.splice(i,1);markDirty();renderInspector();});});bind('#addOptionBtn','click',()=>{if(block.options.length>=25)return;pushUndo();const number=block.options.length+1;block.options.push({id:shortId(4),label:`Option ${number}`,content:'Private string response…'});markDirty();renderInspector();});return;
  }
  if (block.type === 'profile_select' || block.type === 'profile_open_list') {
    const placeholder=block.type==='profile_select'?`<label>Placeholder<input id="iPlaceholder" maxlength="150" value="${escapeAttr(block.placeholder||'Choose class and resolution…')}"></label>`:'<p>This legacy block renders 18 Open rows and may split over multiple messages.</p>';
    const chips=(state.bootstrap?.classes||[]).flatMap((wowClass)=>(state.bootstrap?.resolutions||[]).map((resolution)=>{const status=state.bootstrap?.profileStatus?.[wowClass.key]?.[resolution.key];return `<button type="button" class="profile-chip" data-profile="${wowClass.key}:${resolution.key}">${escapeHtml(wowClass.name)} — ${escapeHtml(resolution.name)}<span>${status?.exists?`✅ ${status.length.toLocaleString()} chars`:'❌ Missing'}</span></button>`;})).join('');
    els.inspector.innerHTML=`<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3>${placeholder}<h3 style="margin-top:12px">Profile TXT</h3><div class="profile-grid">${chips}</div></div>`; if(block.type==='profile_select')bindInput($('#iPlaceholder',els.inspector),(e)=>{block.placeholder=e.target.value;markDirty();}); $$('[data-profile]',els.inspector).forEach((button)=>button.addEventListener('click',()=>{const [classKey,resolutionKey]=button.dataset.profile.split(':');openProfile(classKey,resolutionKey);})); return;
  }
  els.inspector.innerHTML=`<div class="inspector-placeholder">No inspector for ${escapeHtml(block.type)}</div>`;
}

function profileSelectOptions() { return (state.bootstrap?.classes||[]).flatMap((wowClass)=>(state.bootstrap?.resolutions||[]).map((resolution)=>`<option>${escapeHtml(wowClass.name)} — ${escapeHtml(resolution.name)}</option>`)).join(''); }
function renderPreviewBlock(block) {
  if(block.type==='text')return `<div class="preview-block preview-text">${renderMarkdown(block.content)}</div>`;
  if(block.type==='image'){const url=/^https?:\/\//i.test(block.url||'')?escapeAttr(block.url):'';return url?`<div class="preview-image${block.spoiler?' preview-media-spoiler':''}"><img src="${url}" alt="${escapeAttr(block.description||'')}"></div>`:'<div class="preview-block">⚠️ Add a valid image URL</div>';}
  if(block.type==='gallery')return `<div class="preview-gallery">${(block.items||[]).map((item)=>/^https?:\/\//i.test(item.url||'')?`<img class="${item.spoiler?'preview-media-spoiler':''}" src="${escapeAttr(item.url)}" alt="${escapeAttr(item.description||'')}">`:'').join('')}</div>`;
  if(block.type==='thumbnail'){const url=/^https?:\/\//i.test(block.url||'')?escapeAttr(block.url):'';return `<div class="preview-block preview-thumbnail"><div class="preview-text">${renderMarkdown(block.text)}</div>${url?`<img src="${url}" alt="${escapeAttr(block.description||'')}">`:''}</div>`;}
  if(block.type==='separator')return block.divider===false?'<div style="height:10px"></div>':'<hr class="preview-separator">';
  if(block.type==='open')return `<div class="preview-block preview-row"><div>${renderMarkdown(block.text)}</div><button class="mock-btn">${escapeHtml(block.label||'Open')}</button></div>`;
  if(block.type==='link')return `<div class="preview-block preview-row"><div>${renderMarkdown(block.text)}</div><button class="mock-btn">${escapeHtml(block.label||'Open')}</button></div>`;
  if(block.type==='select'||block.type==='string_select')return `<select class="preview-select" disabled><option>${escapeHtml(block.placeholder||'Choose an option…')}</option>${(block.options||[]).map((option)=>`<option>${escapeHtml(option.label)}</option>`).join('')}</select>`;
  if(block.type==='profile_select')return `<select class="preview-select" disabled><option>${escapeHtml(block.placeholder||'Choose class and resolution…')}</option>${profileSelectOptions()}</select>`;
  if(block.type==='profile_open_list')return (state.bootstrap?.classes||[]).flatMap((wowClass)=>(state.bootstrap?.resolutions||[]).map((resolution)=>`<div class="preview-block preview-row"><div>🔗 • <strong>${escapeHtml(wowClass.name)} — ${escapeHtml(resolution.name)}</strong></div><button class="mock-btn">Open</button></div>`)).join('');
  return '';
}
function textDisplayCount(value){return String(value||'').split(/\r?\n/).filter((line)=>line.trim()===QUOTE_ESCAPE).length+1;}
function unitList(block){const textLength=(value)=>String(value||'').length;if(block.type==='text')return [{count:textDisplayCount(block.content),text:textLength(block.content)}];if(block.type==='image'||block.type==='gallery'||block.type==='separator')return[{count:1,text:0}];if(block.type==='thumbnail'||block.type==='open'||block.type==='link')return[{count:3,text:textLength(block.text)}];if(block.type==='select'||block.type==='string_select'||block.type==='profile_select')return[{count:2,text:0}];if(block.type==='profile_open_list')return Array.from({length:18},()=>({count:3,text:30}));return[{count:1,text:0}];}
function liveStats(){const blocks=state.entity?.builder?.blocks||[];if(!blocks.length)return{messages:0,automaticMessages:0,components:0,text:0};const units=blocks.flatMap(unitList);let automaticMessages=1,currentCount=1,currentText=0,components=0,text=0;for(const unit of units){if(currentCount+unit.count>40||currentText+unit.text>4000){automaticMessages+=1;currentCount=1;currentText=0;}currentCount+=unit.count;currentText+=unit.text;components+=unit.count;text+=unit.text;}const layout=state.entity?.builder?.messageLayout||{mode:'auto'};const messages=layout.mode==='target'?Number(layout.targetCount||2):layout.mode==='per_block'?Math.max(automaticMessages,blocks.length):automaticMessages;return{messages,automaticMessages,components,text};}
function renderPreview(){if(!state.entity){els.previewContent.className='discord-container empty-preview';els.previewContent.textContent='Select a post to preview.';els.previewStats.textContent='—';return;}const stats=liveStats();els.previewContent.className='discord-container';els.previewContent.style.setProperty('--preview-accent',colorHex(state.entity.builder.accentColor));els.previewContent.innerHTML=state.entity.builder.blocks.map(renderPreviewBlock).join('')||'<div class="empty-preview">Add a block to start.</div>';els.previewStats.textContent=`${state.entity.builder.blocks.length} blocks · ${stats.messages} msg`;els.previewStats.className=`pill ${stats.messages>1?'warn':'good'}`;const old=$('.preview-warning',els.previewContent.parentElement);if(old)old.remove();if(stats.messages>1){const warning=document.createElement('div');warning.className='preview-warning';warning.textContent=`Discord limits will split this layout across approximately ${stats.messages} messages.`;els.previewContent.parentElement.append(warning);}}

function currentMessageLayout(){if(!state.entity)return{mode:'auto'};const layout=state.entity.builder.messageLayout||{mode:'auto'};state.entity.builder.messageLayout=layout;return layout;}
function syncMessageLayoutControls(){if(!state.entity)return;const layout=currentMessageLayout();els.messageSplitMode.value=layout.mode||'auto';els.messageTargetWrap.classList.toggle('hidden',layout.mode!=='target');els.messageTargetCount.value=String(layout.targetCount||2);const stats=liveStats();els.messageSplitHint.textContent=layout.mode==='auto'?`Automatic currently uses approximately ${stats.automaticMessages} message${stats.automaticMessages===1?'':'s'}.`:layout.mode==='per_block'?`Each top-level block/container starts a new message (approximately ${stats.messages}).`:`The post will be published as exactly ${layout.targetCount||2} messages when Discord limits allow it.`;}
function updateMessageLayout(){if(!state.entity)return;const mode=els.messageSplitMode.value;const targetCount=Math.max(1,Math.min(75,Number.parseInt(els.messageTargetCount.value,10)||2));state.entity.builder.messageLayout=mode==='target'?{mode,targetCount}:{mode};els.messageTargetCount.value=String(targetCount);syncMessageLayoutControls();markDirty();}

async function saveCurrent({silent=false}={}){if(!state.entity||!state.scope)return null;state.entity.title=els.postTitle.value.trim();if(!state.entity.title){toast('The post title cannot be empty.','error');return null;}try{const data=await api(`/api/entities/${state.scope.kind}/${encodeURIComponent(state.scope.id)}`,{method:'PUT',body:{title:state.entity.title,builder:state.entity.builder}});state.scope=data.scope;state.entity=data.entity;state.stats=data.stats;state.revisions=data.revisions||state.revisions;state.dirty=false;state.undoStack=[];state.redoStack=[];renderAll();await refreshBootstrap({keepSelection:false});renderEntityList();if(!silent)toast('Saved.','success');return data;}catch(error){toast(error.message,'error');return null;}}
async function publishCurrent(){if(!state.entity||!state.scope)return;if(state.dirty&&!await saveCurrent({silent:true}))return;const deleted=discordState()?.status==='deleted';if(deleted&&discordState()?.reason==='destination_missing'){openDestinationDialog();return;}els.publishBtn.disabled=true;const original=els.publishBtn.textContent;els.publishBtn.textContent=deleted?'Re-creating…':'Publishing…';try{const operation=deleted?'recreate':'publish';const data=await api(`/api/entities/${state.scope.kind}/${encodeURIComponent(state.scope.id)}/${operation}`,{method:'POST',body:{}});state.scope=data.scope;state.entity=data.entity;state.stats=data.stats;state.revisions=data.revisions||[];state.dirty=false;toast(deleted?'Re-created on Discord.':'Published to Discord.','success');await refreshBootstrap({keepSelection:false});renderEntityList();renderAll();}catch(error){if(/destination/i.test(error.message)&&deleted)openDestinationDialog();toast(error.message,'error');}finally{els.publishBtn.disabled=false;els.publishBtn.textContent=original;renderEditorMeta();}}
async function cloneCurrent(){if(!state.entity||!state.scope)return;if(state.dirty&&!await saveCurrent({silent:true}))return;try{const data=await api(`/api/entities/${state.scope.kind}/${encodeURIComponent(state.scope.id)}/clone`,{method:'POST',body:{}});toast('Cloned to a new draft.','success');await refreshBootstrap({keepSelection:false});await loadEntity(data.scope.kind,data.scope.id,{skipDirtyCheck:true});}catch(error){toast(error.message,'error');}}
async function deleteCurrent(){if(!state.entity||!state.scope)return;const label=state.scope.kind==='p'?'This removes the Builder record and deletes Discord content when it still exists.':'This deletes the draft.';if(!confirm(`${label}\n\nDelete “${state.entity.title}”?`))return;try{await api(`/api/entities/${state.scope.kind}/${encodeURIComponent(state.scope.id)}`,{method:'DELETE'});toast('Deleted.','success');state.scope=null;state.entity=null;state.stats=null;state.dirty=false;state.selectedBlockId=null;els.editor.classList.add('hidden');els.emptyState.classList.remove('hidden');renderPreview();await refreshBootstrap({keepSelection:false});}catch(error){toast(error.message,'error');}}
function exportCurrent(){if(!state.entity)return;const definition={format:'timewizzard-builder',version:2,title:state.entity.title,builder:state.entity.builder};const blob=new Blob([`${JSON.stringify(definition,null,2)}\n`],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${state.entity.title.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'post'}-builder.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

async function ensureDestinations(){if(!state.destinations)state.destinations=await api('/api/destinations');return state.destinations;}
function destinationOptionHtml(destination){const icon=destination.channelType==='forum'?'📋':destination.channelType==='thread'?'🧵':destination.channelType==='announcement'?'📢':'#️⃣';const suffix=destination.archived?' (archived)':'';return `<option value="${destination.id}">${icon} ${escapeHtml(destination.name+suffix)}</option>`;}
function selectedTagIds(tagEl){return [...tagEl.selectedOptions].map((option)=>option.value).filter(Boolean);}
function updateTagSelect(selectEl,tagEl,selected=[]){const destination=state.destinations?.find((item)=>item.id===selectEl.value);const isForum=destination?.type==='forum';const selectedIds=new Set(selected);tagEl.innerHTML=(destination?.tags||[]).map((tag)=>`<option value="${tag.id}" ${selectedIds.has(tag.id)?'selected':''}>${escapeHtml(tag.name)}</option>`).join('');tagEl.disabled=!isForum;if(!isForum)[...tagEl.options].forEach((option)=>{option.selected=false;});}
function validateSelectedTags(destination,tagEl){const tagIds=selectedTagIds(tagEl);if(tagIds.length>5){toast('Choose no more than five forum tags.','error');return null;}if(destination?.requireTag&&!tagIds.length){toast('This forum requires at least one tag.','error');return null;}return tagIds;}
function enableTagToggle(tagEl){tagEl.addEventListener('mousedown',(event)=>{if(event.button!==0||event.target.tagName!=='OPTION')return;event.preventDefault();event.target.selected=!event.target.selected;tagEl.focus();});}
async function openNewDraftDialog(){try{await ensureDestinations();els.newForum.innerHTML=state.destinations.map(destinationOptionHtml).join('');els.newTemplate.innerHTML=(state.bootstrap?.templates||[]).map((template)=>`<option value="${escapeAttr(template.value)}">${escapeHtml(template.name)}</option>`).join('');els.newTitle.value='';updateTagSelect(els.newForum,els.newTag);els.newDraftDialog.showModal();}catch(error){toast(error.message,'error');}}
async function createDraft(event){event.preventDefault();const destination=state.destinations?.find((item)=>item.id===els.newForum.value);const tagIds=validateSelectedTags(destination,els.newTag);if(!tagIds)return;try{const data=await api('/api/drafts',{method:'POST',body:{title:els.newTitle.value.trim(),destinationId:els.newForum.value,tagIds,template:els.newTemplate.value}});els.newDraftDialog.close();await refreshBootstrap({keepSelection:false});await loadEntity(data.scope.kind,data.scope.id,{skipDirtyCheck:true});toast('Draft created.','success');}catch(error){toast(error.message,'error');}}

async function openDestinationDialog(){if(!state.entity)return;try{await ensureDestinations();els.destinationSelect.innerHTML=state.destinations.map(destinationOptionHtml).join('');const current=state.entity.destinationChannelId||state.entity.forumChannelId||state.entity.forumId;if(current&&state.destinations.some((item)=>item.id===current))els.destinationSelect.value=current;updateTagSelect(els.destinationSelect,els.destinationTag,state.entity.appliedTagIds||[]);els.destinationHint.textContent=state.scope.kind==='p'?'Applying a destination to a published post creates the replacement first, then cleans the old Discord target. Selecting an existing forum post adds a managed Timewizzard message inside it.':'Draft destination changes without publishing.';els.destinationDialog.showModal();}catch(error){toast(error.message,'error');}}
async function applyDestination(event){event.preventDefault();const destination=state.destinations?.find((item)=>item.id===els.destinationSelect.value);const tagIds=validateSelectedTags(destination,els.destinationTag);if(!tagIds)return;try{if(state.dirty&&!await saveCurrent({silent:true}))return;const data=await api(`/api/entities/${state.scope.kind}/${encodeURIComponent(state.scope.id)}/destination`,{method:'PUT',body:{destinationId:els.destinationSelect.value,tagIds}});els.destinationDialog.close();state.scope=data.scope||state.scope;state.entity=data.entity;state.dirty=false;toast(state.scope.kind==='p'?'Post moved/re-created.':'Destination updated.','success');await refreshBootstrap({keepSelection:false});await loadEntity(state.scope.kind,state.scope.id,{skipDirtyCheck:true});}catch(error){toast(error.message,'error');}}

function openHistory(){if(!state.entity)return;const revisions=state.revisions||[];els.historyList.innerHTML=revisions.length?revisions.map((revision)=>`<div class="history-item"><div><strong>${new Date(revision.createdAt).toLocaleString()}</strong><small>${escapeHtml(revision.reason||'save')}</small></div><button type="button" class="btn ghost" data-restore-revision="${revision.id}">Restore</button></div>`).join(''):'<div class="dialog-note">No saved revisions yet.</div>';$$('[data-restore-revision]',els.historyList).forEach((button)=>button.addEventListener('click',()=>restoreRevision(button.dataset.restoreRevision)));els.historyDialog.showModal();}
async function restoreRevision(revisionId){if(!confirm('Restore this saved revision? Current saved state will be added to history first.'))return;try{const data=await api(`/api/entities/${state.scope.kind}/${encodeURIComponent(state.scope.id)}/revisions/${encodeURIComponent(revisionId)}/restore`,{method:'POST',body:{}});state.entity=data.entity;state.scope=data.scope;state.revisions=data.revisions||[];state.dirty=false;state.undoStack=[];state.redoStack=[];els.historyDialog.close();els.postTitle.value=state.entity.title;els.postAccent.value=colorHex(state.entity.builder.accentColor);renderAll();toast('Revision restored. Publish when ready.','success');}catch(error){toast(error.message,'error');}}

async function openBuilderImportDialog(){try{await ensureDestinations();els.builderImportDestination.innerHTML=state.destinations.map(destinationOptionHtml).join('');updateTagSelect(els.builderImportDestination,els.builderImportTag);els.builderImportFile.value='';els.builderImportTitle.value='';els.builderImportDialog.showModal();}catch(error){toast(error.message,'error');}}
async function importBuilderJson(event){event.preventDefault();const file=els.builderImportFile.files?.[0];if(!file)return toast('Choose a Builder JSON file.','error');if(file.size>MAX_BUILDER_IMPORT_BYTES)return toast('The JSON file is too large. Maximum size is 20 MB.','error');let definition;try{definition=JSON.parse((await file.text()).replace(/^\uFEFF/,''));}catch{return toast('The file is not valid JSON.','error');}const destination=state.destinations?.find((item)=>item.id===els.builderImportDestination.value);const tagIds=validateSelectedTags(destination,els.builderImportTag);if(!tagIds)return;try{const data=await api('/api/import/builder',{method:'POST',body:{title:els.builderImportTitle.value.trim()||null,destinationId:els.builderImportDestination.value,tagIds,definition}});els.builderImportDialog.close();await refreshBootstrap({keepSelection:false});await loadEntity(data.scope.kind,data.scope.id,{skipDirtyCheck:true});toast('Builder JSON imported as a new draft.','success');}catch(error){toast(error.message,'error');}}

async function openDiscohookDialog(){try{await ensureDestinations();els.discohookDestination.innerHTML=state.destinations.map(destinationOptionHtml).join('');updateTagSelect(els.discohookDestination,els.discohookTag);els.discohookJson.value='';els.discohookTitle.value='';els.discohookDialog.showModal();}catch(error){toast(error.message,'error');}}
async function importDiscohook(event){event.preventDefault();let payload;try{payload=JSON.parse(els.discohookJson.value);}catch{return toast('Invalid JSON.','error');}const destination=state.destinations?.find((item)=>item.id===els.discohookDestination.value);const tagIds=validateSelectedTags(destination,els.discohookTag);if(!tagIds)return;try{const data=await api('/api/import/discohook',{method:'POST',body:{title:els.discohookTitle.value.trim()||null,destinationId:els.discohookDestination.value,tagIds,payload}});els.discohookDialog.close();await refreshBootstrap({keepSelection:false});await loadEntity(data.scope.kind,data.scope.id,{skipDirtyCheck:true});if(data.warnings?.length)toast(`Imported with ${data.warnings.length} warning(s).`,'');else toast('DiscoHook imported.','success');}catch(error){toast(error.message,'error');}}

async function openProfile(classKey,resolutionKey){try{const wowClass=state.bootstrap.classes.find((item)=>item.key===classKey);const resolution=state.bootstrap.resolutions.find((item)=>item.key===resolutionKey);const data=await api(`/api/profiles/${classKey}/${resolutionKey}`);state.profileTarget={classKey,resolutionKey};els.profileDialogTitle.textContent=`${wowClass?.name||classKey} — ${resolution?.name||resolutionKey}`;els.profileDialogMeta.textContent=data.value?`${data.length.toLocaleString()} characters currently saved`:'No TXT value saved yet';els.profileText.value=data.value||'';els.clearProfileBtn.disabled=!data.value;els.profileDialog.showModal();}catch(error){toast(error.message,'error');}}
async function saveProfile(event){event.preventDefault();if(!state.profileTarget)return;const value=els.profileText.value;if(!value.trim())return toast('TXT content cannot be empty. Use Clear instead.','error');try{const{classKey,resolutionKey}=state.profileTarget;const data=await api(`/api/profiles/${classKey}/${resolutionKey}`,{method:'PUT',body:{value}});state.bootstrap.profileStatus[classKey][resolutionKey]={exists:true,length:data.length};els.profileDialog.close();renderInspector();toast(`Profile saved (${data.length.toLocaleString()} characters).`,'success');}catch(error){toast(error.message,'error');}}
async function clearProfile(){if(!state.profileTarget||!confirm('Clear this saved profile TXT?'))return;try{const{classKey,resolutionKey}=state.profileTarget;await api(`/api/profiles/${classKey}/${resolutionKey}`,{method:'DELETE'});state.bootstrap.profileStatus[classKey][resolutionKey]={exists:false,length:0};els.profileText.value='';els.profileDialogMeta.textContent='No TXT value saved yet';els.clearProfileBtn.disabled=true;renderInspector();toast('Profile cleared.','success');}catch(error){toast(error.message,'error');}}

els.entitySearch.addEventListener('input',(event)=>{state.search=event.target.value;renderEntityList();});
bindInput(els.postTitle,(event)=>{if(!state.entity)return;state.entity.title=event.target.value;markDirty();renderEntityList();});
bindInput(els.postAccent,(event)=>{if(!state.entity)return;state.entity.builder.accentColor=Number.parseInt(event.target.value.slice(1),16);markDirty();});
els.messageSplitMode.addEventListener('change',updateMessageLayout);els.messageTargetCount.addEventListener('change',updateMessageLayout);
els.saveBtn.addEventListener('click',()=>saveCurrent());els.publishBtn.addEventListener('click',publishCurrent);els.cloneBtn.addEventListener('click',cloneCurrent);els.exportBtn.addEventListener('click',exportCurrent);els.deleteBtn.addEventListener('click',deleteCurrent);els.refreshBtn.addEventListener('click',()=>refreshBootstrap());els.newDraftBtn.addEventListener('click',openNewDraftDialog);els.undoBtn.addEventListener('click',undo);els.redoBtn.addEventListener('click',redo);els.destinationBtn.addEventListener('click',openDestinationDialog);els.historyBtn.addEventListener('click',openHistory);els.importBuilderBtn.addEventListener('click',openBuilderImportDialog);els.importDiscohookBtn.addEventListener('click',openDiscohookDialog);
enableTagToggle(els.newTag);enableTagToggle(els.destinationTag);enableTagToggle(els.builderImportTag);enableTagToggle(els.discohookTag);
els.newForum.addEventListener('change',()=>updateTagSelect(els.newForum,els.newTag));els.destinationSelect.addEventListener('change',()=>updateTagSelect(els.destinationSelect,els.destinationTag));els.builderImportDestination.addEventListener('change',()=>updateTagSelect(els.builderImportDestination,els.builderImportTag));els.discohookDestination.addEventListener('change',()=>updateTagSelect(els.discohookDestination,els.discohookTag));els.newDraftForm.addEventListener('submit',createDraft);els.destinationForm.addEventListener('submit',applyDestination);els.builderImportForm.addEventListener('submit',importBuilderJson);els.discohookForm.addEventListener('submit',importDiscohook);els.profileForm.addEventListener('submit',saveProfile);els.clearProfileBtn.addEventListener('click',clearProfile);
$$('[data-action="new-draft"]').forEach((button)=>button.addEventListener('click',openNewDraftDialog));$$('[data-close-dialog]').forEach((button)=>button.addEventListener('click',()=>document.getElementById(button.dataset.closeDialog)?.close()));$$('[data-add]').forEach((button)=>button.addEventListener('click',()=>addBlock(button.dataset.add)));
document.addEventListener('keydown',(event)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();if(state.dirty)saveCurrent();}else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!event.shiftKey&&document.activeElement?.tagName!=='TEXTAREA'&&document.activeElement?.tagName!=='INPUT'){event.preventDefault();undo();}else if((event.ctrlKey||event.metaKey)&&((event.shiftKey&&event.key.toLowerCase()==='z')||event.key.toLowerCase()==='y')&&document.activeElement?.tagName!=='TEXTAREA'&&document.activeElement?.tagName!=='INPUT'){event.preventDefault();redo();}});
window.addEventListener('beforeunload',(event)=>{if(!state.dirty)return;event.preventDefault();event.returnValue='';});

try{await refreshBootstrap({keepSelection:false});renderUndoRedo();}catch(error){toast(error.message,'error');}
