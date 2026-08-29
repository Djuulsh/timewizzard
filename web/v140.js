// Timewizzard v1.4.0 — plain root posts, true nested containers, smart YouTube
// blocks and a structured Add Block / template experience.

TYPE_INFO.container = ['🧱', 'Container'];
TYPE_INFO.youtube = ['▶️', 'YouTube'];
TYPE_INFO.profile_open_list = ['📋', 'MerfinUI Profile List'];

const v140Ui = {
  collapsed: new Set(),
  draggedId: null
};

function v140Roots() { return state.entity?.builder?.blocks || []; }
function v140Find(blockId) {
  const roots = v140Roots();
  for (let index = 0; index < roots.length; index += 1) {
    const block = roots[index];
    if (block.id === blockId) return { block, parent: null, list: roots, index };
    if (block.type === 'container') {
      const childIndex = (block.children || []).findIndex((child) => child.id === blockId);
      if (childIndex >= 0) return { block: block.children[childIndex], parent: block, list: block.children, index: childIndex };
    }
  }
  return null;
}
function v140TotalBlocks() {
  return v140Roots().reduce((sum, block) => sum + 1 + (block.type === 'container' ? (block.children?.length || 0) : 0), 0);
}
function v140ParentFor(blockId) { return v140Find(blockId)?.parent || null; }
function v140TargetContainer() {
  const found = v140Find(state.selectedBlockId);
  if (!found) return null;
  return found.block.type === 'container' ? found.block : found.parent;
}
function v140TargetList() {
  const container = v140TargetContainer();
  return container ? container.children : v140Roots();
}

selectedBlock = function v140SelectedBlock() {
  return v140Find(state.selectedBlockId)?.block || null;
};

function v140DeleteActionRefs(block) {
  if (!block || block.type === 'container') {
    for (const child of block?.children || []) v140DeleteActionRefs(child);
    return;
  }
  for (const actionId of referencedActionIds(block)) removeActionTree(actionId);
}

function v140CloneContent(source, seen = new Map()) {
  const copy = structuredClone(source);
  copy.id = shortId(3);
  if (copy.actionId) copy.actionId = cloneActionTree(copy.actionId, seen);
  if (Array.isArray(copy.options)) {
    copy.options = copy.options.map((option) => ({
      ...option,
      actionId: option.actionId ? cloneActionTree(option.actionId, seen) : option.actionId
    }));
  }
  return copy;
}

function v140CloneBlock(source) {
  const seen = new Map();
  if (source.type !== 'container') return v140CloneContent(source, seen);
  return {
    ...structuredClone(source),
    id: shortId(3),
    label: `${source.label || 'Container'} copy`.slice(0, 80),
    children: (source.children || []).map((child) => v140CloneContent(child, seen))
  };
}

duplicateBlock = function v140DuplicateBlock(blockId) {
  if (!state.entity) return;
  const found = v140Find(blockId);
  if (!found) return;
  const addedCount = found.block.type === 'container' ? 1 + (found.block.children?.length || 0) : 1;
  if (v140TotalBlocks() + addedCount > 75) return toast('The builder can contain at most 75 blocks including container contents.', 'error');
  if (found.list.length >= 25) return toast(found.parent ? 'This container already has 25 blocks.' : 'The post already has 25 root blocks/containers.', 'error');
  pushUndo();
  const copy = v140CloneBlock(found.block);
  found.list.splice(found.index + 1, 0, copy);
  state.selectedBlockId = copy.id;
  markDirty();
  renderBlockList();
  renderInspector();
};

deleteBlock = function v140DeleteBlock(blockId) {
  const found = v140Find(blockId);
  if (!found) return;
  const name = TYPE_INFO[found.block.type]?.[1] || found.block.type;
  if (found.block.type === 'container') {
    if (!confirm(`Remove container “${found.block.label || 'Container'}” and keep its ${found.block.children?.length || 0} blocks in the post root?\n\nUse “Delete container + contents” in the Inspector if the contained blocks should also be removed.`)) return;
    pushUndo();
    const [removed] = found.list.splice(found.index, 1);
    found.list.splice(found.index, 0, ...(removed.children || []));
    state.selectedBlockId = removed.children?.[0]?.id || found.list[found.index]?.id || null;
  } else {
    if (!confirm(`Delete ${name}?`)) return;
    pushUndo();
    const [removed] = found.list.splice(found.index, 1);
    v140DeleteActionRefs(removed);
    state.selectedBlockId = found.list[Math.min(found.index, found.list.length - 1)]?.id || found.parent?.id || null;
  }
  markDirty();
  renderBlockList();
  renderInspector();
};

function v140MakeContentBlock(type) {
  const builder = state.entity.builder;
  if (type === 'text') return { id: shortId(3), type, content: '# Heading\nDescription…' };
  if (type === 'image') return { id: shortId(3), type, url: 'https://example.com/image.png', description: '', spoiler: false };
  if (type === 'gallery') return { id: shortId(3), type, items: [{ url: 'https://example.com/image1.png', description: '', spoiler: false }, { url: 'https://example.com/image2.png', description: '', spoiler: false }] };
  if (type === 'thumbnail') return { id: shortId(3), type, text: '## Thumbnail section\nDescription…', url: 'https://example.com/image.png', description: '', spoiler: false };
  if (type === 'separator') return { id: shortId(3), type, divider: true, spacing: 2 };
  if (type === 'youtube') return { id: shortId(3), type, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'YouTube video', description: 'Add a short description or call to action.', showThumbnail: true, showButton: true, buttonLabel: 'Watch on YouTube' };
  if (type === 'open') {
    const actionId = shortId(4);
    builder.actions[actionId] = { id: actionId, type: 'ephemeral_text', title: 'Information', content: 'Ephemeral response…', children: [], presentation: 'buttons' };
    return { id: shortId(3), type, text: '🔗 • **Information**', label: 'Open', actionId };
  }
  if (type === 'link') return { id: shortId(3), type, text: '🔗 • **Website**', label: 'Open', url: 'https://example.com' };
  if (type === 'select') {
    const actionId = shortId(4);
    builder.actions[actionId] = { id: actionId, type: 'ephemeral_text', title: 'Option 1', content: 'Ephemeral response…', children: [], presentation: 'buttons' };
    return { id: shortId(3), type, placeholder: 'Choose an option…', options: [{ label: 'Option 1', actionId }] };
  }
  if (type === 'profile_select') return { id: shortId(3), type, placeholder: 'Choose class and resolution…' };
  if (type === 'profile_open_list') return { id: shortId(3), type };
  return null;
}

addBlock = function v140AddBlock(type) {
  if (!state.entity) return;
  if (v140TotalBlocks() >= 75) return toast('The builder can contain at most 75 blocks including container contents.', 'error');
  pushUndo();

  if (type === 'container') {
    if (v140Roots().length >= 25) return toast('The post can contain at most 25 root blocks/containers.', 'error');
    const block = { id: shortId(3), type: 'container', label: `Container ${v140Roots().filter((item) => item.type === 'container').length + 1}`, accentColor: 0x5865F2, collapsed: false, children: [] };
    v140Roots().push(block);
    state.selectedBlockId = block.id;
  } else {
    const block = v140MakeContentBlock(type);
    if (!block) return;
    const list = v140TargetList();
    if (list.length >= 25) return toast(v140TargetContainer() ? 'This container can contain at most 25 direct blocks.' : 'The post can contain at most 25 root blocks/containers.', 'error');
    list.push(block);
    state.selectedBlockId = block.id;
  }
  markDirty();
  renderBlockList();
  renderInspector();
};

