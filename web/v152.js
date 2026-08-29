// Timewizzard v1.5.2 — sticky editor toolbar + one reusable Add Block picker.

const V152_BLOCKS = [
  { type: 'text', icon: '📝', name: 'Text', description: 'Free Discord Markdown text.', category: 'Content', recommended: true },
  { type: 'heading', icon: '🔠', name: 'Heading', description: 'Structured H1/H2/H3 heading with optional emoji.', category: 'Content', recommended: true },
  { type: 'callout', icon: '💡', name: 'Callout', description: 'Info, success, warning or danger notice.', category: 'Content', recommended: true },
  { type: 'image', icon: '🖼️', name: 'Image', description: 'Single image or banner.', category: 'Content', recommended: true },
  { type: 'thumbnail', icon: '🔲', name: 'Thumbnail', description: 'Text section with a thumbnail accessory.', category: 'Content' },
  { type: 'gallery', icon: '🖼️', name: 'Gallery', description: 'Media Gallery with up to 10 images.', category: 'Content' },
  { type: 'youtube', icon: '▶️', name: 'YouTube', description: 'Paste a YouTube URL and build the presentation automatically.', category: 'Content' },
  { type: 'code', icon: '💻', name: 'Code Snippet', description: 'Formatted code or configuration block.', category: 'Content' },

  { type: 'checklist', icon: '☑️', name: 'Checklist', description: 'Completed and pending checklist items.', category: 'Structured' },
  { type: 'steps', icon: '👣', name: 'Steps', description: 'Numbered step-by-step instructions.', category: 'Structured' },
  { type: 'facts', icon: '🏷️', name: 'Facts / Key values', description: 'Compact label and value rows.', category: 'Structured' },
  { type: 'progress', icon: '📊', name: 'Progress', description: 'Visual progress bar with current and total values.', category: 'Structured' },

  { type: 'event', icon: '📅', name: 'Event', description: 'Event title, time, location and Discord timestamps.', category: 'Time & Events' },
  { type: 'countdown', icon: '⏳', name: 'Countdown', description: 'Live Discord relative timestamp countdown.', category: 'Time & Events' },

  { type: 'separator', icon: '➖', name: 'Separator', description: 'Visual divider with small or large spacing.', category: 'Layout', recommended: true },
  { type: 'container', icon: '🧱', name: 'Container', description: 'Colored Components V2 group with its own child blocks.', category: 'Layout', recommended: true },

  { type: 'link', icon: '🔗', name: 'Link', description: 'Text section with one URL button.', category: 'Interactions', recommended: true },
  { type: 'button_row', icon: '🔗', name: 'Button Row', description: 'Up to five URL buttons on one row.', category: 'Interactions', recommended: true },
  { type: 'open', icon: '🔘', name: 'Open / Ephemeral', description: 'Button that opens a private ephemeral response.', category: 'Interactions' },
  { type: 'select', icon: '🔽', name: 'Select', description: 'Dropdown options with private responses.', category: 'Interactions' },

  { type: 'profile_select', icon: '🎮', name: 'MerfinUI Select', description: 'Class and resolution profile dropdown.', category: 'Special' },
  { type: 'profile_open_list', icon: '📋', name: 'MerfinUI Profile List', description: 'Compact profile overview.', category: 'Special' }
];

const V152_CATEGORIES = ['Recommended', 'Content', 'Structured', 'Time & Events', 'Layout', 'Interactions', 'Special', 'All'];
const v152Ui = { category: 'Recommended', search: '', targetContainerId: null };

function v152CurrentContainer() {
  const found = v140Find(state.selectedBlockId);
  if (!found) return null;
  return found.block?.type === 'container' ? found.block : found.parent;
}

function v152ContainerById(id) {
  if (!id) return null;
  return v140Roots().find((block) => block.type === 'container' && block.id === id) || null;
}

function v152TargetLabel(containerId = v152Ui.targetContainerId) {
  const container = v152ContainerById(containerId);
  return container ? `🧱 ${container.label || 'Container'}` : 'POST root';
}

