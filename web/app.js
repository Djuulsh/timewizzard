const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  bootstrap: null,
  forums: null,
  scope: null,
  entity: null,
  stats: null,
  dirty: false,
  selectedBlockId: null,
  search: '',
  profileTarget: null,
  pointerDrag: null
};

const els = {
  identity: $('#identity'),
  entityList: $('#entityList'),
  entityCount: $('#entityCount'),
  entitySearch: $('#entitySearch'),
  emptyState: $('#emptyState'),
  editor: $('#editor'),
  postTitle: $('#postTitle'),
  postAccent: $('#postAccent'),
  editorMeta: $('#editorMeta'),
  dirtyBadge: $('#dirtyBadge'),
  blockList: $('#blockList'),
  inspector: $('#inspector'),
  previewContent: $('#previewContent'),
  previewStats: $('#previewStats'),
  saveBtn: $('#saveBtn'),
  publishBtn: $('#publishBtn'),
  cloneBtn: $('#cloneBtn'),
  exportBtn: $('#exportBtn'),
  deleteBtn: $('#deleteBtn'),
  refreshBtn: $('#refreshBtn'),
  newDraftBtn: $('#newDraftBtn'),
  newDraftDialog: $('#newDraftDialog'),
  newDraftForm: $('#newDraftForm'),
  newTitle: $('#newTitle'),
  newForum: $('#newForum'),
  newTag: $('#newTag'),
  newTemplate: $('#newTemplate'),
  profileDialog: $('#profileDialog'),
  profileForm: $('#profileForm'),
  profileDialogTitle: $('#profileDialogTitle'),
  profileDialogMeta: $('#profileDialogMeta'),
  profileText: $('#profileText'),
  clearProfileBtn: $('#clearProfileBtn'),
  toastHost: $('#toastHost')
};

const TYPE_INFO = {
  text: ['📝', 'Text / Markdown'],
  image: ['🖼️', 'Image / banner'],
  separator: ['➖', 'Separator'],
  open: ['🔘', 'Open + ephemeral'],
  link: ['🔗', 'Link button'],
  select: ['🔽', 'Select + ephemeral'],
  profile_select: ['🎮', 'MerfinUI class/resolution select'],
  profile_open_list: ['📋', 'MerfinUI Open list (legacy)']
};

