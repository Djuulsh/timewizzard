// Timewizzard v1.5.19 — responsive editor UX.
// One context-aware Markdown toolbar follows the active rich-text field, while
// the editor header and Inspector use shared responsive behaviour instead of
// one-off viewport fixes.

const V1519_INLINE_MARKDOWN_IDS = new Set([
  'v150HeadingTitle',
  'v150CalloutTitle',
  'v150EventTitle',
  'v150CountdownTitle',
  'v150ChecklistTitle',
  'v150StepsTitle',
  'v150FactsTitle',
  'v150ProgressLabel'
]);

const V1519_BLOCK_MARKDOWN_IDS = new Set([
  'iContent',
  'iThumbText',
  'iText',
  'iActionContent',
  'v140YoutubeDesc',
  'v150HeadingSubtitle',
  'v150CalloutContent',
  'v150EventDescription',
  'v150CountdownText',
  'v150ProgressNote'
]);

const V1519_INLINE_ACTIONS = [
  ['bold', 'B'],
  ['italic', 'I'],
  ['underline', 'U'],
  ['strike', 'S'],
  ['code', '`code`'],
  ['link', 'Link'],
  ['spoiler', 'Spoiler']
];

const V1519_BLOCK_ACTIONS = [
  ...V1519_INLINE_ACTIONS,
  ['h1', 'H1'],
  ['h2', 'H2'],
  ['h3', 'H3'],
  ['quote', '>'],
  ['multiquote', '>>>'],
  ['quoteexit', 'Exit >>>'],
  ['ul', '•'],
  ['ol', '1.'],
  ['codeblock', '```']
];

let v1519ActiveMarkdownField = null;

function v1519MarkdownMode(field) {
  if (!field || !els.inspector?.contains(field)) return null;
  if (!field.matches('input, textarea')) return null;
  if (field.matches('input[type="url"], input[type="number"], input[type="datetime-local"], input[type="color"], input[type="checkbox"]')) return null;
  if (field.matches('[data-nested-content], [data-option-response]')) return 'block';
  if (/^v1513FactValue\d+$/.test(field.id || '')) return 'block';
  if (V1519_BLOCK_MARKDOWN_IDS.has(field.id)) return 'block';
  if (V1519_INLINE_MARKDOWN_IDS.has(field.id)) return 'inline';
  return null;
}

function v1519EnsureFieldId(field) {
  if (!field.id) field.id = `v1519MarkdownField${shortId(3)}`;
  return field.id;
}

function v1519EnsureMarkdownToolbar() {
  let toolbar = document.getElementById('v1519ContextMarkdownToolbar');
  if (toolbar) return toolbar;
  toolbar = document.createElement('div');
  toolbar.id = 'v1519ContextMarkdownToolbar';
  toolbar.className = 'markdown-toolbar v1519-context-toolbar hidden';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Markdown tools for active field');
  els.inspector?.append(toolbar);
  return toolbar;
}

function v1519ToolbarAnchor(field) {
  const factCell = field.closest('.v1513-fact-value-cell');
  if (factCell) return field.closest('label') || factCell;
  const grouped = field.closest('.v154-heading-primary-grid, .v150-inline-fields, .v150-triple-fields');
  if (grouped) return grouped;
  return field.closest('label') || field.closest('.v153-textarea-shell') || field;
}

function v1519RenderMarkdownToolbar(field, mode) {
  const toolbar = v1519EnsureMarkdownToolbar();
  const actions = mode === 'block' ? V1519_BLOCK_ACTIONS : V1519_INLINE_ACTIONS;
  toolbar.innerHTML = `
    <span class="v1519-toolbar-caption">Markdown</span>
    <div class="v1519-toolbar-actions">
      ${actions.map(([action, label]) => `<button type="button" class="toolbar-btn" data-v1519-md="${escapeAttr(action)}">${escapeHtml(label)}</button>`).join('')}
      <button type="button" class="toolbar-btn discord-insert-btn v1519-discord-insert">💬 Discord Insert</button>
    </div>`;

  toolbar.querySelectorAll('button').forEach((button) => {
    button.addEventListener('pointerdown', (event) => event.preventDefault());
  });
  toolbar.querySelectorAll('[data-v1519-md]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!v1519ActiveMarkdownField?.isConnected) return;
      applyMarkdownAction(v1519ActiveMarkdownField, button.dataset.v1519Md);
    });
  });
  toolbar.querySelector('.v1519-discord-insert')?.addEventListener('click', () => {
    if (!v1519ActiveMarkdownField?.isConnected) return;
    const targetId = v1519EnsureFieldId(v1519ActiveMarkdownField);
    v131OpenPicker(targetId).catch((error) => toast(error.message, 'error'));
  });

  const anchor = v1519ToolbarAnchor(field);
  if (anchor?.parentElement) anchor.insertAdjacentElement('afterend', toolbar);
  toolbar.classList.remove('hidden');
  toolbar.dataset.mode = mode;
  toolbar.dataset.targetId = v1519EnsureFieldId(field);
}

function v1519ActivateMarkdownField(field) {
  const mode = v1519MarkdownMode(field);
  if (!mode) return false;
  v1519ActiveMarkdownField = field;
  field.classList.add('v1519-markdown-active');
  els.inspector?.querySelectorAll('.v1519-markdown-active').forEach((node) => {
    if (node !== field) node.classList.remove('v1519-markdown-active');
  });
  v1519RenderMarkdownToolbar(field, mode);
  return true;
}

