// Timewizzard v1.6.2 — consolidated cross-platform UX controller.
// This is the final compatibility layer on top of the v1.5 editor. New UI work
// should extend the shared primitives below instead of adding version-specific
// one-off patches.

const V162_VERSION = '1.6.2';
const V162_RECOVERY_PREFIX = 'timewizzard:recovery:v1:';
const v162Ui = {
  view: 'blocks',
  previewWidth: 'desktop',
  drawerOpen: false,
  canonicalTimer: null,
  canonicalSequence: 0,
  recoveryTimer: null,
  activeField: null
};

function v162Media(query) {
  return window.matchMedia?.(query)?.matches ?? false;
}

function v162ScopeIdentity() {
  if (!state.scope?.kind || !state.scope?.id) return null;
  const guild = state.bootstrap?.guild?.id || 'guild';
  const user = state.bootstrap?.user?.id || 'user';
  return `${guild}:${user}:${state.scope.kind}:${state.scope.id}`;
}

function v162RecoveryKey() {
  const identity = v162ScopeIdentity();
  return identity ? `${V162_RECOVERY_PREFIX}${identity}` : null;
}

function v162SafeLocalStorage(action) {
  try {
    return action(window.localStorage);
  } catch {
    return null;
  }
}

function v162CurrentSnapshot() {
  if (!state.entity || !state.scope) return null;
  return {
    savedAt: Date.now(),
    scope: { ...state.scope },
    title: state.entity.title,
    builder: structuredClone(state.entity.builder),
    baseUpdatedAt: state.entity.updatedAt || null
  };
}

function v162PersistRecoveryNow() {
  const key = v162RecoveryKey();
  const value = v162CurrentSnapshot();
  if (!key || !value || !state.dirty) return;
  v162SafeLocalStorage((storage) => storage.setItem(key, JSON.stringify(value)));
}

function v162ScheduleRecovery() {
  clearTimeout(v162Ui.recoveryTimer);
  v162Ui.recoveryTimer = setTimeout(v162PersistRecoveryNow, 900);
}

function v162ClearRecovery() {
  clearTimeout(v162Ui.recoveryTimer);
  const key = v162RecoveryKey();
  if (key) v162SafeLocalStorage((storage) => storage.removeItem(key));
}

function v162ReadRecovery() {
  const key = v162RecoveryKey();
  if (!key) return null;
  const raw = v162SafeLocalStorage((storage) => storage.getItem(key));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    v162SafeLocalStorage((storage) => storage.removeItem(key));
    return null;
  }
}

function v162RecoveryIsUseful(recovery) {
  if (!recovery || !state.entity || !state.scope) return false;
  if (recovery.scope?.kind !== state.scope.kind || recovery.scope?.id !== state.scope.id) return false;
  const current = JSON.stringify({ title: state.entity.title, builder: state.entity.builder });
  const recovered = JSON.stringify({ title: recovery.title, builder: recovery.builder });
  if (current === recovered) return false;
  const serverTime = Date.parse(state.entity.updatedAt || state.entity.createdAt || 0) || 0;
  return Number(recovery.savedAt || 0) > serverTime;
}