function v152EnsureDialog() {
  let dialog = document.getElementById('v152AddBlockDialog');
  if (dialog) return dialog;

  dialog = document.createElement('dialog');
  dialog.id = 'v152AddBlockDialog';
  dialog.className = 'dialog v152-add-dialog';
  dialog.innerHTML = `
    <div class="v152-add-shell">
      <div class="dialog-head">
        <div><h2>Add block</h2><p>Choose what you want to add and where it should be placed.</p></div>
        <button type="button" class="icon-btn" id="v152AddClose" aria-label="Close">×</button>
      </div>
      <div class="v152-add-toolbar">
        <label class="v152-target-label">Add to
          <select id="v152AddTarget"></select>
        </label>
        <label class="v152-search-label">Search blocks
          <input id="v152AddSearch" type="search" placeholder="Heading, image, event, button…" autocomplete="off">
        </label>
      </div>
      <div id="v152AddCategories" class="v152-add-categories"></div>
      <div class="v152-add-result-head"><strong id="v152AddResultTitle">Recommended</strong><span id="v152AddResultCount"></span></div>
      <div id="v152AddGrid" class="v152-add-grid"></div>
      <div class="dialog-actions"><span class="v152-add-hint">Tip: Ctrl/Cmd + Shift + A opens this picker.</span><button type="button" class="btn ghost" id="v152AddDone">Close</button></div>
    </div>`;
  document.body.append(dialog);

  dialog.querySelector('#v152AddClose').addEventListener('click', () => dialog.close());
  dialog.querySelector('#v152AddDone').addEventListener('click', () => dialog.close());
  dialog.querySelector('#v152AddSearch').addEventListener('input', (event) => {
    v152Ui.search = event.target.value;
    v152RenderAddGrid();
  });
  dialog.querySelector('#v152AddTarget').addEventListener('change', (event) => {
    v152Ui.targetContainerId = event.target.value || null;
    v152UpdateHeaderContext();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    v152Ui.search = '';
    const search = dialog.querySelector('#v152AddSearch');
    if (search) search.value = '';
  });
  return dialog;
}

function v152RenderTargetSelect() {
  const dialog = v152EnsureDialog();
  const select = dialog.querySelector('#v152AddTarget');
  const containers = v140Roots().filter((block) => block.type === 'container');
  if (v152Ui.targetContainerId && !containers.some((block) => block.id === v152Ui.targetContainerId)) v152Ui.targetContainerId = null;
  select.innerHTML = `<option value="">POST root</option>${containers.map((block) => `<option value="${escapeAttr(block.id)}" ${block.id === v152Ui.targetContainerId ? 'selected' : ''}>🧱 ${escapeHtml(block.label || 'Container')}</option>`).join('')}`;
  select.value = v152Ui.targetContainerId || '';
}