function v1519MarkdownFields() {
  if (!els.inspector) return [];
  return [...els.inspector.querySelectorAll('input, textarea')].filter((field) => Boolean(v1519MarkdownMode(field)));
}

function v1519EnhanceMarkdownInspector() {
  const toolbar = v1519EnsureMarkdownToolbar();
  const fields = v1519MarkdownFields();
  fields.forEach((field) => field.classList.add('v1519-markdown-enabled'));
  if (!fields.length) {
    v1519ActiveMarkdownField = null;
    toolbar.classList.add('hidden');
    return;
  }

  if (v1519ActiveMarkdownField?.isConnected && fields.includes(v1519ActiveMarkdownField)) {
    v1519ActivateMarkdownField(v1519ActiveMarkdownField);
    return;
  }
  v1519ActivateMarkdownField(fields[0]);
}

function v1519BindMarkdownFocus() {
  if (!els.inspector || els.inspector.dataset.v1519MarkdownFocusBound) return;
  els.inspector.dataset.v1519MarkdownFocusBound = '1';
  els.inspector.addEventListener('focusin', (event) => {
    const field = event.target?.closest?.('input, textarea');
    if (field) v1519ActivateMarkdownField(field);
  });
}

function v1519SyncSecondaryActions() {
  const openOriginal = document.getElementById('v131OpenDiscordBtn');
  const copyOriginal = document.getElementById('v131CopyDiscordBtn');
  const openProxy = document.getElementById('v1519MoreOpenDiscord');
  const copyProxy = document.getElementById('v1519MoreCopyDiscord');
  openProxy?.classList.toggle('hidden', !openOriginal || openOriginal.classList.contains('hidden'));
  copyProxy?.classList.toggle('hidden', !copyOriginal || copyOriginal.classList.contains('hidden'));
}

function v1519EnsureMoreProxies(more) {
  const host = more?.querySelector('.v152-more-actions');
  if (!host) return;

  if (!document.getElementById('v1519MoreOpenDiscord')) {
    const open = document.createElement('button');
    open.id = 'v1519MoreOpenDiscord';
    open.type = 'button';
    open.className = 'btn ghost v152-more-action v1519-more-open-proxy v1519-secondary-proxy hidden';
    open.textContent = '↗ Open in Discord';
    open.addEventListener('click', () => {
      document.getElementById('v131OpenDiscordBtn')?.click();
      more.open = false;
    });
    host.prepend(open);
  }

  if (!document.getElementById('v1519MoreCopyDiscord')) {
    const copy = document.createElement('button');
    copy.id = 'v1519MoreCopyDiscord';
    copy.type = 'button';
    copy.className = 'btn ghost v152-more-action v1519-more-copy-proxy hidden';
    copy.textContent = '⧉ Copy post link';
    copy.addEventListener('click', () => {
      document.getElementById('v131CopyDiscordBtn')?.click();
      more.open = false;
    });
    const openProxy = document.getElementById('v1519MoreOpenDiscord');
    openProxy?.insertAdjacentElement('afterend', copy);
  }
  v1519SyncSecondaryActions();
}

function v1519SetupEditorHeader() {
  const head = document.querySelector('.v152-editor-head, .editor-head');
  const actions = head?.querySelector('.editor-actions');
  if (!head || !actions) return;
  head.classList.add('v1519-responsive-editor-head');

  let history = actions.querySelector('.v1519-history-actions');
  if (!history) {
    history = document.createElement('div');
    history.className = 'v1519-history-actions';
  }

  const add = document.getElementById('v152AddBlockBtn');
  const save = document.getElementById('saveBtn');
  const publish = document.getElementById('publishBtn');
  const undo = document.getElementById('undoBtn');
  const redo = document.getElementById('redoBtn');
  const open = document.getElementById('v131OpenDiscordBtn');
  const copy = document.getElementById('v131CopyDiscordBtn');
  const more = document.getElementById('v152MoreMenu');

  if (undo && undo.parentElement !== history) history.append(undo);
  if (redo && redo.parentElement !== history) history.append(redo);
  open?.classList.add('v1519-secondary-direct');
  copy?.classList.add('v1519-copy-direct');

  [add, save, publish, history, open, copy, more].filter(Boolean).forEach((node) => actions.append(node));
  if (more) v1519EnsureMoreProxies(more);

  if (!actions.dataset.v1519SecondaryObserver) {
    actions.dataset.v1519SecondaryObserver = '1';
    const observer = new MutationObserver(v1519SyncSecondaryActions);
    if (open) observer.observe(open, { attributes: true, attributeFilter: ['class'] });
    if (copy) observer.observe(copy, { attributes: true, attributeFilter: ['class'] });
  }
}

const v1519PreviousRenderInspector = renderInspector;
renderInspector = function v1519RenderInspector() {
  const result = v1519PreviousRenderInspector();
  v1519EnhanceMarkdownInspector();
  return result;
};

const v1519PreviousRenderEditorMeta = renderEditorMeta;
renderEditorMeta = function v1519RenderEditorMeta() {
  const result = v1519PreviousRenderEditorMeta();
  v1519SetupEditorHeader();
  v1519SyncSecondaryActions();
  return result;
};

function v1519Init() {
  document.body.classList.add('v1519-responsive-editor-ux');
  v1519BindMarkdownFocus();
  v1519SetupEditorHeader();
  v1519EnhanceMarkdownInspector();
  document.title = 'Timewizzard Web Builder v1.5.19';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.19 · Responsive Editor UX';
}

v1519Init();
