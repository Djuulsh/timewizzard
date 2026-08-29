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
    // Containers stay root-level. Dropping one near a nested child simply
    // positions it before/after that child's parent container.
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
      // Approximate the server's container chunking for the live badge.
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

// The new-draft dialog can be opened before bootstrap wrapper has rendered the
// cards. Watching only the dialog's open attribute keeps this cheap.
if (els.newDraftDialog) {
  new MutationObserver(() => { if (els.newDraftDialog.open) v140SetupTemplates(); }).observe(els.newDraftDialog, { attributes: true, attributeFilter: ['open'] });
}

v140PolishGlobalUi();
document.title = 'Timewizzard Web Builder v1.4.0';
const v140BrandSmall = document.querySelector('.brand small');
if (v140BrandSmall) v140BrandSmall.textContent = 'v1.4.0 · Plain posts + nested containers';