function v152VisibleBlocks() {
  const query = v152Ui.search.trim().toLowerCase();
  return V152_BLOCKS.filter((item) => {
    const categoryMatch = v152Ui.category === 'All'
      || (v152Ui.category === 'Recommended' ? item.recommended : item.category === v152Ui.category);
    if (!categoryMatch) return false;
    if (!query) return true;
    return `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query);
  });
}

function v152RenderAddGrid() {
  const dialog = v152EnsureDialog();
  const categoryHost = dialog.querySelector('#v152AddCategories');
  categoryHost.innerHTML = V152_CATEGORIES.map((category) => `<button type="button" data-v152-category="${escapeAttr(category)}" class="${v152Ui.category === category ? 'active' : ''}">${escapeHtml(category)}</button>`).join('');
  categoryHost.querySelectorAll('[data-v152-category]').forEach((button) => button.addEventListener('click', () => {
    v152Ui.category = button.dataset.v152Category;
    v152RenderAddGrid();
  }));

  const visible = v152VisibleBlocks();
  dialog.querySelector('#v152AddResultTitle').textContent = v152Ui.search ? 'Search results' : v152Ui.category;
  dialog.querySelector('#v152AddResultCount').textContent = `${visible.length} block${visible.length === 1 ? '' : 's'}`;
  const grid = dialog.querySelector('#v152AddGrid');
  grid.innerHTML = visible.length
    ? visible.map((item) => `<button type="button" class="v152-add-card" data-v152-add="${escapeAttr(item.type)}"><span class="v152-add-icon">${item.icon}</span><span class="v152-add-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small></span><i>${escapeHtml(item.category)}</i></button>`).join('')
    : '<div class="v152-add-empty">No blocks match this search.</div>';
  grid.querySelectorAll('[data-v152-add]').forEach((button) => button.addEventListener('click', () => v152AddSelectedBlock(button.dataset.v152Add)));
}

function v152OpenAddBlock(targetContainerId = undefined) {
  if (!state.entity) return;
  const current = v152CurrentContainer();
  v152Ui.targetContainerId = targetContainerId === undefined ? (current?.id || null) : (targetContainerId || null);
  v152Ui.category = 'Recommended';
  v152Ui.search = '';
  const dialog = v152EnsureDialog();
  v152RenderTargetSelect();
  v152RenderAddGrid();
  dialog.showModal();
  requestAnimationFrame(() => dialog.querySelector('#v152AddSearch')?.focus());
  v152UpdateHeaderContext();
}

function v152AddSelectedBlock(type) {
  if (!state.entity) return;
  if (type === 'container') {
    state.selectedBlockId = null;
  } else if (v152Ui.targetContainerId) {
    const container = v152ContainerById(v152Ui.targetContainerId);
    state.selectedBlockId = container?.id || null;
  } else {
    state.selectedBlockId = null;
  }
  addBlock(type);
  document.getElementById('v152AddBlockDialog')?.close();
  v152UpdateHeaderContext();
}

function v152UpdateHeaderContext() {
  const context = document.getElementById('v152AddContext');
  if (!context) return;
  const current = v152CurrentContainer();
  context.textContent = current ? `into ${current.label || 'Container'}` : 'to POST root';
  context.title = current ? `New content will default to ${current.label || 'Container'}` : 'New content will default to the POST root';
}

function v152CloseMoreMenu() {
  const details = document.getElementById('v152MoreMenu');
  if (details) details.open = false;
}

function v152SetupEditorHead() {
  const head = document.querySelector('.editor-head');
  const actions = document.querySelector('.editor-actions');
  if (!head || !actions || document.getElementById('v152AddBlockBtn')) return;
  head.classList.add('v152-editor-head');

  const addButton = document.createElement('button');
  addButton.id = 'v152AddBlockBtn';
  addButton.type = 'button';
  addButton.className = 'btn primary v152-add-main';
  addButton.innerHTML = '<span>＋ Add block</span><small id="v152AddContext">to POST root</small>';
  addButton.addEventListener('click', () => v152OpenAddBlock());
  actions.prepend(addButton);

  const details = document.createElement('details');
  details.id = 'v152MoreMenu';
  details.className = 'v152-more-menu';
  details.innerHTML = '<summary class="btn ghost" title="More post actions">••• More</summary><div class="v152-more-panel"><strong>Post actions</strong><div class="v152-more-actions"></div></div>';
  const target = details.querySelector('.v152-more-actions');
  ['destinationBtn', 'historyBtn', 'cloneBtn', 'exportBtn', 'deleteBtn'].forEach((id) => {
    const button = document.getElementById(id);
    if (!button) return;
    button.classList.add('v152-more-action');
    target.append(button);
    button.addEventListener('click', v152CloseMoreMenu);
  });
  actions.append(details);

  document.addEventListener('click', (event) => {
    if (details.open && !details.contains(event.target)) details.open = false;
  });
  v152UpdateHeaderContext();
}

function v152BindContainerAddButtons() {
  document.querySelectorAll('[data-container-add]').forEach((button) => {
    if (button.dataset.v152Bound) return;
    button.dataset.v152Bound = '1';
    button.title = 'Add block inside this container';
    button.addEventListener('click', (event) => {
      const card = event.currentTarget.closest('.v140-container-card');
      const containerId = card?.dataset.blockId || null;
      if (containerId) v152OpenAddBlock(containerId);
    });
  });
}

const v152PreviousRenderBlockList = renderBlockList;
renderBlockList = function v152RenderBlockList() {
  const result = v152PreviousRenderBlockList();
  v152BindContainerAddButtons();
  v152UpdateHeaderContext();
  return result;
};

const v152PreviousRenderInspector = renderInspector;
renderInspector = function v152RenderInspector() {
  const result = v152PreviousRenderInspector();
  v152UpdateHeaderContext();
  return result;
};

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'a') {
    if (!state.entity) return;
    event.preventDefault();
    v152OpenAddBlock();
  }
});

function v152Init() {
  v152SetupEditorHead();
  v152EnsureDialog();
  v152BindContainerAddButtons();
  const legacyAdd = document.querySelector('.add-block');
  if (legacyAdd) legacyAdd.setAttribute('aria-hidden', 'true');
  document.title = 'Timewizzard Web Builder v1.5.2';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.2 · Header Add Block workflow';
}

v152Init();
