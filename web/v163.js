// Timewizzard v1.7.0 — compact editing + reliable workspace navigation.
// Keeps one Posts entry point, fixes top-layer menu behaviour, preserves the
// Preview return path and keeps the Inspector larger than the Block tree.

const V163_VERSION = '1.7.0';
const V163_MORE_ACTIONS = [
  ['v131OpenDiscordBtn', '↗ Open in Discord'],
  ['v131CopyDiscordBtn', '⧉ Copy post link'],
  ['destinationBtn', 'Destination'],
  ['historyBtn', 'History'],
  ['cloneBtn', 'Clone'],
  ['exportBtn', 'Export JSON'],
  ['deleteBtn', 'Delete']
];

function v163EnsurePreviewBack() {
  const controls = document.getElementById('v162PreviewControls');
  if (!controls || document.getElementById('v163PreviewBack')) return;
  const button = document.createElement('button');
  button.id = 'v163PreviewBack';
  button.type = 'button';
  button.className = 'btn ghost v163-preview-back';
  button.textContent = '← Edit';
  button.setAttribute('aria-label', 'Return to editor');
  button.addEventListener('click', () => v162SetView('edit', { focus: true }));
  controls.prepend(button);
}

function v163RemoveDuplicatePostsNav() {
  document.querySelector('#v162WorkspaceNav [data-v162-posts-nav]')?.remove();
}

function v163MoreProxyId(targetId) {
  return `v163MoreProxy-${targetId}`;
}

function v163SyncWorkspaceMore() {
  const menu = document.getElementById('v163WorkspaceMore');
  if (!menu) return;
  menu.classList.toggle('hidden', !state.entity);
  for (const [targetId] of V163_MORE_ACTIONS) {
    const original = document.getElementById(targetId);
    const proxy = document.getElementById(v163MoreProxyId(targetId));
    if (!proxy) continue;
    const unavailable = !original || original.classList.contains('hidden');
    proxy.classList.toggle('hidden', unavailable);
    proxy.disabled = unavailable || Boolean(original?.disabled);
  }
}

function v163EnsureWorkspaceMore() {
  const nav = document.getElementById('v162WorkspaceNav');
  if (!nav) return;
  let menu = document.getElementById('v163WorkspaceMore');
  if (!menu) {
    menu = document.createElement('details');
    menu.id = 'v163WorkspaceMore';
    menu.className = 'v163-workspace-more';
    menu.innerHTML = `
      <summary class="btn ghost" aria-label="More post actions" title="More post actions">•••</summary>
      <div class="v163-workspace-more-panel">
        <strong>Post actions</strong>
        <div class="v163-workspace-more-actions"></div>
      </div>`;
    nav.append(menu);

    const host = menu.querySelector('.v163-workspace-more-actions');
    for (const [targetId, label] of V163_MORE_ACTIONS) {
      const proxy = document.createElement('button');
      proxy.id = v163MoreProxyId(targetId);
      proxy.type = 'button';
      proxy.className = `btn ghost v163-more-action${targetId === 'deleteBtn' ? ' danger' : ''}`;
      proxy.textContent = label;
      proxy.addEventListener('click', () => {
        const original = document.getElementById(targetId);
        if (!original || original.classList.contains('hidden') || original.disabled) return;
        menu.open = false;
        original.click();
      });
      host?.append(proxy);
    }

    document.addEventListener('click', (event) => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  }
  v163SyncWorkspaceMore();
}

function v163EnsureNavigation() {
  v162EnsureAppShell();
  v163RemoveDuplicatePostsNav();
  v163EnsurePreviewBack();
  v163EnsureWorkspaceMore();
}

const v163PreviousRenderEditorMeta = renderEditorMeta;
renderEditorMeta = function v163RenderEditorMeta(...args) {
  const result = v163PreviousRenderEditorMeta(...args);
  v163EnsureNavigation();
  v163SyncWorkspaceMore();
  return result;
};

const v163PreviousLoadEntity = loadEntity;
loadEntity = async function v163LoadEntity(...args) {
  const result = await v163PreviousLoadEntity(...args);
  v163EnsureNavigation();
  return result;
};

window.addEventListener('resize', () => {
  const menu = document.getElementById('v163WorkspaceMore');
  if (menu && !v162Media('(max-width: 960px)')) menu.open = false;
});

function v163Init() {
  document.body.classList.add('v163-compact-editor');
  document.title = `Timewizzard Web Builder v${V163_VERSION}`;
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = `v${V163_VERSION} · Compact cross-platform editor`;
  v163EnsureNavigation();
  v163SyncWorkspaceMore();
}

v163Init();