function toast(message, type = '') {
  const node = document.createElement('div');
  node.className = `toast ${type}`.trim();
  node.textContent = message;
  els.toastHost.append(node);
  setTimeout(() => node.remove(), 4000);
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
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function shortId(bytes = 3) {
  const array = crypto.getRandomValues(new Uint8Array(bytes));
  return [...array].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function colorHex(value) {
  return `#${Number(value || 0).toString(16).padStart(6, '0').slice(-6)}`;
}

function actionFor(block) {
  return block?.actionId ? state.entity?.builder?.actions?.[block.actionId] : null;
}

function referencedActionIds(block) {
  const ids = [];
  if (block?.actionId) ids.push(block.actionId);
  for (const option of block?.options || []) if (option.actionId) ids.push(option.actionId);
  return ids;
}

function blockSummary(block) {
  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  if (block.type === 'text') return clean(block.content).slice(0, 80) || 'Empty text';
  if (block.type === 'image') return clean(block.url).slice(0, 80) || 'No image URL';
  if (block.type === 'separator') return `Spacing ${block.spacing === 1 ? 'small' : 'large'}`;
  if (block.type === 'open') return clean(block.text).slice(0, 80) || 'Open row';
  if (block.type === 'link') return clean(block.text).slice(0, 80) || 'Link row';
  if (block.type === 'select') return `${block.options?.length || 0} options · ${block.placeholder || 'Choose…'}`;
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

function renderEditorMeta() {
  if (!state.entity || !state.scope) return;
  const kind = state.scope.kind === 'd' ? 'Draft' : 'Published';
  const modified = state.scope.kind === 'p' && state.entity.publishedBuilder &&
    (state.entity.title !== state.entity.publishedTitle || JSON.stringify(state.entity.builder) !== JSON.stringify(state.entity.publishedBuilder));
  const status = state.dirty ? 'Unsaved changes' : state.scope.kind === 'd' ? 'Draft saved' : modified ? 'Saved · not published' : 'Synced with Discord';
  els.editorMeta.textContent = `${kind} · ID ${state.scope.id} · ${status}`;
  els.dirtyBadge.textContent = state.dirty ? 'Unsaved' : modified ? 'Modified' : 'Saved';
  els.dirtyBadge.className = `pill ${state.dirty || modified ? 'warn' : 'good'}`;
  els.saveBtn.disabled = !state.dirty;
  els.publishBtn.textContent = state.scope.kind === 'd' ? 'Publish' : modified || state.dirty ? 'Publish changes' : 'Republish';
}

async function refreshBootstrap({ keepSelection = true } = {}) {
  const previous = keepSelection && state.scope ? { ...state.scope } : null;
  state.bootstrap = await api('/api/bootstrap');
  els.identity.textContent = `${state.bootstrap.user.username} · ${state.bootstrap.guild.name || state.bootstrap.guild.id}`;
  renderEntityList();
  if (previous) {
    const exists = [...state.bootstrap.drafts, ...state.bootstrap.posts].some((item) => item.kind === previous.kind && item.id === previous.id);
    if (exists) await loadEntity(previous.kind, previous.id);
  }
}

function renderEntityList() {
  if (!state.bootstrap) return;
  const query = state.search.toLowerCase();
  const drafts = state.bootstrap.drafts.filter((item) => item.title.toLowerCase().includes(query));
  const posts = state.bootstrap.posts.filter((item) => item.title.toLowerCase().includes(query));
  els.entityCount.textContent = String(state.bootstrap.drafts.length + state.bootstrap.posts.length);
  els.entityList.innerHTML = '';

  const section = (title) => {
    const el = document.createElement('div');
    el.className = 'entity-section';
    el.textContent = title;
    els.entityList.append(el);
  };

  const add = (item) => {
    const active = state.scope?.kind === item.kind && state.scope?.id === item.id;
    const card = document.createElement('div');
    card.className = `entity-card${active ? ' active' : ''}`;
    const statusClass = item.kind === 'd' ? 'draft' : item.modified ? 'modified' : '';
    card.innerHTML = `<strong>${escapeHtml(item.title)}</strong><small><i class="status-dot ${statusClass}"></i>${item.kind === 'd' ? 'Draft' : item.modified ? 'Published · modified' : 'Published · synced'} · ${escapeHtml(item.id)}</small>`;
    card.addEventListener('click', () => loadEntity(item.kind, item.id));
    els.entityList.append(card);
  };

  section('Drafts');
  if (drafts.length) drafts.forEach(add); else {
    const empty = document.createElement('div'); empty.className = 'entity-card'; empty.textContent = 'No drafts'; els.entityList.append(empty);
  }
  section('Published');
  if (posts.length) posts.forEach(add); else {
    const empty = document.createElement('div'); empty.className = 'entity-card'; empty.textContent = 'No published posts'; els.entityList.append(empty);
  }
}

async function loadEntity(kind, id) {
  if (state.dirty && !confirm('You have unsaved changes. Discard them and open another post?')) return;
  const data = await api(`/api/entities/${kind}/${encodeURIComponent(id)}`);
  state.scope = data.scope;
  state.entity = data.entity;
  state.stats = data.stats;
  state.dirty = false;
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
    card.innerHTML = `
      <div class="drag-handle" title="Drag to reorder">☰</div>
      <div class="block-main">
        <strong>${index + 1}. ${info[0]} ${escapeHtml(info[1])}</strong>
        <small>${escapeHtml(blockSummary(block))}</small>
      </div>
      <div class="block-actions">
        <button class="mini-btn" data-mini="duplicate" title="Duplicate">⧉</button>
        <button class="mini-btn" data-mini="delete" title="Delete">×</button>
      </div>`;

    $('.block-main', card).addEventListener('click', () => {
      state.selectedBlockId = block.id;
      renderBlockList();
      renderInspector();
    });
    $('[data-mini="duplicate"]', card).addEventListener('click', (event) => {
      event.stopPropagation(); duplicateBlock(block.id);
    });
    $('[data-mini="delete"]', card).addEventListener('click', (event) => {
      event.stopPropagation(); deleteBlock(block.id);
    });

    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', block.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      $$('.drag-target').forEach((node) => node.classList.remove('drag-target'));
    });
    card.addEventListener('dragover', (event) => {
      event.preventDefault();
      card.classList.add('drag-target');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drag-target'));
    card.addEventListener('drop', (event) => {
      event.preventDefault();
      card.classList.remove('drag-target');
      const sourceId = event.dataTransfer.getData('text/plain');
      const rect = card.getBoundingClientRect();
      reorderBlock(sourceId, block.id, event.clientY > rect.top + rect.height / 2);
    });

    const handle = $('.drag-handle', card);
    handle.addEventListener('pointerdown', (event) => beginPointerDrag(event, block.id, card));
    els.blockList.append(card);
  });
}

function beginPointerDrag(event, blockId, card) {
  if (event.pointerType === 'mouse') return; // native DnD is better for mouse
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
    renderBlockList();
    renderInspector();
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
}

function reorderBlock(sourceId, targetId, after, rerender = true) {
  if (!sourceId || sourceId === targetId || !state.entity) return;
  const blocks = state.entity.builder.blocks;
  const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
  const targetOriginalIndex = blocks.findIndex((block) => block.id === targetId);
  if (sourceIndex < 0 || targetOriginalIndex < 0) return;
  const [moved] = blocks.splice(sourceIndex, 1);
  let targetIndex = blocks.findIndex((block) => block.id === targetId);
  if (after) targetIndex += 1;
  blocks.splice(targetIndex, 0, moved);
  state.selectedBlockId = sourceId;
  markDirty();
  if (rerender) {
    renderBlockList();
    renderInspector();
  }
}

function duplicateBlock(blockId) {
  const builder = state.entity.builder;
  if (builder.blocks.length >= 25) { toast('The builder can contain at most 25 blocks.', 'error'); return; }
  const index = builder.blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return;
  const copy = structuredClone(builder.blocks[index]);
  copy.id = shortId(3);
  if (copy.actionId) {
    const source = builder.actions[copy.actionId];
    const actionId = shortId(4);
    builder.actions[actionId] = { ...structuredClone(source), id: actionId };
    copy.actionId = actionId;
  }
  if (Array.isArray(copy.options)) {
    copy.options = copy.options.map((option) => {
      if (!option.actionId) return option;
      const source = builder.actions[option.actionId];
      const actionId = shortId(4);
      builder.actions[actionId] = { ...structuredClone(source), id: actionId };
      return { ...option, actionId };
    });
  }
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
  for (const actionId of referencedActionIds(block)) delete builder.actions[actionId];
  builder.blocks.splice(index, 1);
  state.selectedBlockId = builder.blocks[Math.min(index, builder.blocks.length - 1)]?.id || null;
  markDirty(); renderBlockList(); renderInspector();
}

function addBlock(type) {
  if (!state.entity) return;
  if (state.entity.builder.blocks.length >= 25) { toast('The builder can contain at most 25 blocks.', 'error'); return; }
  const builder = state.entity.builder;
  let block;
  if (type === 'text') block = { id: shortId(3), type, content: '# Heading\nDescription…' };
  else if (type === 'image') block = { id: shortId(3), type, url: 'https://', description: '' };
  else if (type === 'separator') block = { id: shortId(3), type, divider: true, spacing: 2 };
  else if (type === 'open') {
    const actionId = shortId(4);
    block = { id: shortId(3), type, text: '🔗 • **Information**', label: 'Open', actionId };
    builder.actions[actionId] = { id: actionId, type: 'ephemeral_text', title: 'Information', content: 'Ephemeral response…' };
  } else if (type === 'link') block = { id: shortId(3), type, text: '🔗 • **Website**', label: 'Open', url: 'https://' };
  else if (type === 'select') {
    const actionId = shortId(4);
    block = { id: shortId(3), type, placeholder: 'Choose an option…', options: [{ label: 'Option 1', actionId }] };
    builder.actions[actionId] = { id: actionId, type: 'ephemeral_text', title: 'Option 1', content: 'Ephemeral response…' };
  } else if (type === 'profile_select') block = { id: shortId(3), type, placeholder: 'Choose class and resolution…' };
  else if (type === 'profile_open_list') block = { id: shortId(3), type };
  else return;
  builder.blocks.push(block);
  state.selectedBlockId = block.id;
  markDirty(); renderBlockList(); renderInspector();
}

function selectedBlock() {
  return state.entity?.builder?.blocks?.find((block) => block.id === state.selectedBlockId) || null;
}

function bind(selector, event, callback, root = els.inspector) {
  const node = $(selector, root);
  if (node) node.addEventListener(event, callback);
  return node;
}

function renderInspector() {
  const block = selectedBlock();
  if (!block) {
    els.inspector.className = 'inspector-placeholder';
    els.inspector.textContent = state.entity?.builder?.blocks?.length ? 'Select a block to edit it.' : 'Add a block to start building.';
    return;
  }
  els.inspector.className = 'inspector-form';
  const info = TYPE_INFO[block.type] || ['▫️', block.type];

  if (block.type === 'text') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><label>Discord Markdown<textarea id="iContent" rows="10">${escapeHtml(block.content)}</textarea></label></div>`;
    bind('#iContent', 'input', (event) => { block.content = event.target.value; markDirty(); });
    return;
  }

  if (block.type === 'image') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><label>Image URL<input id="iUrl" value="${escapeAttr(block.url)}"></label><label>Alt text<input id="iDescription" value="${escapeAttr(block.description || '')}"></label></div>`;
    bind('#iUrl', 'input', (event) => { block.url = event.target.value; markDirty(); });
    bind('#iDescription', 'input', (event) => { block.description = event.target.value; markDirty(); });
    return;
  }

  if (block.type === 'separator') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><label>Spacing<select id="iSpacing"><option value="1" ${block.spacing === 1 ? 'selected' : ''}>Small</option><option value="2" ${block.spacing !== 1 ? 'selected' : ''}>Large</option></select></label><label><input id="iDivider" type="checkbox" ${block.divider !== false ? 'checked' : ''}> Show divider line</label></div>`;
    bind('#iSpacing', 'change', (event) => { block.spacing = Number(event.target.value); markDirty(); });
    bind('#iDivider', 'change', (event) => { block.divider = event.target.checked; markDirty(); });
    return;
  }

  if (block.type === 'open') {
    const action = actionFor(block) || { title: '', content: '' };
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><label>Row text<textarea id="iText" rows="4">${escapeHtml(block.text)}</textarea></label><label>Button label<input id="iLabel" maxlength="80" value="${escapeAttr(block.label || 'Open')}"></label><label>Ephemeral title<input id="iActionTitle" maxlength="180" value="${escapeAttr(action.title || '')}"></label><label>Ephemeral response<textarea id="iActionContent" rows="9">${escapeHtml(action.content || '')}</textarea></label></div>`;
    bind('#iText', 'input', (event) => { block.text = event.target.value; markDirty(); });
    bind('#iLabel', 'input', (event) => { block.label = event.target.value; markDirty(); });
    bind('#iActionTitle', 'input', (event) => { action.title = event.target.value; state.entity.builder.actions[block.actionId] = action; markDirty(); });
    bind('#iActionContent', 'input', (event) => { action.content = event.target.value; state.entity.builder.actions[block.actionId] = action; markDirty(); });
    return;
  }

  if (block.type === 'link') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><label>Row text<textarea id="iText" rows="4">${escapeHtml(block.text)}</textarea></label><label>Button label<input id="iLabel" maxlength="80" value="${escapeAttr(block.label || 'Open')}"></label><label>URL<input id="iUrl" value="${escapeAttr(block.url)}"></label></div>`;
    bind('#iText', 'input', (event) => { block.text = event.target.value; markDirty(); });
    bind('#iLabel', 'input', (event) => { block.label = event.target.value; markDirty(); });
    bind('#iUrl', 'input', (event) => { block.url = event.target.value; markDirty(); });
    return;
  }

  if (block.type === 'select') {
    const rows = (block.options || []).map((option, index) => {
      const action = state.entity.builder.actions[option.actionId] || { content: '' };
      return `<div class="option-row" data-option-index="${index}"><input data-option-label value="${escapeAttr(option.label)}" maxlength="100"><textarea data-option-response rows="3">${escapeHtml(action.content || '')}</textarea><button class="mini-btn" type="button" data-remove-option="${index}">×</button></div>`;
    }).join('');
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><label>Placeholder<input id="iPlaceholder" maxlength="150" value="${escapeAttr(block.placeholder || '')}"></label><div><h3>Options</h3><div id="optionRows">${rows}</div><button id="addOptionBtn" type="button" class="btn ghost" ${block.options.length >= 25 ? 'disabled' : ''}>+ Option</button></div></div>`;
    bind('#iPlaceholder', 'input', (event) => { block.placeholder = event.target.value; markDirty(); });
    $$('.option-row', els.inspector).forEach((row) => {
      const index = Number(row.dataset.optionIndex);
      $('[data-option-label]', row).addEventListener('input', (event) => {
        const option = block.options[index]; option.label = event.target.value;
        const action = state.entity.builder.actions[option.actionId]; if (action) action.title = event.target.value;
        markDirty(); renderPreview();
      });
      $('[data-option-response]', row).addEventListener('input', (event) => {
        const option = block.options[index]; const action = state.entity.builder.actions[option.actionId]; if (action) action.content = event.target.value;
        markDirty();
      });
      $('[data-remove-option]', row).addEventListener('click', () => {
        if (block.options.length <= 1) { toast('A select must contain at least one option.', 'error'); return; }
        const [removed] = block.options.splice(index, 1); delete state.entity.builder.actions[removed.actionId];
        markDirty(); renderInspector(); renderPreview();
      });
    });
    bind('#addOptionBtn', 'click', () => {
      if (block.options.length >= 25) return;
      const actionId = shortId(4);
      const number = block.options.length + 1;
      block.options.push({ label: `Option ${number}`, actionId });
      state.entity.builder.actions[actionId] = { id: actionId, type: 'ephemeral_text', title: `Option ${number}`, content: 'Ephemeral response…' };
      markDirty(); renderInspector(); renderPreview();
    });
    return;
  }

  if (block.type === 'profile_select' || block.type === 'profile_open_list') {
    const placeholder = block.type === 'profile_select'
      ? `<label>Placeholder<input id="iPlaceholder" maxlength="150" value="${escapeAttr(block.placeholder || 'Choose class and resolution…')}"></label>`
      : '<p>This legacy block renders 18 Open rows and may force Discord to split the post over multiple messages.</p>';
    const chips = (state.bootstrap?.classes || []).flatMap((wowClass) => (state.bootstrap?.resolutions || []).map((resolution) => {
      const status = state.bootstrap?.profileStatus?.[wowClass.key]?.[resolution.key];
      const statusText = status?.exists ? `✅ ${status.length.toLocaleString()} chars` : '❌ Missing';
      return `<button type="button" class="profile-chip" data-profile="${wowClass.key}:${resolution.key}">${escapeHtml(wowClass.name)} — ${escapeHtml(resolution.name)}<span>${statusText}</span></button>`;
    })).join('');
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3>${placeholder}<h3 style="margin-top:12px">Profile TXT</h3><p>Each dropdown option reads its latest value directly from Railway storage.</p><div class="profile-grid">${chips}</div></div>`;
    if (block.type === 'profile_select') bind('#iPlaceholder', 'input', (event) => { block.placeholder = event.target.value; markDirty(); });
    $$('[data-profile]', els.inspector).forEach((button) => button.addEventListener('click', () => {
      const [classKey, resolutionKey] = button.dataset.profile.split(':');
      openProfile(classKey, resolutionKey);
    }));
    return;
  }

  els.inspector.innerHTML = `<div class="inspector-placeholder">No inspector for ${escapeHtml(block.type)}</div>`;
}

function renderInline(text) {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/&lt;:([A-Za-z0-9_]+):(\d+)&gt;/g, '<img class="inline-emoji" alt="$1" src="https://cdn.discordapp.com/emojis/$2.webp?size=32&quality=lossless">');
  return out;
}

function renderMarkdown(content) {
  const lines = String(content || '').split(/\r?\n/);
  return lines.map((line) => {
    if (line.startsWith('### ')) return `<h3>${renderInline(line.slice(4))}</h3>`;
    if (line.startsWith('## ')) return `<h2>${renderInline(line.slice(3))}</h2>`;
    if (line.startsWith('# ')) return `<h1>${renderInline(line.slice(2))}</h1>`;
    if (!line.trim()) return '<div style="height:6px"></div>';
    return `<div>${renderInline(line)}</div>`;
  }).join('');
}

function profileSelectOptions() {
  return (state.bootstrap?.classes || []).flatMap((wowClass) => (state.bootstrap?.resolutions || []).map((resolution) =>
    `<option>${escapeHtml(wowClass.name)} — ${escapeHtml(resolution.name)}</option>`
  )).join('');
}

function renderPreviewBlock(block) {
  if (block.type === 'text') return `<div class="preview-block preview-text">${renderMarkdown(block.content)}</div>`;
  if (block.type === 'image') {
    const url = /^https?:\/\//i.test(block.url || '') ? escapeAttr(block.url) : '';
    return url ? `<div class="preview-image"><img src="${url}" alt="${escapeAttr(block.description || '')}"></div>` : '<div class="preview-block preview-text">⚠️ Add a valid image URL</div>';
  }
  if (block.type === 'separator') return block.divider === false ? '<div style="height:10px"></div>' : '<hr class="preview-separator">';
  if (block.type === 'open') return `<div class="preview-block preview-row"><div>${renderMarkdown(block.text)}</div><button class="mock-btn">${escapeHtml(block.label || 'Open')}</button></div>`;
  if (block.type === 'link') return `<div class="preview-block preview-row"><div>${renderMarkdown(block.text)}</div><button class="mock-btn">${escapeHtml(block.label || 'Open')}</button></div>`;
  if (block.type === 'select') return `<select class="preview-select" disabled><option>${escapeHtml(block.placeholder || 'Choose an option…')}</option>${(block.options || []).map((option) => `<option>${escapeHtml(option.label)}</option>`).join('')}</select>`;
  if (block.type === 'profile_select') return `<select class="preview-select" disabled><option>${escapeHtml(block.placeholder || 'Choose class and resolution…')}</option>${profileSelectOptions()}</select>`;
  if (block.type === 'profile_open_list') return (state.bootstrap?.classes || []).flatMap((wowClass) => (state.bootstrap?.resolutions || []).map((resolution) => `<div class="preview-block preview-row"><div>🔗 • <strong>${escapeHtml(wowClass.name)} — ${escapeHtml(resolution.name)}</strong></div><button class="mock-btn">Open</button></div>`)).join('');
  return '';
}

function unitList(block) {
  const textLength = (value) => String(value || '').length;
  if (block.type === 'text') return [{ count: 1, text: textLength(block.content) }];
  if (block.type === 'image' || block.type === 'separator') return [{ count: 1, text: 0 }];
  if (block.type === 'open' || block.type === 'link') return [{ count: 3, text: textLength(block.text) }];
  if (block.type === 'select' || block.type === 'profile_select') return [{ count: 2, text: 0 }];
  if (block.type === 'profile_open_list') return Array.from({ length: 18 }, () => ({ count: 3, text: 30 }));
  return [{ count: 1, text: 0 }];
}

function liveStats() {
  const blocks = state.entity?.builder?.blocks || [];
  if (!blocks.length) return { messages: 0, components: 0, text: 0 };
  const units = blocks.flatMap(unitList);
  let messages = 1, currentCount = 1, currentText = 0, components = 0, text = 0;
  for (const unit of units) {
    if (currentCount + unit.count > 40 || currentText + unit.text > 4000) {
      messages += 1; currentCount = 1; currentText = 0;
    }
    currentCount += unit.count; currentText += unit.text; components += unit.count; text += unit.text;
  }
  return { messages, components, text };
}

function renderPreview() {
  if (!state.entity) {
    els.previewContent.className = 'discord-container empty-preview';
    els.previewContent.textContent = 'Select a post to preview.';
    els.previewStats.textContent = '—';
    return;
  }
  const stats = liveStats();
  els.previewContent.className = 'discord-container';
  els.previewContent.style.setProperty('--preview-accent', colorHex(state.entity.builder.accentColor));
  els.previewContent.innerHTML = state.entity.builder.blocks.map(renderPreviewBlock).join('') || '<div class="empty-preview">Add a block to start.</div>';
  els.previewStats.textContent = `${state.entity.builder.blocks.length} blocks · ${stats.messages} msg`;
  els.previewStats.className = `pill ${stats.messages > 1 ? 'warn' : 'good'}`;
  const oldWarning = $('.preview-warning', els.previewContent.parentElement);
  if (oldWarning) oldWarning.remove();
  if (stats.messages > 1) {
    const warning = document.createElement('div');
    warning.className = 'preview-warning';
    warning.textContent = `Discord limits will split this layout across approximately ${stats.messages} messages.`;
    els.previewContent.parentElement.append(warning);
  }
}

async function saveCurrent({ silent = false } = {}) {
  if (!state.entity || !state.scope) return null;
  state.entity.title = els.postTitle.value.trim();
  if (!state.entity.title) { toast('The post title cannot be empty.', 'error'); return null; }
  try {
    const data = await api(`/api/entities/${state.scope.kind}/${encodeURIComponent(state.scope.id)}`, {
      method: 'PUT',
      body: { title: state.entity.title, builder: state.entity.builder }
    });
    state.entity = data.entity; state.stats = data.stats; state.dirty = false;
    renderEditorMeta(); renderBlockList(); renderInspector(); renderPreview();
    await refreshBootstrap({ keepSelection: false });
    renderEntityList();
    if (!silent) toast('Saved.', 'success');
    return data;
  } catch (error) {
    toast(error.message, 'error');
    return null;
  }
}

async function publishCurrent() {
  if (!state.entity || !state.scope) return;
  if (state.dirty && !await saveCurrent({ silent: true })) return;
  const buttonText = els.publishBtn.textContent;
  els.publishBtn.disabled = true; els.publishBtn.textContent = 'Publishing…';
  try {
    const data = await api(`/api/entities/${state.scope.kind}/${encodeURIComponent(state.scope.id)}/publish`, { method: 'POST', body: {} });
    state.scope = data.scope; state.entity = data.entity; state.stats = data.stats; state.dirty = false;
    toast(state.scope.kind === 'p' ? 'Published to Discord.' : 'Published.', 'success');
    await refreshBootstrap({ keepSelection: false });
    renderEntityList(); renderAll();
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    els.publishBtn.disabled = false; els.publishBtn.textContent = buttonText;
  }
}

async function cloneCurrent() {
  if (!state.entity || !state.scope) return;
  if (state.dirty && !await saveCurrent({ silent: true })) return;
  try {
    const data = await api(`/api/entities/${state.scope.kind}/${encodeURIComponent(state.scope.id)}/clone`, { method: 'POST', body: {} });
    toast('Cloned to a new draft.', 'success');
    await refreshBootstrap({ keepSelection: false });
    await loadEntity(data.scope.kind, data.scope.id);
  } catch (error) { toast(error.message, 'error'); }
}

async function deleteCurrent() {
  if (!state.entity || !state.scope) return;
  const label = state.scope.kind === 'p' ? 'This permanently deletes the entire Discord forum post.' : 'This deletes the draft.';
  if (!confirm(`${label}\n\nDelete “${state.entity.title}”?`)) return;
  try {
    await api(`/api/entities/${state.scope.kind}/${encodeURIComponent(state.scope.id)}`, { method: 'DELETE' });
    toast('Deleted.', 'success');
    state.scope = null; state.entity = null; state.stats = null; state.dirty = false; state.selectedBlockId = null;
    els.editor.classList.add('hidden'); els.emptyState.classList.remove('hidden'); renderPreview();
    await refreshBootstrap({ keepSelection: false });
  } catch (error) { toast(error.message, 'error'); }
}

function exportCurrent() {
  if (!state.entity) return;
  const definition = { format: 'shrouded-info-builder', version: 1, title: state.entity.title, builder: state.entity.builder };
  const blob = new Blob([`${JSON.stringify(definition, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${state.entity.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'post'}-builder.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function openNewDraftDialog() {
  try {
    if (!state.forums) state.forums = await api('/api/forums');
    els.newForum.innerHTML = state.forums.map((forum) => `<option value="${forum.id}">${escapeHtml(forum.name)}</option>`).join('');
    els.newTemplate.innerHTML = (state.bootstrap?.templates || []).map((template) => `<option value="${escapeAttr(template.value)}">${escapeHtml(template.name)}</option>`).join('');
    els.newTitle.value = '';
    updateTagSelect();
    els.newDraftDialog.showModal();
  } catch (error) { toast(error.message, 'error'); }
}

function updateTagSelect() {
  const forum = state.forums?.find((item) => item.id === els.newForum.value);
  const base = `<option value="">${forum?.requireTag ? 'Choose required tag…' : 'No tag'}</option>`;
  els.newTag.innerHTML = base + (forum?.tags || []).map((tag) => `<option value="${tag.id}">${escapeHtml(tag.name)}</option>`).join('');
}

async function createDraft(event) {
  event.preventDefault();
  const forum = state.forums?.find((item) => item.id === els.newForum.value);
  if (forum?.requireTag && !els.newTag.value) { toast('This forum requires a tag.', 'error'); return; }
  try {
    const data = await api('/api/drafts', {
      method: 'POST',
      body: { title: els.newTitle.value.trim(), forumId: els.newForum.value, tagId: els.newTag.value || null, template: els.newTemplate.value }
    });
    els.newDraftDialog.close();
    await refreshBootstrap({ keepSelection: false });
    await loadEntity(data.scope.kind, data.scope.id);
    toast('Draft created.', 'success');
  } catch (error) { toast(error.message, 'error'); }
}

async function openProfile(classKey, resolutionKey) {
  try {
    const wowClass = state.bootstrap.classes.find((item) => item.key === classKey);
    const resolution = state.bootstrap.resolutions.find((item) => item.key === resolutionKey);
    const data = await api(`/api/profiles/${classKey}/${resolutionKey}`);
    state.profileTarget = { classKey, resolutionKey };
    els.profileDialogTitle.textContent = `${wowClass?.name || classKey} — ${resolution?.name || resolutionKey}`;
    els.profileDialogMeta.textContent = data.value ? `${data.length.toLocaleString()} characters currently saved` : 'No TXT value saved yet';
    els.profileText.value = data.value || '';
    els.clearProfileBtn.disabled = !data.value;
    els.profileDialog.showModal();
  } catch (error) { toast(error.message, 'error'); }
}

async function saveProfile(event) {
  event.preventDefault();
  if (!state.profileTarget) return;
  const value = els.profileText.value;
  if (!value.trim()) { toast('TXT content cannot be empty. Use Clear instead.', 'error'); return; }
  try {
    const { classKey, resolutionKey } = state.profileTarget;
    const data = await api(`/api/profiles/${classKey}/${resolutionKey}`, { method: 'PUT', body: { value } });
    state.bootstrap.profileStatus[classKey][resolutionKey] = { exists: true, length: data.length };
    els.profileDialog.close();
    renderInspector();
    toast(`Profile saved (${data.length.toLocaleString()} characters).`, 'success');
  } catch (error) { toast(error.message, 'error'); }
}

async function clearProfile() {
  if (!state.profileTarget || !confirm('Clear this saved profile TXT?')) return;
  try {
    const { classKey, resolutionKey } = state.profileTarget;
    await api(`/api/profiles/${classKey}/${resolutionKey}`, { method: 'DELETE' });
    state.bootstrap.profileStatus[classKey][resolutionKey] = { exists: false, length: 0 };
    els.profileText.value = ''; els.profileDialogMeta.textContent = 'No TXT value saved yet'; els.clearProfileBtn.disabled = true;
    renderInspector();
    toast('Profile cleared.', 'success');
  } catch (error) { toast(error.message, 'error'); }
}

els.entitySearch.addEventListener('input', (event) => { state.search = event.target.value; renderEntityList(); });
els.postTitle.addEventListener('input', (event) => { if (!state.entity) return; state.entity.title = event.target.value; markDirty(); renderEntityList(); });
els.postAccent.addEventListener('input', (event) => { if (!state.entity) return; state.entity.builder.accentColor = Number.parseInt(event.target.value.slice(1), 16); markDirty(); });
els.saveBtn.addEventListener('click', () => saveCurrent());
els.publishBtn.addEventListener('click', publishCurrent);
els.cloneBtn.addEventListener('click', cloneCurrent);
els.exportBtn.addEventListener('click', exportCurrent);
els.deleteBtn.addEventListener('click', deleteCurrent);
els.refreshBtn.addEventListener('click', () => refreshBootstrap());
els.newDraftBtn.addEventListener('click', openNewDraftDialog);
els.newForum.addEventListener('change', updateTagSelect);
els.newDraftForm.addEventListener('submit', createDraft);
els.profileForm.addEventListener('submit', saveProfile);
els.clearProfileBtn.addEventListener('click', clearProfile);

$$('[data-action="new-draft"]').forEach((button) => button.addEventListener('click', openNewDraftDialog));
$$('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog)?.close()));
$$('[data-add]').forEach((button) => button.addEventListener('click', () => addBlock(button.dataset.add)));

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (state.dirty) saveCurrent();
  }
});

window.addEventListener('beforeunload', (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = '';
});

try {
  await refreshBootstrap({ keepSelection: false });
} catch (error) {
  toast(error.message, 'error');
}