const v140OldBlockSummary = blockSummary;
blockSummary = function v140BlockSummary(block) {
  if (block?.type === 'container') return `${block.children?.length || 0} blocks · ${colorHex(block.accentColor)}`;
  if (block?.type === 'youtube') return `${block.title || 'YouTube video'} · ${block.url || 'No URL'}`;
  if (block?.type === 'profile_open_list') return 'Compact profile matrix · no buttons';
  return v140OldBlockSummary(block);
};

function v140MoveBlock(sourceId, targetId, { after = false, intoContainer = false } = {}) {
  if (!sourceId || sourceId === targetId) return;
  const source = v140Find(sourceId);
  const target = v140Find(targetId);
  if (!source || !target) return;
  if (source.block.type === 'container' && (intoContainer || target.parent)) {
    const parentRoot = target.parent || target.block;
    const rootTarget = v140Find(parentRoot.id);
    if (!rootTarget || rootTarget.parent) return;
    pushUndo();
    source.list.splice(source.index, 1);
    let index = v140Roots().findIndex((item) => item.id === rootTarget.block.id);
    if (after) index += 1;
    v140Roots().splice(index, 0, source.block);
  } else {
    let destinationList;
    let destinationIndex;
    if (intoContainer && target.block.type === 'container') {
      destinationList = target.block.children;
      destinationIndex = destinationList.length;
    } else {
      destinationList = target.list;
      destinationIndex = target.index + (after ? 1 : 0);
    }
    if (destinationList.length >= 25 && destinationList !== source.list) return toast('The target already has 25 blocks.', 'error');
    pushUndo();
    source.list.splice(source.index, 1);
    if (destinationList === source.list && source.index < destinationIndex) destinationIndex -= 1;
    destinationList.splice(Math.max(0, destinationIndex), 0, source.block);
  }
  state.selectedBlockId = sourceId;
  markDirty();
  renderBlockList();
  renderInspector();
}