function v162EnsureRecoveryDialog() {
  let dialog = document.getElementById('v162RecoveryDialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'v162RecoveryDialog';
  dialog.className = 'dialog v162-review-dialog';
  dialog.innerHTML = `
    <form method="dialog" class="v162-dialog-shell">
      <div class="dialog-head">
        <div><h2>Restore unsaved work?</h2><p>Timewizzard found a newer local editor snapshot from this device.</p></div>
        <button type="button" class="icon-btn" data-v162-recovery="close" aria-label="Close">×</button>
      </div>
      <div class="v162-dialog-body">
        <div class="v162-recovery-summary" id="v162RecoverySummary"></div>
        <p class="v162-dialog-note">Restoring only changes the editor. Nothing is published until you explicitly save and publish.</p>
      </div>
      <div class="dialog-actions">
        <button type="button" class="btn ghost" data-v162-recovery="discard">Discard local copy</button>
        <button type="button" class="btn primary" data-v162-recovery="restore">Restore changes</button>
      </div>
    </form>`;
  document.body.append(dialog);
  dialog.querySelector('[data-v162-recovery="close"]')?.addEventListener('click', () => dialog.close());
  return dialog;
}

function v162OfferRecovery() {
  const recovery = v162ReadRecovery();
  if (!v162RecoveryIsUseful(recovery)) return;
  const dialog = v162EnsureRecoveryDialog();
  const date = new Date(Number(recovery.savedAt || Date.now()));
  const summary = dialog.querySelector('#v162RecoverySummary');
  if (summary) {
    summary.innerHTML = `<strong>${escapeHtml(recovery.title || state.entity.title || 'Untitled post')}</strong><span>Saved locally ${escapeHtml(date.toLocaleString())}</span>`;
  }
  const discard = dialog.querySelector('[data-v162-recovery="discard"]');
  const restore = dialog.querySelector('[data-v162-recovery="restore"]');
  discard.onclick = () => {
    v162ClearRecovery();
    dialog.close();
    toast('Local recovery copy discarded.', 'success');
  };
  restore.onclick = () => {
    state.entity.title = String(recovery.title || state.entity.title || '').slice(0, 100);
    state.entity.builder = structuredClone(recovery.builder);
    els.postTitle.value = state.entity.title;
    if (els.postAccent && Number.isInteger(state.entity.builder?.accentColor)) {
      els.postAccent.value = colorHex(state.entity.builder.accentColor);
    }
    state.dirty = true;
    renderAll();
    v162ScheduleRecovery();
    dialog.close();
    toast('Unsaved editor changes restored.', 'success');
  };
  dialog.showModal();
}

function v162SetDrawer(open) {
  v162Ui.drawerOpen = Boolean(open);
  document.body.classList.toggle('v162-posts-open', v162Ui.drawerOpen);
  document.getElementById('v162PostsToggle')?.setAttribute('aria-expanded', String(v162Ui.drawerOpen));
  document.getElementById('v162DrawerBackdrop')?.classList.toggle('hidden', !v162Ui.drawerOpen);
}

function v162SetView(view, { focus = false } = {}) {
  if (!['blocks', 'edit', 'preview'].includes(view)) return;
  v162Ui.view = view;
  document.body.dataset.twView = view;
  document.querySelectorAll('[data-v162-view]').forEach((button) => {
    const active = button.dataset.v162View === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  if (focus) {
    const target = view === 'blocks'
      ? document.querySelector('.block-column')
      : view === 'edit'
        ? document.querySelector('.inspector-column')
        : document.querySelector('.preview');
    target?.focus?.({ preventScroll: true });
  }
}

function v162SetPreviewWidth(width) {
  v162Ui.previewWidth = width === 'mobile' ? 'mobile' : 'desktop';
  document.body.dataset.twPreviewWidth = v162Ui.previewWidth;
  document.querySelectorAll('[data-v162-preview-width]').forEach((button) => {
    const active = button.dataset.v162PreviewWidth === v162Ui.previewWidth;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function v162EnsureAppMenu() {
  const actions = document.querySelector('.top-actions');
  if (!actions) return;

  let posts = document.getElementById('v162PostsToggle');
  if (!posts) {
    posts = document.createElement('button');
    posts.id = 'v162PostsToggle';
    posts.type = 'button';
    posts.className = 'btn ghost v162-posts-toggle';
    posts.textContent = '☰ Posts';
    posts.setAttribute('aria-controls', 'postsSidebar');
    posts.setAttribute('aria-expanded', 'false');
    posts.addEventListener('click', () => v162SetDrawer(!v162Ui.drawerOpen));
    actions.prepend(posts);
  }

  let menu = document.getElementById('v162AppMenu');
  if (!menu) {
    menu = document.createElement('details');
    menu.id = 'v162AppMenu';
    menu.className = 'v162-app-menu';
    menu.innerHTML = '<summary class="btn ghost" aria-label="Application menu">•••</summary><div class="v162-app-menu-panel"><strong>Application</strong><div class="v162-app-menu-actions"></div></div>';
    actions.append(menu);
  }

  const host = menu.querySelector('.v162-app-menu-actions');
  const identityButton = document.getElementById('v131IdentityBtn');
  const logout = actions.querySelector('a[href="/logout"]') || document.querySelector('a[href="/logout"]');
  [els.refreshBtn, els.importBuilderBtn, els.importDiscohookBtn, identityButton, logout].filter(Boolean).forEach((node) => {
    node.classList.add('v162-menu-action');
    if (node.parentElement !== host) host.append(node);
  });

  if (!menu.dataset.v162Bound) {
    menu.dataset.v162Bound = '1';
    host?.addEventListener('click', (event) => {
      if (event.target.closest('button, a')) menu.open = false;
    });
    document.addEventListener('click', (event) => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  }
}

function v162EnsureWorkspaceNavigation() {
  const editor = document.getElementById('editor');
  const orphan = document.getElementById('orphanBanner');
  if (!editor || document.getElementById('v162WorkspaceNav')) return;
  const nav = document.createElement('nav');
  nav.id = 'v162WorkspaceNav';
  nav.className = 'v162-workspace-nav';
  nav.setAttribute('aria-label', 'Editor workspace');
  nav.innerHTML = `
    <button type="button" class="btn ghost" data-v162-posts-nav>☰ Posts</button>
    <div role="tablist" aria-label="Editor panels">
      <button type="button" role="tab" data-v162-view="blocks">Blocks</button>
      <button type="button" role="tab" data-v162-view="edit">Edit</button>
      <button type="button" role="tab" data-v162-view="preview">Preview</button>
    </div>`;
  orphan?.insertAdjacentElement('afterend', nav);
  nav.querySelector('[data-v162-posts-nav]')?.addEventListener('click', () => v162SetDrawer(true));
  nav.querySelectorAll('[data-v162-view]').forEach((button) => button.addEventListener('click', () => v162SetView(button.dataset.v162View)));
}

function v162EnsurePreviewControls() {
  const heading = document.querySelector('.preview-heading');
  if (!heading || document.getElementById('v162PreviewControls')) return;
  const controls = document.createElement('div');
  controls.id = 'v162PreviewControls';
  controls.className = 'v162-preview-controls';
  controls.innerHTML = `
    <span id="v162CanonicalState" class="v162-canonical-state" aria-live="polite">Discord payload pending</span>
    <div class="v162-preview-segment" aria-label="Preview width">
      <button type="button" data-v162-preview-width="desktop" aria-pressed="true">Desktop</button>
      <button type="button" data-v162-preview-width="mobile" aria-pressed="false">Mobile</button>
    </div>`;
  heading.append(controls);
  controls.querySelectorAll('[data-v162-preview-width]').forEach((button) => button.addEventListener('click', () => v162SetPreviewWidth(button.dataset.v162PreviewWidth)));
}

function v162EnsureDrawerBackdrop() {
  if (document.getElementById('v162DrawerBackdrop')) return;
  const backdrop = document.createElement('button');
  backdrop.id = 'v162DrawerBackdrop';
  backdrop.type = 'button';
  backdrop.className = 'v162-drawer-backdrop hidden';
  backdrop.setAttribute('aria-label', 'Close Posts');
  backdrop.addEventListener('click', () => v162SetDrawer(false));
  document.body.append(backdrop);
}

function v162EnsureAppShell() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.id ||= 'postsSidebar';
  v162EnsureAppMenu();
  v162EnsureWorkspaceNavigation();
  v162EnsurePreviewControls();
  v162EnsureDrawerBackdrop();
  v162SetView(v162Ui.view);
  v162SetPreviewWidth(v162Ui.previewWidth);
}

function v162FieldLabel(field) {
  const known = {
    iContent: 'Text content',
    iThumbText: 'Thumbnail text',
    iText: 'Section text',
    iActionContent: 'Ephemeral response',
    v140YoutubeDesc: 'YouTube description',
    v150HeadingTitle: 'Heading title',
    v150HeadingSubtitle: 'Heading subtitle',
    v150CalloutTitle: 'Callout title',
    v150CalloutContent: 'Callout content',
    v150EventTitle: 'Event title',
    v150EventDescription: 'Event description',
    v150CountdownTitle: 'Countdown title',
    v150CountdownText: 'Countdown text',
    v150ChecklistTitle: 'Checklist title',
    v150StepsTitle: 'Steps title',
    v150FactsTitle: 'Info list title',
    v150ProgressLabel: 'Progress label',
    v150ProgressNote: 'Progress note'
  };
  if (/^v1513FactValue\d+$/.test(field?.id || '')) return 'Info list value';
  if (known[field?.id]) return known[field.id];
  const label = field?.closest('label');
  const explicit = label?.querySelector(':scope > span')?.textContent?.trim();
  if (explicit) return explicit;
  const text = [...(label?.childNodes || [])].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())?.textContent?.trim();
  return text || 'text field';
}

function v162EnhanceMarkdownContext(field = document.activeElement) {
  const toolbar = document.getElementById('v1519ContextMarkdownToolbar');
  if (!toolbar || toolbar.classList.contains('hidden')) return;
  const target = field?.matches?.('.v1519-markdown-enabled') ? field : document.getElementById(toolbar.dataset.targetId || '');
  if (!target) return;
  const caption = toolbar.querySelector('.v1519-toolbar-caption');
  if (caption) caption.textContent = `Editing: ${v162FieldLabel(target)}`;
  v162Ui.activeField = target;
}

function v162EnhanceAccessibility(root = document) {
  root.querySelectorAll('.block-main, .v140-container-main').forEach((node) => {
    node.setAttribute('role', 'button');
    node.tabIndex = 0;
    if (!node.dataset.v162Keyboard) {
      node.dataset.v162Keyboard = '1';
      node.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        node.click();
      });
    }
  });
  root.querySelectorAll('.drag-handle').forEach((node) => {
    node.setAttribute('role', 'button');
    node.tabIndex = 0;
    node.setAttribute('aria-label', 'Move block');
  });
  root.querySelectorAll('button:not([aria-label])').forEach((button) => {
    const title = button.getAttribute('title');
    if (title) button.setAttribute('aria-label', title);
  });
  root.querySelectorAll('.v153-char-counter').forEach((counter) => {
    counter.setAttribute('role', 'status');
    counter.setAttribute('aria-label', `${counter.textContent || ''} characters used`);
  });
}

function v162CanonicalStatus(text, stateName = '') {
  const node = document.getElementById('v162CanonicalState');
  if (!node) return;
  node.textContent = text;
  node.className = `v162-canonical-state ${stateName}`.trim();
}

async function v162ValidateCanonicalPayload() {
  if (!state.entity || !state.scope || !state.entity.builder?.blocks?.length) {
    v162CanonicalStatus('Add content to validate');
    return null;
  }
  const sequence = ++v162Ui.canonicalSequence;
  v162CanonicalStatus('Validating Discord payload…', 'pending');
  try {
    const data = await api('/api/preview', {
      method: 'POST',
      body: {
        title: state.entity.title,
        builder: state.entity.builder,
        mentionPolicy: state.entity.mentionPolicy || null,
        scope: state.scope
      }
    });
    if (sequence !== v162Ui.canonicalSequence) return null;
    const messages = Number(data.stats?.messageCount || data.payloads?.length || 0);
    const minimum = Number(data.stats?.automaticMessageCount || messages);
    const maximum = Number(data.stats?.maximumMessageCount || messages);
    if (els.messageSplitHint) els.messageSplitHint.textContent = `Validated: ${messages} message${messages === 1 ? '' : 's'} · allowed range for exact split: ${minimum}-${maximum}.`;
    v162CanonicalStatus(`Discord payload valid · ${messages} message${messages === 1 ? '' : 's'}`, messages > 1 ? 'warning' : 'valid');
    return data;
  } catch (error) {
    if (sequence !== v162Ui.canonicalSequence) return null;
    if (els.messageSplitHint) els.messageSplitHint.textContent = error.message;
    v162CanonicalStatus(`Discord validation: ${error.message}`, 'error');
    return { error };
  }
}

function v162ScheduleCanonicalValidation() {
  clearTimeout(v162Ui.canonicalTimer);
  v162Ui.canonicalTimer = setTimeout(v162ValidateCanonicalPayload, 420);
}

function v162WalkBlocks(blocks, visit) {
  for (const block of blocks || []) {
    visit(block);
    if (block?.type === 'container') v162WalkBlocks(block.children || [], visit);
  }
}

function v162PublishWarnings(stats) {
  const warnings = [];
  const serialized = JSON.stringify(state.entity?.builder || {});
  if (/https:\/\/example\.com/i.test(serialized)) warnings.push('One or more placeholder example.com links remain.');
  let emptyContainers = 0;
  let missingDescriptions = 0;
  v162WalkBlocks(state.entity?.builder?.blocks || [], (block) => {
    if (block.type === 'container' && !(block.children || []).length) emptyContainers += 1;
    if (block.type === 'image' && !String(block.description || '').trim()) missingDescriptions += 1;
    if (block.type === 'thumbnail' && !String(block.description || '').trim()) missingDescriptions += 1;
    if (block.type === 'gallery') missingDescriptions += (block.items || []).filter((item) => !String(item?.description || '').trim()).length;
  });
  if (emptyContainers) warnings.push(`${emptyContainers} empty Container${emptyContainers === 1 ? '' : 's'} will not publish visible content.`);
  if (missingDescriptions) warnings.push(`${missingDescriptions} image item${missingDescriptions === 1 ? '' : 's'} lack${missingDescriptions === 1 ? 's' : ''} a description / alt text.`);
  if (Number(stats?.messageCount || 0) > 1) warnings.push(`Discord will split this layout across ${stats.messageCount} messages.`);
  if (state.entity?.mentionPolicy?.mode === 'selected') warnings.push('Selected users or roles may be notified by this post.');
  return warnings;
}

function v162DestinationLabel() {
  const id = state.entity?.destinationChannelId || state.entity?.forumChannelId || state.entity?.forumId || '';
  const name = state.bootstrap?.entities?.channels?.[id] || state.destinations?.find?.((item) => item.id === id)?.name;
  return name ? `#${name}` : id ? `Channel ${id}` : 'No destination';
}

function v162EnsurePublishDialog() {
  let dialog = document.getElementById('v162PublishDialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'v162PublishDialog';
  dialog.className = 'dialog v162-review-dialog';
  dialog.innerHTML = `
    <form method="dialog" class="v162-dialog-shell">
      <div class="dialog-head">
        <div><h2>Review before publishing</h2><p>Timewizzard validates the same Components V2 payload that will be sent to Discord.</p></div>
        <button type="button" class="icon-btn" data-v162-publish="cancel" aria-label="Close">×</button>
      </div>
      <div class="v162-dialog-body" id="v162PublishReviewBody"></div>
      <div class="dialog-actions">
        <button type="button" class="btn ghost" data-v162-publish="cancel">Cancel</button>
        <button type="button" class="btn success" data-v162-publish="confirm">Publish</button>
      </div>
    </form>`;
  document.body.append(dialog);
  dialog.querySelectorAll('[data-v162-publish="cancel"]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.querySelector('[data-v162-publish="confirm"]')?.addEventListener('click', async () => {
    dialog.close();
    await publishCurrent();
  });
  return dialog;
}

async function v162OpenPublishReview() {
  if (!state.entity || !state.scope) return;
  const dialog = v162EnsurePublishDialog();
  const body = dialog.querySelector('#v162PublishReviewBody');
  const confirm = dialog.querySelector('[data-v162-publish="confirm"]');
  const deleted = discordState()?.status === 'deleted';
  if (confirm) {
    confirm.disabled = true;
    confirm.textContent = deleted ? 'Re-create' : 'Publish';
  }
  if (body) body.innerHTML = '<div class="v162-review-loading">Validating Discord payload…</div>';
  dialog.showModal();

  const validation = await v162ValidateCanonicalPayload();
  if (!dialog.open) return;
  if (validation?.error) {
    if (body) body.innerHTML = `<div class="v162-review-error"><strong>Cannot publish yet</strong><span>${escapeHtml(validation.error.message)}</span></div>`;
    return;
  }

  const stats = validation?.stats || {};
  const warnings = v162PublishWarnings(stats);
  const mentionText = state.entity?.mentionPolicy?.mode === 'selected' ? 'Selected users / roles may ping' : 'Display only · no ping';
  if (body) {
    body.innerHTML = `
      <dl class="v162-review-grid">
        <div><dt>Post</dt><dd>${escapeHtml(state.entity.title || 'Untitled')}</dd></div>
        <div><dt>Destination</dt><dd>${escapeHtml(v162DestinationLabel())}</dd></div>
        <div><dt>Messages</dt><dd>${escapeHtml(String(stats.messageCount ?? validation.payloads?.length ?? 0))}</dd></div>
        <div><dt>Blocks</dt><dd>${escapeHtml(String(stats.blockCount ?? 0))}</dd></div>
        <div><dt>Components</dt><dd>${escapeHtml(String(stats.componentCount ?? 0))}</dd></div>
        <div><dt>Mentions</dt><dd>${escapeHtml(mentionText)}</dd></div>
      </dl>
      <section class="v162-review-warnings ${warnings.length ? '' : 'clear'}">
        <strong>${warnings.length ? `${warnings.length} item${warnings.length === 1 ? '' : 's'} to review` : 'Ready to publish'}</strong>
        ${warnings.length ? `<ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>` : '<p>No blocking payload problems were found.</p>'}
      </section>`;
  }
  if (confirm) confirm.disabled = false;
}

function v162PatchDialogFocus() {
  if (HTMLDialogElement.prototype.showModal.v162Patched) return;
  const original = HTMLDialogElement.prototype.showModal;
  const patched = function v162ShowModal() {
    this.v162ReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return original.call(this);
  };
  patched.v162Patched = true;
  HTMLDialogElement.prototype.showModal = patched;
  document.addEventListener('close', (event) => {
    const dialog = event.target;
    if (!(dialog instanceof HTMLDialogElement)) return;
    const target = dialog.v162ReturnFocus;
    if (target?.isConnected) requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }, true);
}

function v162BindGlobalEvents() {
  if (document.body.dataset.v162Events) return;
  document.body.dataset.v162Events = '1';

  els.publishBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (discordState()?.status === 'deleted' && discordState()?.reason === 'destination_missing') {
      openDestinationDialog();
      return;
    }
    v162OpenPublishReview().catch((error) => toast(error.message, 'error'));
  }, true);

  els.blockList?.addEventListener('click', (event) => {
    if (event.target.closest('.block-main, .v140-container-main')) {
      v162SetDrawer(false);
      if (v162Media('(max-width: 960px)')) v162SetView('edit');
    }
  });
  els.entityList?.addEventListener('click', () => v162SetDrawer(false));

  els.inspector?.addEventListener('focusin', (event) => {
    const field = event.target?.closest?.('input, textarea');
    if (field) requestAnimationFrame(() => v162EnhanceMarkdownContext(field));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (v162Ui.drawerOpen) {
      event.preventDefault();
      v162SetDrawer(false);
    }
  });

  window.addEventListener('resize', () => {
    if (!v162Media('(max-width: 1279px)')) v162SetDrawer(false);
  });
}

const v162PreviousMarkDirty = markDirty;
markDirty = function v162MarkDirty(...args) {
  const result = v162PreviousMarkDirty(...args);
  v162ScheduleRecovery();
  return result;
};

const v162PreviousSaveCurrent = saveCurrent;
saveCurrent = async function v162SaveCurrent(...args) {
  const result = await v162PreviousSaveCurrent(...args);
  if (result) v162ClearRecovery();
  return result;
};

const v162PreviousLoadEntity = loadEntity;
loadEntity = async function v162LoadEntity(...args) {
  const result = await v162PreviousLoadEntity(...args);
  v162EnsureAppShell();
  requestAnimationFrame(() => {
    v162EnhanceAccessibility(document);
    v162OfferRecovery();
    v162ScheduleCanonicalValidation();
  });
  return result;
};

const v162PreviousRenderBlockList = renderBlockList;
renderBlockList = function v162RenderBlockList(...args) {
  const result = v162PreviousRenderBlockList(...args);
  v162EnhanceAccessibility(els.blockList || document);
  return result;
};

const v162PreviousRenderInspector = renderInspector;
renderInspector = function v162RenderInspector(...args) {
  const result = v162PreviousRenderInspector(...args);
  v162EnhanceAccessibility(els.inspector || document);
  requestAnimationFrame(() => v162EnhanceMarkdownContext());
  return result;
};

const v162PreviousRenderPreview = renderPreview;
renderPreview = function v162RenderPreview(...args) {
  const result = v162PreviousRenderPreview(...args);
  v162ScheduleCanonicalValidation();
  return result;
};

const v162PreviousRenderEditorMeta = renderEditorMeta;
renderEditorMeta = function v162RenderEditorMeta(...args) {
  const result = v162PreviousRenderEditorMeta(...args);
  v162EnsureAppShell();
  return result;
};

function v162Init() {
  document.body.classList.add('v162-ui-foundation');
  document.body.dataset.twView = v162Ui.view;
  document.body.dataset.twPreviewWidth = v162Ui.previewWidth;
  document.title = `Timewizzard Web Builder v${V162_VERSION}`;
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = `v${V162_VERSION} · Cross-platform editor`;
  v162PatchDialogFocus();
  v162EnsureAppShell();
  v162BindGlobalEvents();
  v162EnhanceAccessibility(document);
  v162EnhanceMarkdownContext();
  v162ScheduleCanonicalValidation();
}

v162Init();
