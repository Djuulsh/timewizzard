// Timewizzard v1.3.2 — multi-container editor, compact legacy profile list and template polish.

TYPE_INFO.container = ['🧱', 'Embed / Container'];
TYPE_INFO.profile_open_list = ['📋', 'MerfinUI Profile List (legacy)'];

function v132ProfileListContent() {
  const resolutions = (state.bootstrap?.resolutions || []).map((item) => `**${item.name}**`).join(' · ');
  const lines = (state.bootstrap?.classes || []).map((wowClass) => {
    const emoji = wowClass.emojiName && wowClass.emojiId ? `<:${wowClass.emojiName}:${wowClass.emojiId}> ` : '';
    return `${emoji}**${wowClass.name}** — ${resolutions}`;
  });
  return ['### MerfinUI profiles', ...lines].join('\n');
}

function v132EnsureAddButton() {
  const grid = document.querySelector('.add-grid');
  if (!grid || grid.querySelector('[data-v132-add-container]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.v132AddContainer = '1';
  button.textContent = '🧱 Embed / Container';
  button.title = 'Start a new Components V2 container inside the same Discord message.';
  button.addEventListener('click', () => {
    if (!state.entity) return;
    if (state.entity.builder.blocks.length >= 25) return toast('The builder can contain at most 25 blocks.', 'error');
    pushUndo();
    const block = {
      id: shortId(3),
      type: 'container',
      label: `Embed ${state.entity.builder.blocks.filter((item) => item.type === 'container').length + 2}`,
      accentColor: state.entity.builder.accentColor
    };
    state.entity.builder.blocks.push(block);
    state.selectedBlockId = block.id;
    markDirty();
    renderBlockList();
    renderInspector();
  });
  const separator = grid.querySelector('[data-add="separator"]');
  separator?.insertAdjacentElement('afterend', button);

  const legacy = grid.querySelector('[data-add="profile_open_list"]');
  if (legacy) legacy.textContent = '📋 Legacy Profile List';
}

const v132OriginalBlockSummary = blockSummary;
blockSummary = function v132BlockSummary(block) {
  if (block?.type === 'container') return `${block.label || 'New embed'} · ${colorHex(block.accentColor)}`;
  if (block?.type === 'profile_open_list') return 'Compact profile matrix · no buttons';
  return v132OriginalBlockSummary(block);
};

const v132OriginalRenderInspector = renderInspector;
renderInspector = function v132RenderInspector() {
  const block = selectedBlock();
  if (block?.type === 'container') {
    const info = TYPE_INFO.container;
    els.inspector.innerHTML = `<div class="inspector-card"><h3>${info[0]} ${info[1]}</h3><p class="v132-container-note">Starts a new Discord Components V2 container. Every following block stays inside this embed until the next Embed / Container marker.</p><label>Editor label<input id="v132ContainerLabel" maxlength="80" value="${escapeAttr(block.label || 'New embed')}"></label><label>Accent color<input id="v132ContainerColor" type="color" value="${colorHex(block.accentColor)}"></label><div class="v132-color-line"><span>Published accent</span><code>${colorHex(block.accentColor).toUpperCase()}</code></div></div>`;
    bindInput($('#v132ContainerLabel', els.inspector), (event) => { block.label = event.target.value; markDirty(); renderBlockList(); });
    bind('#v132ContainerColor', 'input', (event) => {
      beginInputEdit();
      block.accentColor = Number.parseInt(event.target.value.slice(1), 16);
      const code = $('.v132-color-line code', els.inspector);
      if (code) code.textContent = event.target.value.toUpperCase();
      markDirty();
    });
    bind('#v132ContainerColor', 'change', endInputEdit);
    return;
  }

  v132OriginalRenderInspector();
  if (block?.type === 'profile_open_list') {
    const paragraph = els.inspector.querySelector('.inspector-card > p');
    if (paragraph) paragraph.textContent = 'Compact legacy profile matrix. Open buttons have been removed so the list uses one Text Display and can stay in the same Discord message.';
  }
};

const v132OriginalRenderPreviewBlock = renderPreviewBlock;
renderPreviewBlock = function v132RenderPreviewBlock(block) {
  if (block?.type === 'container') return '';
  if (block?.type === 'profile_open_list') return `<div class="preview-block preview-text">${renderMarkdown(v132ProfileListContent())}</div>`;
  return v132OriginalRenderPreviewBlock(block);
};

const v132OriginalUnitList = unitList;
unitList = function v132UnitList(block) {
  if (block?.type === 'container') return [{ count: 1, text: 0 }];
  if (block?.type === 'profile_open_list') {
    const text = v132ProfileListContent();
    return [{ count: 1, text: text.length }];
  }
  return v132OriginalUnitList(block);
};

function v132PreviewGroups() {
  const groups = [];
  let current = { accentColor: state.entity.builder.accentColor, label: 'Primary embed', blocks: [] };
  for (const block of state.entity.builder.blocks) {
    if (block.type === 'container') {
      if (current.blocks.length) groups.push(current);
      current = { accentColor: block.accentColor ?? state.entity.builder.accentColor, label: block.label || 'Embed', blocks: [] };
      continue;
    }
    current.blocks.push(block);
  }
  if (current.blocks.length) groups.push(current);
  return groups;
}

renderPreview = function v132RenderPreview() {
  if (!state.entity) {
    els.previewContent.className = 'discord-container empty-preview';
    els.previewContent.textContent = 'Select a post to preview.';
    els.previewStats.textContent = '—';
    return;
  }
  const stats = liveStats();
  const groups = v132PreviewGroups();
  els.previewContent.className = `discord-container${groups.length > 1 ? ' v132-multi-container' : ''}`;
  els.previewContent.style.setProperty('--preview-accent', colorHex(state.entity.builder.accentColor));
  els.previewContent.innerHTML = groups.length
    ? groups.map((group) => `<div class="v132-preview-container" style="--v132-container-accent:${colorHex(group.accentColor)}"><div class="v132-preview-container-label">${escapeHtml(group.label)}</div>${group.blocks.map(renderPreviewBlock).join('')}</div>`).join('')
    : '<div class="empty-preview">Add a content block to start.</div>';
  els.previewStats.textContent = `${state.entity.builder.blocks.length} blocks · ${groups.length} embed${groups.length === 1 ? '' : 's'} · ${stats.messages} msg`;
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

v132EnsureAddButton();
document.title = 'Timewizzard Web Builder v1.3.2';
const v132BrandSmall = document.querySelector('.brand small');
if (v132BrandSmall) v132BrandSmall.textContent = 'v1.3.2 · Templates + multi-embed containers';