function v140BindDrag(card, block, parent) {
  card.draggable = true;
  card.addEventListener('dragstart', (event) => {
    v140Ui.draggedId = block.id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', block.id);
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => { v140Ui.draggedId = null; card.classList.remove('dragging'); $$('.v140-drop-target').forEach((node) => node.classList.remove('v140-drop-target')); });
  card.addEventListener('dragover', (event) => { event.preventDefault(); card.classList.add('v140-drop-target'); });
  card.addEventListener('dragleave', () => card.classList.remove('v140-drop-target'));
  card.addEventListener('drop', (event) => {
    event.preventDefault(); event.stopPropagation(); card.classList.remove('v140-drop-target');
    const sourceId = event.dataTransfer.getData('text/plain') || v140Ui.draggedId;
    if (!sourceId || sourceId === block.id) return;
    const rect = card.getBoundingClientRect();
    if (block.type === 'container' && event.clientX > rect.left + 36 && sourceId !== block.id && v140Find(sourceId)?.block.type !== 'container') {
      v140MoveBlock(sourceId, block.id, { intoContainer: true });
    } else {
      v140MoveBlock(sourceId, block.id, { after: event.clientY > rect.top + rect.height / 2 });
    }
  });
}

function v140ContentCard(block, parent, index) {
  const info = TYPE_INFO[block.type] || ['▫️', block.type];
  const card = document.createElement('div');
  card.className = `block-card v140-node v140-content${state.selectedBlockId === block.id ? ' selected' : ''}${parent ? ' v140-child' : ''}`;
  card.dataset.blockId = block.id;
  card.innerHTML = `<div class="drag-handle" title="Drag to reorder or move">☰</div><div class="block-main"><strong>${parent ? '↳ ' : ''}${info[0]} ${escapeHtml(info[1])}</strong><small>${escapeHtml(blockSummary(block))}</small></div><div class="block-actions"><button class="mini-btn" data-mini="duplicate" title="Duplicate">⧉</button><button class="mini-btn" data-mini="delete" title="Delete">×</button></div>`;
  $('.block-main', card).addEventListener('click', () => { state.selectedBlockId = block.id; renderBlockList(); renderInspector(); });
  $('[data-mini="duplicate"]', card).addEventListener('click', (event) => { event.stopPropagation(); duplicateBlock(block.id); });
  $('[data-mini="delete"]', card).addEventListener('click', (event) => { event.stopPropagation(); deleteBlock(block.id); });
  v140BindDrag(card, block, parent);
  return card;
}

function v140ContainerCard(block, index) {
  const card = document.createElement('div');
  const collapsed = v140Ui.collapsed.has(block.id);
  card.className = `v140-container-card v140-node${state.selectedBlockId === block.id ? ' selected' : ''}`;
  card.dataset.blockId = block.id;
  card.innerHTML = `<div class="v140-container-head" style="--container-accent:${colorHex(block.accentColor)}"><div class="drag-handle">☰</div><button type="button" class="v140-collapse" title="${collapsed ? 'Expand' : 'Collapse'}">${collapsed ? '▸' : '▾'}</button><div class="v140-container-main"><strong>🧱 ${escapeHtml(block.label || `Container ${index + 1}`)}</strong><small>${block.children?.length || 0} blocks · ${colorHex(block.accentColor).toUpperCase()}</small></div><div class="block-actions"><button class="mini-btn" data-container-add title="Add block inside">＋</button><button class="mini-btn" data-mini="duplicate" title="Duplicate container">⧉</button><button class="mini-btn" data-mini="delete" title="Remove container, keep blocks">×</button></div></div><div class="v140-container-children${collapsed ? ' hidden' : ''}"></div>`;
  $('.v140-container-main', card).addEventListener('click', () => { state.selectedBlockId = block.id; renderBlockList(); renderInspector(); });
  $('.v140-collapse', card).addEventListener('click', (event) => { event.stopPropagation(); collapsed ? v140Ui.collapsed.delete(block.id) : v140Ui.collapsed.add(block.id); renderBlockList(); });
  $('[data-container-add]', card).addEventListener('click', (event) => { event.stopPropagation(); state.selectedBlockId = block.id; renderBlockList(); renderInspector(); document.querySelector('.add-block')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  $('[data-mini="duplicate"]', card).addEventListener('click', (event) => { event.stopPropagation(); duplicateBlock(block.id); });
  $('[data-mini="delete"]', card).addEventListener('click', (event) => { event.stopPropagation(); deleteBlock(block.id); });
  v140BindDrag($('.v140-container-head', card), block, null);
  const children = $('.v140-container-children', card);
  (block.children || []).forEach((child, childIndex) => children.append(v140ContentCard(child, block, childIndex)));
  if (!(block.children || []).length) children.innerHTML = '<div class="v140-empty-container">Drop a block here, or click + to add content inside.</div>';
  children.addEventListener('dragover', (event) => event.preventDefault());
  children.addEventListener('drop', (event) => {
    if (event.target.closest('.v140-content')) return;
    event.preventDefault(); event.stopPropagation();
    const sourceId = event.dataTransfer.getData('text/plain') || v140Ui.draggedId;
    if (sourceId && v140Find(sourceId)?.block.type !== 'container') v140MoveBlock(sourceId, block.id, { intoContainer: true });
  });
  return card;
}

renderBlockList = function v140RenderBlockList() {
  if (!state.entity) return;
  els.blockList.innerHTML = '';
  v140Roots().forEach((block, index) => {
    els.blockList.append(block.type === 'container' ? v140ContainerCard(block, index) : v140ContentCard(block, null, index));
  });
  els.blockList.addEventListener('dragover', (event) => event.preventDefault());
  v140BuildAddMenu();
};

function v140BuildAddMenu() {
  const add = document.querySelector('.add-block');
  if (!add) return;
  const container = v140TargetContainer();
  add.innerHTML = `<div class="v140-add-heading"><div><h3>Add block</h3><small>Adding to: <b>${container ? `🧱 ${escapeHtml(container.label || 'Container')}` : 'POST root'}</b></small></div>${container ? '<button type="button" class="mini-btn" id="v140AddToRoot">Use POST root</button>' : ''}</div>
  <div class="v140-add-section"><strong>CONTENT</strong><div class="add-grid"><button data-v140-add="text">📝 Text</button><button data-v140-add="image">🖼️ Image</button><button data-v140-add="thumbnail">🔲 Thumbnail</button><button data-v140-add="gallery">🖼️ Gallery</button><button data-v140-add="youtube">▶️ YouTube</button></div></div>
  <div class="v140-add-section"><strong>LAYOUT</strong><div class="add-grid"><button data-v140-add="separator">➖ Separator</button><button data-v140-add="container" class="v140-container-add">🧱 Container</button></div></div>
  <div class="v140-add-section"><strong>INTERACTIONS</strong><div class="add-grid"><button data-v140-add="link">🔗 Link</button><button data-v140-add="open">🔘 Open / Ephemeral</button><button data-v140-add="select">🔽 Select</button></div></div>
  <details class="v140-special"><summary>SPECIAL</summary><div class="add-grid"><button data-v140-add="profile_select">🎮 MerfinUI Select</button><button data-v140-add="profile_open_list">📋 MerfinUI Profile List</button></div></details>`;
  $$('[data-v140-add]', add).forEach((button) => button.addEventListener('click', () => addBlock(button.dataset.v140Add)));
  $('#v140AddToRoot', add)?.addEventListener('click', () => { state.selectedBlockId = null; renderBlockList(); renderInspector(); });
}

function v140YoutubeId(raw) {
  const value = String(raw || '').trim();
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
    if (host.endsWith('youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      const parts = url.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'live'].includes(parts[0])) return parts[1] || null;
    }
  } catch {}
  return /^[A-Za-z0-9_-]{6,20}$/.test(value) ? value : null;
}
function v140YoutubeThumb(block) { const id = v140YoutubeId(block?.url); return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : ''; }

const v140OldRenderInspector = renderInspector;
renderInspector = function v140RenderInspector() {
  const found = v140Find(state.selectedBlockId);
  const block = found?.block;
  if (!block) {
    els.inspector.className = 'inspector-placeholder';
    els.inspector.innerHTML = state.entity?.builder?.blocks?.length ? '<b>POST root</b><br><span>Select a block to edit it, or add plain content directly to the post.</span>' : '<b>Empty POST</b><br><span>Add plain content or start with a Container if you want a colored embed-style post.</span>';
    return;
  }
  if (block.type === 'container') {
    els.inspector.className = 'inspector-form';
    const fallback = '#5865F2';
    els.inspector.innerHTML = `<div class="inspector-card v140-container-inspector"><div class="v140-inspector-title"><h3>🧱 Container</h3><span>${block.children?.length || 0} blocks</span></div><p>Groups content inside one colored Discord Components V2 container. The name is only used inside Timewizzard.</p><label>Name<input id="v140ContainerName" maxlength="80" value="${escapeAttr(block.label || 'Container')}"></label><label>Color<div class="v140-color-control"><input id="v140ContainerColor" type="color" value="${colorHex(block.accentColor)}"><input id="v140ContainerHex" maxlength="7" value="${colorHex(block.accentColor).toUpperCase()}"><button type="button" class="btn ghost" id="v140ResetColor">Reset</button></div></label><div class="v140-container-actions"><button type="button" class="btn ghost" id="v140DuplicateContainer">⧉ Duplicate container</button><button type="button" class="btn ghost" id="v140RemoveKeep">Remove container · keep blocks</button><button type="button" class="btn danger" id="v140DeleteAll">Delete container + contents</button></div></div>`;
    bindInput($('#v140ContainerName', els.inspector), (event) => { block.label = event.target.value; markDirty(); renderBlockList(); });
    const setColor = (hex) => {
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
      block.accentColor = Number.parseInt(hex.slice(1), 16);
      $('#v140ContainerColor', els.inspector).value = hex;
      $('#v140ContainerHex', els.inspector).value = hex.toUpperCase();
      markDirty(); renderBlockList();
      return true;
    };
    $('#v140ContainerColor', els.inspector).addEventListener('input', (event) => { beginInputEdit(); setColor(event.target.value); });
    $('#v140ContainerColor', els.inspector).addEventListener('change', endInputEdit);
    bindInput($('#v140ContainerHex', els.inspector), (event) => { if (/^#[0-9a-fA-F]{6}$/.test(event.target.value)) setColor(event.target.value); });
    $('#v140ResetColor', els.inspector).addEventListener('click', () => { pushUndo(); setColor(fallback); endInputEdit(); });
    $('#v140DuplicateContainer', els.inspector).addEventListener('click', () => duplicateBlock(block.id));
    $('#v140RemoveKeep', els.inspector).addEventListener('click', () => deleteBlock(block.id));
    $('#v140DeleteAll', els.inspector).addEventListener('click', () => {
      if (!confirm(`Delete container “${block.label || 'Container'}” and all ${block.children?.length || 0} contained blocks?`)) return;
      pushUndo();
      for (const child of block.children || []) v140DeleteActionRefs(child);
      const index = v140Roots().findIndex((item) => item.id === block.id);
      if (index >= 0) v140Roots().splice(index, 1);
      state.selectedBlockId = v140Roots()[Math.min(index, v140Roots().length - 1)]?.id || null;
      markDirty(); renderBlockList(); renderInspector();
    });
    return;
  }

  if (block.type === 'youtube') {
    els.inspector.className = 'inspector-form';
    const thumb = v140YoutubeThumb(block);
    els.inspector.innerHTML = `<div class="inspector-card"><h3>▶️ YouTube</h3><p class="v140-field-note">Paste a YouTube, youtu.be, Shorts or Live URL. Timewizzard derives the video ID and thumbnail automatically.</p><label>YouTube URL<input id="v140YoutubeUrl" value="${escapeAttr(block.url || '')}" placeholder="https://youtu.be/..."></label><div id="v140YoutubeStatus" class="v140-youtube-status">${thumb ? `✅ Video detected · <code>${escapeHtml(v140YoutubeId(block.url))}</code>` : '⚠️ Enter a valid YouTube URL'}</div><label>Title<input id="v140YoutubeTitle" maxlength="200" value="${escapeAttr(block.title || '')}"></label>${toolbarHtml('v140YoutubeDesc')}<label>Description<textarea id="v140YoutubeDesc" rows="5">${escapeHtml(block.description || '')}</textarea></label><div class="v140-check-row"><label><input id="v140YoutubeThumb" type="checkbox" ${block.showThumbnail !== false ? 'checked' : ''}> Show thumbnail</label><label><input id="v140YoutubeButton" type="checkbox" ${block.showButton !== false ? 'checked' : ''}> Show button</label></div><label>Button label<input id="v140YoutubeLabel" maxlength="80" value="${escapeAttr(block.buttonLabel || 'Watch on YouTube')}"></label>${thumb ? `<div class="v140-youtube-preview"><img src="${escapeAttr(thumb)}" alt=""><span>Automatic thumbnail preview</span></div>` : ''}</div>`;
    const updateYoutube = () => { markDirty(); renderPreview(); };
    bindInput($('#v140YoutubeUrl', els.inspector), (event) => { block.url = event.target.value; updateYoutube(); });
    bindInput($('#v140YoutubeTitle', els.inspector), (event) => { block.title = event.target.value; updateYoutube(); });
    bindInput($('#v140YoutubeDesc', els.inspector), (event) => { block.description = event.target.value; updateYoutube(); });
    bindInput($('#v140YoutubeLabel', els.inspector), (event) => { block.buttonLabel = event.target.value; updateYoutube(); });
    $('#v140YoutubeThumb', els.inspector).addEventListener('change', (event) => { pushUndo(); block.showThumbnail = event.target.checked; updateYoutube(); renderInspector(); });
    $('#v140YoutubeButton', els.inspector).addEventListener('change', (event) => { pushUndo(); block.showButton = event.target.checked; updateYoutube(); });
    bindToolbar();
    return;
  }

  v140OldRenderInspector();
  const breadcrumb = document.createElement('div');
  breadcrumb.className = 'v140-breadcrumb';
  breadcrumb.innerHTML = found.parent ? `Inside <b>🧱 ${escapeHtml(found.parent.label || 'Container')}</b><button type="button" class="mini-btn">Move to POST root</button>` : '<span>Location: <b>POST root</b></span>';
  els.inspector.prepend(breadcrumb);
  if (found.parent) breadcrumb.querySelector('button').addEventListener('click', () => {
    if (v140Roots().length >= 25) return toast('The POST root already has 25 blocks/containers.', 'error');
    pushUndo();
    found.list.splice(found.index, 1);
    const containerIndex = v140Roots().findIndex((item) => item.id === found.parent.id);
    v140Roots().splice(containerIndex + 1, 0, block);
    markDirty(); renderBlockList(); renderInspector();
  });
  if (block.type === 'profile_open_list') {
    const paragraph = els.inspector.querySelector('.inspector-card > p');
    if (paragraph) paragraph.textContent = 'Compact profile overview without Open buttons. It uses one Text Display to conserve the Discord component budget.';
  }
};

const v140OldPreviewBlock = renderPreviewBlock;
renderPreviewBlock = function v140RenderPreviewBlock(block) {
  if (block.type === 'youtube') {
    const thumb = v140YoutubeThumb(block);
    const videoId = v140YoutubeId(block.url);
    if (!videoId) return '<div class="preview-block">⚠️ Add a valid YouTube URL</div>';
    return `<div class="v140-youtube-block">${block.showThumbnail !== false ? `<img src="${escapeAttr(thumb)}" alt="${escapeAttr(block.title || 'YouTube video')}">` : ''}<div class="preview-block preview-row"><div>${renderMarkdown(`## ▶️ ${block.title || 'YouTube video'}${block.description ? `\n${block.description}` : ''}`)}</div>${block.showButton !== false ? `<button class="mock-btn">${escapeHtml(block.buttonLabel || 'Watch on YouTube')}</button>` : ''}</div></div>`;
  }
  if (block.type === 'profile_open_list') {
    const resolutions = (state.bootstrap?.resolutions || []).map((item) => `**${item.name}**`).join(' · ');
    const content = ['### MerfinUI profiles', ...(state.bootstrap?.classes || []).map((wowClass) => `${wowClass.emojiName && wowClass.emojiId ? `<:${wowClass.emojiName}:${wowClass.emojiId}> ` : ''}**${wowClass.name}** — ${resolutions}`)].join('\n');
    return `<div class="preview-block preview-text">${renderMarkdown(content)}</div>`;
  }
  return v140OldPreviewBlock(block);
};

const v140OldUnitList = unitList;
unitList = function v140UnitList(block) {
  if (block?.type === 'youtube') {
    const text = `${block.title || ''}${block.description || ''}`.length;
    return [{ count: block.showThumbnail === false ? (block.showButton === false ? 1 : 3) : (block.showButton === false ? 2 : 4), text }];
  }
  if (block?.type === 'profile_open_list') return [{ count: 1, text: 450 }];
  return v140OldUnitList(block);
};

function v140PackPreviewUnits() {
  const top = [];
  for (const block of v140Roots()) {
    if (block.type !== 'container') {
      top.push(...unitList(block));
      continue;
    }
    let count = 1;
    let text = 0;
    for (const child of block.children || []) {
      for (const unit of unitList(child)) { count += unit.count; text += unit.text; }
    }
    if (count > 40 || text > 4000) {
      let chunkCount = 1; let chunkText = 0;
      for (const child of block.children || []) {
        for (const unit of unitList(child)) {
          if (chunkCount + unit.count > 40 || chunkText + unit.text > 4000) { top.push({ count: chunkCount, text: chunkText }); chunkCount = 1; chunkText = 0; }
          chunkCount += unit.count; chunkText += unit.text;
        }
      }
      if (chunkCount > 1) top.push({ count: chunkCount, text: chunkText });
    } else if ((block.children || []).length) top.push({ count, text });
  }
  return top;
}

liveStats = function v140LiveStats() {
  const units = v140PackPreviewUnits();
  if (!units.length) return { messages: 0, components: 0, text: 0 };
  let messages = 1, currentCount = 0, currentText = 0, components = 0, text = 0;
  for (const unit of units) {
    if (currentCount + unit.count > 40 || currentText + unit.text > 4000) { messages += 1; currentCount = 0; currentText = 0; }
    currentCount += unit.count; currentText += unit.text; components += unit.count; text += unit.text;
  }
  return { messages, components, text };
};

renderPreview = function v140RenderPreview() {
  if (!state.entity) {
    els.previewContent.className = 'discord-container empty-preview';
    els.previewContent.textContent = 'Select a post to preview.';
    els.previewStats.textContent = '—';
    return;
  }
  const stats = liveStats();
  els.previewContent.className = 'discord-container v140-root-post';
  els.previewContent.innerHTML = v140Roots().map((block) => {
    if (block.type !== 'container') return `<div class="v140-root-block">${renderPreviewBlock(block)}</div>`;
    if (!(block.children || []).length) return '';
    return `<div class="v140-preview-container" style="--v140-accent:${colorHex(block.accentColor)}"><div class="v140-preview-label">${escapeHtml(block.label || 'Container')}</div>${block.children.map(renderPreviewBlock).join('')}</div>`;
  }).join('') || '<div class="empty-preview">Add plain content or a Container to start.</div>';
  const containerCount = v140Roots().filter((block) => block.type === 'container').length;
  els.previewStats.textContent = `${v140TotalBlocks()} blocks · ${containerCount} container${containerCount === 1 ? '' : 's'} · ${stats.messages} msg`;
  els.previewStats.className = `pill ${stats.messages > 1 ? 'warn' : 'good'}`;
  const old = $('.preview-warning', els.previewContent.parentElement);
  if (old) old.remove();
  if (stats.messages > 1) {
    const warning = document.createElement('div');
    warning.className = 'preview-warning';
    warning.textContent = `Discord limits will split this layout across approximately ${stats.messages} messages.`;
    els.previewContent.parentElement.append(warning);
  }
};

function v140SetupTemplates() {
  if (!state.bootstrap?.templates?.length || !els.newTemplate) return;
  const oldLabel = els.newTemplate.closest('label');
  if (oldLabel) oldLabel.classList.add('v140-hidden-template-select');
  let host = document.getElementById('v140TemplateChooser');
  if (!host) {
    host = document.createElement('div');
    host.id = 'v140TemplateChooser';
    host.className = 'v140-template-chooser';
    oldLabel?.insertAdjacentElement('beforebegin', host);
  }
  const groups = new Map();
  for (const template of state.bootstrap.templates) {
    const category = template.category || 'Other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(template);
  }
  host.innerHTML = `<div class="v140-template-title"><strong>Choose a starting point</strong><small>Plain templates do not create a container. Styled templates create one explicitly.</small></div>${[...groups.entries()].map(([category, templates]) => `<section><h4>${escapeHtml(category)}</h4><div class="v140-template-grid">${templates.map((template) => `<button type="button" data-v140-template="${escapeAttr(template.value)}" class="${els.newTemplate.value === template.value ? 'active' : ''}"><strong>${escapeHtml(template.name)}</strong><small>${escapeHtml(template.description || '')}</small></button>`).join('')}</div></section>`).join('')}`;
  $$('[data-v140-template]', host).forEach((button) => button.addEventListener('click', () => {
    els.newTemplate.value = button.dataset.v140Template;
    $$('[data-v140-template]', host).forEach((node) => node.classList.toggle('active', node === button));
  }));
}

const v140OriginalRefreshBootstrap = refreshBootstrap;
refreshBootstrap = async function v140RefreshBootstrap(options = {}) {
  const result = await v140OriginalRefreshBootstrap(options);
  v140SetupTemplates();
  return result;
};

function v140PolishGlobalUi() {
  document.querySelector('.accent-control')?.classList.add('v140-hide-global-accent');
  v140BuildAddMenu();
  v140SetupTemplates();
}

if (els.newDraftDialog) {
  new MutationObserver(() => { if (els.newDraftDialog.open) v140SetupTemplates(); }).observe(els.newDraftDialog, { attributes: true, attributeFilter: ['open'] });
}

v140PolishGlobalUi();
document.title = 'Timewizzard Web Builder v1.4.0';
const v140BrandSmall = document.querySelector('.brand small');
if (v140BrandSmall) v140BrandSmall.textContent = 'v1.4.0 · Plain posts + nested containers';

// Timewizzard v1.5.0 — category-first template browser + ten reusable smart blocks.
Object.assign(TYPE_INFO, {
  heading: ['🔠', 'Heading'], callout: ['💡', 'Callout'], checklist: ['☑️', 'Checklist'], steps: ['👣', 'Steps'], facts: ['🏷️', 'Facts / Key values'], button_row: ['🔗', 'Button Row'], event: ['📅', 'Event'], countdown: ['⏳', 'Countdown'], code: ['💻', 'Code Snippet'], progress: ['📊', 'Progress']
});
const V150_SMART_TYPES = new Set(['heading','callout','checklist','steps','facts','button_row','event','countdown','code','progress']);
const V150_CONTAINER_TEMPLATES = new Set(['announcement_styled','welcome_onboarding','rules_guidelines','recruitment','raid_event','meeting_agenda','giveaway','guide','support_troubleshooting','class_guide','patch_update','maintenance','release_launch','warning','stream_live']);
const V150_TEMPLATE_CATEGORIES = ['Recommended','Basic','Community','Events','Guides','Updates','Media','Special','All'];
const v150TemplateUi = { category: 'Recommended', search: '' };
function v150LocalDateTime(epoch){const value=Number(epoch);if(!Number.isFinite(value)||value<=0)return'';const date=new Date(value*1000);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function v150Epoch(value){const date=new Date(value);const epoch=Math.floor(date.getTime()/1000);return Number.isFinite(epoch)?epoch:null}
function v150Lines(value){return String(value??'').split(/\r?\n/).map((line)=>line.trim()).filter(Boolean)}
function v150Pipe(value){const index=String(value).indexOf('|');return index<0?[String(value).trim(),'']:[String(value).slice(0,index).trim(),String(value).slice(index+1).trim()]}
function v150ChecklistSpec(block){return(block.items||[]).map((item)=>`[${item.checked?'x':' '}] ${item.text||''}`).join('\n')}
function v150ParseChecklist(value){return v150Lines(value).map((line)=>{const match=line.match(/^\[(x|X| )\]\s*(.*)$/);return{checked:Boolean(match&&match[1].toLowerCase()==='x'),text:(match?match[2]:line).trim()}})}
function v150StepsSpec(block){return(block.items||[]).map((item)=>`${item.title||''} | ${item.content||''}`).join('\n')}
function v150ParseSteps(value){return v150Lines(value).map((line,index)=>{const[title,content]=v150Pipe(line);return{title:title||`Step ${index+1}`,content}})}
function v150FactsSpec(block){return(block.items||[]).map((item)=>`${item.label||''} | ${item.value||''}`).join('\n')}
function v150ParseFacts(value){return v150Lines(value).map((line)=>{const[label,itemValue]=v150Pipe(line);return{label,value:itemValue}})}
function v150ButtonsSpec(block){return(block.buttons||[]).map((button)=>`${button.label||''} | ${button.url||''}`).join('\n')}
function v150ParseButtons(value){return v150Lines(value).slice(0,5).map((line)=>{const[label,url]=v150Pipe(line);return{label,url}})}
function v150HeadingText(block){const level=[1,2,3].includes(Number(block.level))?Number(block.level):2;return[`${'#'.repeat(level)} ${block.emoji?`${block.emoji} `:''}${block.title||'Heading'}`,block.subtitle||''].filter(Boolean).join('\n')}
function v150CalloutText(block){const icons={info:'ℹ️',success:'✅',warning:'⚠️',danger:'🛑',neutral:'💬'};return[`### ${icons[block.tone]||'ℹ️'} ${block.title||'Notice'}`,block.content||''].filter(Boolean).join('\n')}
function v150ChecklistText(block){return[block.title?`### ${block.title}`:'',...(block.items||[]).map((item)=>`${item.checked?'☑️':'☐'} ${item.text||''}`)].filter(Boolean).join('\n')}
function v150StepsText(block){return[block.title?`## ${block.title}`:'',...(block.items||[]).flatMap((item,index)=>[`### ${index+1}. ${item.title||`Step ${index+1}`}`,item.content||''])].filter(Boolean).join('\n')}
function v150FactsText(block){return[block.title?`### ${block.title}`:'',...(block.items||[]).map((item)=>`**${item.label||''}:** ${item.value||''}`)].filter(Boolean).join('\n')}
function v150EventText(block){const rows=[`## 📅 ${block.title||'Event'}`,block.description||''];if(block.startEpoch)rows.push(`**Starts:** <t:${block.startEpoch}:F> · <t:${block.startEpoch}:R>`);if(block.endEpoch)rows.push(`**Ends:** <t:${block.endEpoch}:F>`);if(block.location)rows.push(`**Where:** ${block.location}`);return rows.filter(Boolean).join('\n')}
function v150CountdownText(block){return[`## ⏳ ${block.title||'Countdown'}`,block.text||'',block.targetEpoch?`**<t:${block.targetEpoch}:R>**`:'',block.targetEpoch?`-# <t:${block.targetEpoch}:F>`:''].filter(Boolean).join('\n')}
function v150CodeText(block){const language=String(block.language||'').replace(/[^A-Za-z0-9_+.-]/g,'').slice(0,30);const code=String(block.code||'').replaceAll('```','``\u200b`');return[block.caption||'',`\`\`\`${language}\n${code}\n\`\`\``].filter(Boolean).join('\n')}
function v150ProgressText(block){const current=Number(block.current||0),total=Number(block.total||1),segments=Math.min(20,Math.max(5,Number(block.segments||10))),ratio=total>0?Math.max(0,Math.min(1,current/total)):0,filled=Math.round(ratio*segments),percent=Math.round(ratio*100),numbers=block.showNumbers===false?`${percent}%`:`${current}/${total} · ${percent}%`;return[`**${block.label||'Progress'}**`,`\`${'█'.repeat(filled)}${'░'.repeat(segments-filled)}\` **${numbers}**`,block.note||''].filter(Boolean).join('\n')}
function v150SmartText(block){if(block.type==='heading')return v150HeadingText(block);if(block.type==='callout')return v150CalloutText(block);if(block.type==='checklist')return v150ChecklistText(block);if(block.type==='steps')return v150StepsText(block);if(block.type==='facts')return v150FactsText(block);if(block.type==='event')return v150EventText(block);if(block.type==='countdown')return v150CountdownText(block);if(block.type==='code')return v150CodeText(block);if(block.type==='progress')return v150ProgressText(block);return''}
const v150PreviousMakeContentBlock=v140MakeContentBlock;
v140MakeContentBlock=function(type){const now=Math.floor(Date.now()/1000);if(type==='heading')return{id:shortId(3),type,level:2,emoji:'✨',title:'Heading',subtitle:'Short supporting text.'};if(type==='callout')return{id:shortId(3),type,tone:'info',title:'Notice',content:'Add the important information here.'};if(type==='checklist')return{id:shortId(3),type,title:'Checklist',items:[{text:'First item',checked:true},{text:'Second item',checked:false}]};if(type==='steps')return{id:shortId(3),type,title:'Steps',items:[{title:'First step',content:'Explain what to do.'},{title:'Next step',content:'Continue with the next action.'}]};if(type==='facts')return{id:shortId(3),type,title:'Quick facts',items:[{label:'Status',value:'Ready'},{label:'Owner',value:'Team'}]};if(type==='button_row')return{id:shortId(3),type,buttons:[{label:'Website',url:'https://example.com'},{label:'Documentation',url:'https://example.com/docs'}]};if(type==='event')return{id:shortId(3),type,title:'Event',description:'Add event information here.',startEpoch:now+3600,endEpoch:now+7200,location:'#channel or location'};if(type==='countdown')return{id:shortId(3),type,title:'Countdown',text:'Time remaining:',targetEpoch:now+86400};if(type==='code')return{id:shortId(3),type,language:'text',caption:'Example',code:'Paste code or configuration here.'};if(type==='progress')return{id:shortId(3),type,label:'Progress',current:3,total:5,segments:10,showNumbers:true,note:'Optional progress note.'};return v150PreviousMakeContentBlock(type)};
const v150PreviousBlockSummary=blockSummary;
blockSummary=function(block){if(block?.type==='heading')return block.title||'Heading';if(block?.type==='callout')return`${block.tone||'info'} · ${block.title||'Notice'}`;if(block?.type==='checklist')return`${block.items?.length||0} checklist items`;if(block?.type==='steps')return`${block.items?.length||0} steps`;if(block?.type==='facts')return`${block.items?.length||0} key/value rows`;if(block?.type==='button_row')return`${block.buttons?.length||0} link buttons`;if(block?.type==='event')return block.title||'Event';if(block?.type==='countdown')return block.title||'Countdown';if(block?.type==='code')return`${block.language||'text'} · ${String(block.code||'').length} chars`;if(block?.type==='progress')return`${block.current||0}/${block.total||0} · ${block.label||'Progress'}`;return v150PreviousBlockSummary(block)};
v140BuildAddMenu=function(){const add=document.querySelector('.add-block');if(!add)return;const container=v140TargetContainer();add.innerHTML=`<div class="v140-add-heading"><div><h3>Add block</h3><small>Adding to: <b>${container?`🧱 ${escapeHtml(container.label||'Container')}`:'POST root'}</b></small></div>${container?'<button type="button" class="mini-btn" id="v140AddToRoot">Use POST root</button>':''}</div><div class="v140-add-section"><strong>CONTENT</strong><div class="add-grid"><button data-v140-add="text">📝 Text</button><button data-v140-add="heading">🔠 Heading</button><button data-v140-add="callout">💡 Callout</button><button data-v140-add="image">🖼️ Image</button><button data-v140-add="thumbnail">🔲 Thumbnail</button><button data-v140-add="gallery">🖼️ Gallery</button><button data-v140-add="youtube">▶️ YouTube</button><button data-v140-add="code">💻 Code Snippet</button></div></div><div class="v140-add-section"><strong>STRUCTURED CONTENT</strong><div class="add-grid"><button data-v140-add="checklist">☑️ Checklist</button><button data-v140-add="steps">👣 Steps</button><button data-v140-add="facts">🏷️ Facts</button><button data-v140-add="progress">📊 Progress</button></div></div><div class="v140-add-section"><strong>TIME & EVENTS</strong><div class="add-grid"><button data-v140-add="event">📅 Event</button><button data-v140-add="countdown">⏳ Countdown</button></div></div><div class="v140-add-section"><strong>LAYOUT</strong><div class="add-grid"><button data-v140-add="separator">➖ Separator</button><button data-v140-add="container" class="v140-container-add">🧱 Container</button></div></div><div class="v140-add-section"><strong>INTERACTIONS</strong><div class="add-grid"><button data-v140-add="link">🔗 Link</button><button data-v140-add="button_row">🔗 Button Row</button><button data-v140-add="open">🔘 Open / Ephemeral</button><button data-v140-add="select">🔽 Select</button></div></div><details class="v140-special"><summary>SPECIAL</summary><div class="add-grid"><button data-v140-add="profile_select">🎮 MerfinUI Select</button><button data-v140-add="profile_open_list">📋 MerfinUI Profile List</button></div></details>`;$$('[data-v140-add]',add).forEach((button)=>button.addEventListener('click',()=>addBlock(button.dataset.v140Add)));$('#v140AddToRoot',add)?.addEventListener('click',()=>{state.selectedBlockId=null;renderBlockList();renderInspector()})};
function v150Breadcrumb(found){const breadcrumb=document.createElement('div');breadcrumb.className='v140-breadcrumb';breadcrumb.innerHTML=found?.parent?`Inside <b>🧱 ${escapeHtml(found.parent.label||'Container')}</b><button type="button" class="mini-btn">Move to POST root</button>`:'<span>Location: <b>POST root</b></span>';if(found?.parent)breadcrumb.querySelector('button').addEventListener('click',()=>{if(v140Roots().length>=25)return toast('The POST root already has 25 blocks/containers.','error');pushUndo();found.list.splice(found.index,1);const containerIndex=v140Roots().findIndex((item)=>item.id===found.parent.id);v140Roots().splice(containerIndex+1,0,found.block);markDirty();renderBlockList();renderInspector()});els.inspector.prepend(breadcrumb)}
const v150PreviousRenderInspector=renderInspector;
renderInspector=function(){const found=v140Find(state.selectedBlockId),block=found?.block;if(!block||!V150_SMART_TYPES.has(block.type))return v150PreviousRenderInspector();els.inspector.className='inspector-form';if(block.type==='heading'){els.inspector.innerHTML=`<div class="inspector-card"><h3>🔠 Heading</h3><div class="v150-inline-fields"><label>Level<select id="v150HeadingLevel"><option value="1" ${block.level===1?'selected':''}>H1</option><option value="2" ${block.level===2?'selected':''}>H2</option><option value="3" ${block.level===3?'selected':''}>H3</option></select></label><label>Emoji / prefix<input id="v150HeadingEmoji" maxlength="24" value="${escapeAttr(block.emoji||'')}" placeholder="✨"></label></div><label>Title<input id="v150HeadingTitle" maxlength="200" value="${escapeAttr(block.title||'')}"></label><label>Subtitle<textarea id="v150HeadingSubtitle" rows="3">${escapeHtml(block.subtitle||'')}</textarea></label></div>`;bind('#v150HeadingLevel','change',(e)=>{pushUndo();block.level=Number(e.target.value);markDirty();renderPreview()});bindInput($('#v150HeadingEmoji',els.inspector),(e)=>{block.emoji=e.target.value;markDirty()});bindInput($('#v150HeadingTitle',els.inspector),(e)=>{block.title=e.target.value;markDirty();renderBlockList()});bindInput($('#v150HeadingSubtitle',els.inspector),(e)=>{block.subtitle=e.target.value;markDirty()})}
if(block.type==='callout'){els.inspector.innerHTML=`<div class="inspector-card"><h3>💡 Callout</h3><label>Tone<select id="v150CalloutTone"><option value="info" ${block.tone==='info'?'selected':''}>ℹ️ Info</option><option value="success" ${block.tone==='success'?'selected':''}>✅ Success</option><option value="warning" ${block.tone==='warning'?'selected':''}>⚠️ Warning</option><option value="danger" ${block.tone==='danger'?'selected':''}>🛑 Danger</option><option value="neutral" ${block.tone==='neutral'?'selected':''}>💬 Neutral</option></select></label><label>Title<input id="v150CalloutTitle" maxlength="200" value="${escapeAttr(block.title||'')}"></label>${toolbarHtml('v150CalloutContent')}<label>Content<textarea id="v150CalloutContent" rows="7">${escapeHtml(block.content||'')}</textarea></label></div>`;bind('#v150CalloutTone','change',(e)=>{pushUndo();block.tone=e.target.value;markDirty();renderPreview()});bindInput($('#v150CalloutTitle',els.inspector),(e)=>{block.title=e.target.value;markDirty();renderBlockList()});bindInput($('#v150CalloutContent',els.inspector),(e)=>{block.content=e.target.value;markDirty()});bindToolbar()}
if(block.type==='checklist'){els.inspector.innerHTML=`<div class="inspector-card"><h3>☑️ Checklist</h3><label>Title<input id="v150ChecklistTitle" maxlength="200" value="${escapeAttr(block.title||'')}"></label><label>Items<textarea id="v150ChecklistItems" rows="9" spellcheck="false">${escapeHtml(v150ChecklistSpec(block))}</textarea></label><p class="v150-help"><code>[x]</code> completed · <code>[ ]</code> not completed · one item per line.</p></div>`;bindInput($('#v150ChecklistTitle',els.inspector),(e)=>{block.title=e.target.value;markDirty()});bindInput($('#v150ChecklistItems',els.inspector),(e)=>{block.items=v150ParseChecklist(e.target.value);markDirty();renderBlockList()})}
if(block.type==='steps'){els.inspector.innerHTML=`<div class="inspector-card"><h3>👣 Steps</h3><label>Title<input id="v150StepsTitle" maxlength="200" value="${escapeAttr(block.title||'')}"></label><label>Steps<textarea id="v150StepsItems" rows="10" spellcheck="false">${escapeHtml(v150StepsSpec(block))}</textarea></label><p class="v150-help">One step per line: <code>Step title | Description</code></p></div>`;bindInput($('#v150StepsTitle',els.inspector),(e)=>{block.title=e.target.value;markDirty()});bindInput($('#v150StepsItems',els.inspector),(e)=>{block.items=v150ParseSteps(e.target.value);markDirty();renderBlockList()})}
if(block.type==='facts'){els.inspector.innerHTML=`<div class="inspector-card"><h3>🏷️ Facts / Key values</h3><label>Title<input id="v150FactsTitle" maxlength="200" value="${escapeAttr(block.title||'')}"></label><label>Rows<textarea id="v150FactsItems" rows="9" spellcheck="false">${escapeHtml(v150FactsSpec(block))}</textarea></label><p class="v150-help">One row per line: <code>Label | Value</code></p></div>`;bindInput($('#v150FactsTitle',els.inspector),(e)=>{block.title=e.target.value;markDirty()});bindInput($('#v150FactsItems',els.inspector),(e)=>{block.items=v150ParseFacts(e.target.value);markDirty();renderBlockList()})}
if(block.type==='button_row'){els.inspector.innerHTML=`<div class="inspector-card"><h3>🔗 Button Row</h3><p class="v140-field-note">Places up to five URL buttons on one Discord Action Row instead of using one Section per link.</p><label>Buttons<textarea id="v150ButtonRows" rows="8" spellcheck="false">${escapeHtml(v150ButtonsSpec(block))}</textarea></label><p class="v150-help">One button per line: <code>Label | https://...</code> · maximum 5.</p></div>`;bindInput($('#v150ButtonRows',els.inspector),(e)=>{block.buttons=v150ParseButtons(e.target.value);markDirty();renderBlockList()})}
if(block.type==='event'){els.inspector.innerHTML=`<div class="inspector-card"><h3>📅 Event</h3><label>Title<input id="v150EventTitle" maxlength="200" value="${escapeAttr(block.title||'')}"></label>${toolbarHtml('v150EventDescription')}<label>Description<textarea id="v150EventDescription" rows="5">${escapeHtml(block.description||'')}</textarea></label><div class="v150-inline-fields"><label>Starts<input id="v150EventStart" type="datetime-local" value="${v150LocalDateTime(block.startEpoch)}"></label><label>Ends · optional<input id="v150EventEnd" type="datetime-local" value="${v150LocalDateTime(block.endEpoch)}"></label></div>${toolbarHtml('v150EventLocation')}<label>Where / channel<textarea id="v150EventLocation" rows="2">${escapeHtml(block.location||'')}</textarea></label><p class="v150-help">Discord timestamps automatically display in each member’s own timezone.</p></div>`;bindInput($('#v150EventTitle',els.inspector),(e)=>{block.title=e.target.value;markDirty();renderBlockList()});bindInput($('#v150EventDescription',els.inspector),(e)=>{block.description=e.target.value;markDirty()});bind('#v150EventStart','change',(e)=>{pushUndo();block.startEpoch=v150Epoch(e.target.value);markDirty();renderPreview()});bind('#v150EventEnd','change',(e)=>{pushUndo();block.endEpoch=e.target.value?v150Epoch(e.target.value):null;markDirty();renderPreview()});bindInput($('#v150EventLocation',els.inspector),(e)=>{block.location=e.target.value;markDirty()});bindToolbar()}
if(block.type==='countdown'){els.inspector.innerHTML=`<div class="inspector-card"><h3>⏳ Countdown</h3><label>Title<input id="v150CountdownTitle" maxlength="200" value="${escapeAttr(block.title||'')}"></label>${toolbarHtml('v150CountdownText')}<label>Supporting text<textarea id="v150CountdownText" rows="4">${escapeHtml(block.text||'')}</textarea></label><label>Target date & time<input id="v150CountdownTarget" type="datetime-local" value="${v150LocalDateTime(block.targetEpoch)}"></label><div class="v150-live-sample">Discord will show: ${block.targetEpoch?`<b>${escapeHtml(renderDiscordTimestamp(block.targetEpoch,'R'))}</b>`:'choose a target'}</div></div>`;bindInput($('#v150CountdownTitle',els.inspector),(e)=>{block.title=e.target.value;markDirty();renderBlockList()});bindInput($('#v150CountdownText',els.inspector),(e)=>{block.text=e.target.value;markDirty()});bind('#v150CountdownTarget','change',(e)=>{pushUndo();block.targetEpoch=v150Epoch(e.target.value);markDirty();renderInspector();renderPreview()});bindToolbar()}
if(block.type==='code'){els.inspector.innerHTML=`<div class="inspector-card"><h3>💻 Code Snippet</h3><div class="v150-inline-fields"><label>Language<input id="v150CodeLanguage" maxlength="30" value="${escapeAttr(block.language||'')}" placeholder="lua"></label><label>Caption<input id="v150CodeCaption" maxlength="300" value="${escapeAttr(block.caption||'')}"></label></div><label>Code<textarea id="v150CodeValue" rows="14" spellcheck="false">${escapeHtml(block.code||'')}</textarea></label></div>`;bindInput($('#v150CodeLanguage',els.inspector),(e)=>{block.language=e.target.value;markDirty()});bindInput($('#v150CodeCaption',els.inspector),(e)=>{block.caption=e.target.value;markDirty()});bindInput($('#v150CodeValue',els.inspector),(e)=>{block.code=e.target.value;markDirty();renderBlockList()})}
if(block.type==='progress'){els.inspector.innerHTML=`<div class="inspector-card"><h3>📊 Progress</h3><label>Label<input id="v150ProgressLabel" maxlength="200" value="${escapeAttr(block.label||'')}"></label><div class="v150-triple-fields"><label>Current<input id="v150ProgressCurrent" type="number" min="0" step="1" value="${escapeAttr(block.current??0)}"></label><label>Total<input id="v150ProgressTotal" type="number" min="1" step="1" value="${escapeAttr(block.total??1)}"></label><label>Segments<input id="v150ProgressSegments" type="number" min="5" max="20" step="1" value="${escapeAttr(block.segments??10)}"></label></div><label class="compact-check"><input id="v150ProgressNumbers" type="checkbox" ${block.showNumbers!==false?'checked':''}> Show current / total</label><label>Note<textarea id="v150ProgressNote" rows="3">${escapeHtml(block.note||'')}</textarea></label><div class="v150-live-sample">${renderMarkdown(v150ProgressText(block))}</div></div>`;const update=()=>{markDirty();renderPreview()};bindInput($('#v150ProgressLabel',els.inspector),(e)=>{block.label=e.target.value;update();renderBlockList()});bindInput($('#v150ProgressCurrent',els.inspector),(e)=>{block.current=Number(e.target.value);update()});bindInput($('#v150ProgressTotal',els.inspector),(e)=>{block.total=Number(e.target.value);update()});bindInput($('#v150ProgressSegments',els.inspector),(e)=>{block.segments=Number(e.target.value);update()});bind('#v150ProgressNumbers','change',(e)=>{pushUndo();block.showNumbers=e.target.checked;update();renderInspector()});bindInput($('#v150ProgressNote',els.inspector),(e)=>{block.note=e.target.value;update()})}
v150Breadcrumb(found)};
const v150PreviousPreviewBlock=renderPreviewBlock;
renderPreviewBlock=function(block){if(!V150_SMART_TYPES.has(block?.type))return v150PreviousPreviewBlock(block);if(block.type==='button_row')return`<div class="v150-button-row">${(block.buttons||[]).map((button)=>`<button class="mock-btn" type="button" disabled>${escapeHtml(button.label||'Link')}</button>`).join('')}</div>`;const content=v150SmartText(block);if(block.type==='callout')return`<div class="v150-callout v150-callout-${escapeAttr(block.tone||'info')}">${renderMarkdown(content)}</div>`;return`<div class="preview-block preview-text v150-smart-preview v150-${escapeAttr(block.type)}">${renderMarkdown(content)}</div>`};
const v150PreviousUnitList=unitList;
unitList=function(block){if(!V150_SMART_TYPES.has(block?.type))return v150PreviousUnitList(block);if(block.type==='button_row')return[{count:1+(block.buttons?.length||0),text:0}];return[{count:1,text:v150SmartText(block).length}]};
v140SetupTemplates=function(){if(!state.bootstrap?.templates?.length||!els.newTemplate)return;const oldLabel=els.newTemplate.closest('label');if(oldLabel)oldLabel.classList.add('v140-hidden-template-select');let host=document.getElementById('v140TemplateChooser');if(!host){host=document.createElement('div');host.id='v140TemplateChooser';host.className='v140-template-chooser v150-template-browser';oldLabel?.insertAdjacentElement('beforebegin',host)}host.classList.add('v150-template-browser');const all=state.bootstrap.templates,search=v150TemplateUi.search.trim().toLowerCase();const shown=all.filter((template)=>{const categoryMatch=v150TemplateUi.category==='All'||(v150TemplateUi.category==='Recommended'?template.featured:template.category===v150TemplateUi.category);if(!categoryMatch)return false;if(!search)return true;return`${template.name} ${template.description||''} ${template.category||''}`.toLowerCase().includes(search)});host.innerHTML=`<div class="v140-template-title"><strong>Choose a starting point</strong><small>Pick a category first. You can still start completely blank, or choose a ready-made structure and change every block afterwards.</small></div><div class="v150-template-toolbar"><div class="v150-category-tabs">${V150_TEMPLATE_CATEGORIES.map((category)=>`<button type="button" data-v150-category="${escapeAttr(category)}" class="${v150TemplateUi.category===category?'active':''}">${escapeHtml(category)}</button>`).join('')}</div><label class="v150-template-search"><span>Search templates</span><input id="v150TemplateSearch" type="search" value="${escapeAttr(v150TemplateUi.search)}" placeholder="Search announcement, raid, guide…"></label></div><div class="v150-template-count">${shown.length} template${shown.length===1?'':'s'} · ${escapeHtml(v150TemplateUi.category)}</div><div class="v140-template-grid v150-template-grid">${shown.map((template)=>`<button type="button" data-v140-template="${escapeAttr(template.value)}" class="${els.newTemplate.value===template.value?'active':''}"><span class="v150-template-icon">${escapeHtml(template.icon||'📄')}</span><span class="v150-template-copy"><strong>${escapeHtml(template.name)}</strong><small>${escapeHtml(template.description||'')}</small></span><span class="v150-template-badges"><i>${escapeHtml(template.category||'Other')}</i><i class="${V150_CONTAINER_TEMPLATES.has(template.value)?'container':'plain'}">${V150_CONTAINER_TEMPLATES.has(template.value)?'Container':'Plain'}</i></span></button>`).join('')}</div>${shown.length?'':'<div class="v150-template-empty">No templates match this category/search.</div>'}`;$$('[data-v150-category]',host).forEach((button)=>button.addEventListener('click',()=>{v150TemplateUi.category=button.dataset.v150Category;v140SetupTemplates()}));$('#v150TemplateSearch',host)?.addEventListener('input',(e)=>{v150TemplateUi.search=e.target.value;v140SetupTemplates();requestAnimationFrame(()=>{const input=$('#v150TemplateSearch');input?.focus();input?.setSelectionRange(input.value.length,input.value.length)})});$$('[data-v140-template]',host).forEach((button)=>button.addEventListener('click',()=>{els.newTemplate.value=button.dataset.v140Template;$$('[data-v140-template]',host).forEach((node)=>node.classList.toggle('active',node===button))}))};
v140BuildAddMenu();v140SetupTemplates();document.title='Timewizzard Web Builder v1.5.0';const v150BrandSmall=document.querySelector('.brand small');if(v150BrandSmall)v150BrandSmall.textContent='v1.5.0 · Smart blocks + template categories';
