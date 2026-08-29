// Timewizzard v1.5.3 — Inspector & Editor UX pass.
// Focus: content-first editing, non-overlapping character counters, clearer
// block location/movement, inline validation and two-way preview selection.

const V153_TEXT_LIMITS = Object.freeze({
  iContent: 4000,
  iThumbText: 4000,
  iText: 4000,
  iActionContent: 3700,
  v140YoutubeDesc: 1500,
  v150HeadingSubtitle: 1000,
  v150CalloutContent: 3000,
  v150EventDescription: 1500,
  v150EventLocation: 300,
  v150CountdownText: 800,
  v150CodeValue: 3500,
  v150ProgressNote: 500
});

const v153Ui = {
  advancedOpen: new Set(),
  inspectorDragId: null
};

function v153BlockInfo(block) {
  return TYPE_INFO[block?.type] || ['▫️', block?.type || 'Block'];
}

function v153LabelFor(card, id) {
  const element = card?.querySelector(`#${id}`);
  return element?.closest('label') || null;
}

function v153UniqueNodes(nodes) {
  const filtered = nodes.filter(Boolean);
  return filtered.filter((node, index) => !filtered.some((other, otherIndex) => otherIndex !== index && other.contains?.(node)));
}

function v153Section(card, title, nodes, { advanced = false } = {}) {
  const unique = v153UniqueNodes(nodes);
  if (!unique.length) return null;

  if (advanced) {
    const details = document.createElement('details');
    details.className = 'v153-advanced';
    details.open = v153Ui.advancedOpen.has(card.dataset.v153BlockType || '');
    details.innerHTML = '<summary>Advanced</summary><div class="v153-advanced-body"></div>';
    const body = details.querySelector('.v153-advanced-body');
    unique.forEach((node) => body.append(node));
    details.addEventListener('toggle', () => {
      const key = card.dataset.v153BlockType || '';
      if (!key) return;
      if (details.open) v153Ui.advancedOpen.add(key);
      else v153Ui.advancedOpen.delete(key);
    });
    card.append(details);
    return details;
  }

  const section = document.createElement('section');
  section.className = `v153-inspector-section v153-${title.toLowerCase()}`;
  section.innerHTML = `<div class="v153-section-label">${escapeHtml(title)}</div>`;
  unique.forEach((node) => section.append(node));
  card.append(section);
  return section;
}

function v153OrganizeInspector(block) {
  const card = els.inspector.querySelector('.inspector-card');
  if (!card || !block) return;
  card.dataset.v153BlockType = block.type;

  // Existing per-version breadcrumbs are replaced by the stable Inspector header.
  els.inspector.querySelectorAll('.v140-breadcrumb').forEach((node) => node.remove());

  const help = card.querySelector('.markdown-help');
  const compactHelp = card.querySelector('.v150-help');
  const calloutNote = card.querySelector('.v140-field-note');

  switch (block.type) {
    case 'text':
      v153Section(card, 'Content', [v153LabelFor(card, 'iContent'), help]);
      break;
    case 'heading':
      v153Section(card, 'Content', [v153LabelFor(card, 'v150HeadingTitle'), v153LabelFor(card, 'v150HeadingSubtitle')]);
      v153Section(card, 'Appearance', [card.querySelector('.v151-heading-top-row')]);
      break;
    case 'callout':
      v153Section(card, 'Content', [v153LabelFor(card, 'v150CalloutTitle'), v153LabelFor(card, 'v150CalloutContent')]);
      v153Section(card, 'Appearance', [v153LabelFor(card, 'v150CalloutTone')]);
      break;
    case 'image':
      v153Section(card, 'Content', [v153LabelFor(card, 'iUrl')]);
      v153Section(card, 'Advanced', [v153LabelFor(card, 'iDescription'), v153LabelFor(card, 'iSpoiler')], { advanced: true });
      break;
    case 'thumbnail':
      v153Section(card, 'Content', [v153LabelFor(card, 'iThumbText'), v153LabelFor(card, 'iUrl'), help]);
      v153Section(card, 'Advanced', [v153LabelFor(card, 'iDescription'), v153LabelFor(card, 'iSpoiler')], { advanced: true });
      break;
    case 'separator':
      v153Section(card, 'Appearance', [v153LabelFor(card, 'iSpacing'), card.querySelector('.separator-size-demo'), v153LabelFor(card, 'iDivider')]);
      break;
    case 'open':
      v153Section(card, 'Content', [v153LabelFor(card, 'iText'), v153LabelFor(card, 'iLabel'), v153LabelFor(card, 'iActionTitle'), v153LabelFor(card, 'iActionContent')]);
      v153Section(card, 'Advanced', [card.querySelector('.nested-editor')], { advanced: true });
      break;
    case 'link':
      v153Section(card, 'Content', [v153LabelFor(card, 'iText'), v153LabelFor(card, 'iLabel'), v153LabelFor(card, 'iUrl')]);
      break;
    case 'youtube':
      v153Section(card, 'Content', [calloutNote, v153LabelFor(card, 'v140YoutubeUrl'), card.querySelector('.v140-youtube-status'), v153LabelFor(card, 'v140YoutubeTitle'), v153LabelFor(card, 'v140YoutubeDesc')]);
      v153Section(card, 'Appearance', [card.querySelector('.v140-check-row'), v153LabelFor(card, 'v140YoutubeLabel')]);
      break;
    case 'event':
      v153Section(card, 'Content', [v153LabelFor(card, 'v150EventTitle'), v153LabelFor(card, 'v150EventDescription'), card.querySelector('.v150-inline-fields'), v153LabelFor(card, 'v150EventLocation'), compactHelp]);
      break;
    case 'countdown':
      v153Section(card, 'Content', [v153LabelFor(card, 'v150CountdownTitle'), v153LabelFor(card, 'v150CountdownText'), v153LabelFor(card, 'v150CountdownTarget'), card.querySelector('.v150-live-sample')]);
      break;
    case 'code':
      v153Section(card, 'Content', [card.querySelector('.v150-inline-fields'), v153LabelFor(card, 'v150CodeValue')]);
      break;
    case 'progress':
      v153Section(card, 'Content', [v153LabelFor(card, 'v150ProgressLabel'), card.querySelector('.v150-triple-fields'), card.querySelector('.compact-check'), v153LabelFor(card, 'v150ProgressNote'), card.querySelector('.v150-live-sample')]);
      break;
    case 'checklist':
      v153Section(card, 'Content', [v153LabelFor(card, 'v150ChecklistTitle'), v153LabelFor(card, 'v150ChecklistItems'), compactHelp]);
      break;
    case 'steps':
      v153Section(card, 'Content', [v153LabelFor(card, 'v150StepsTitle'), v153LabelFor(card, 'v150StepsItems'), compactHelp]);
      break;
    case 'facts':
      v153Section(card, 'Content', [v153LabelFor(card, 'v150FactsTitle'), v153LabelFor(card, 'v150FactsItems'), compactHelp]);
      break;
    case 'button_row':
      v153Section(card, 'Content', [calloutNote, v153LabelFor(card, 'v150ButtonRows'), compactHelp]);
      break;
    default:
      break;
  }
}

function v153ToolbarTarget(toolbar) {
  const discordInsert = toolbar.querySelector('[data-discord-insert]');
  if (discordInsert?.dataset.discordInsert) return discordInsert.dataset.discordInsert;
  const formatButton = toolbar.querySelector('[data-format-target]');
  if (formatButton?.dataset.formatTarget) return formatButton.dataset.formatTarget;
  return null;
}

function v153MoveMarkdownToolbars() {
  els.inspector.querySelectorAll('.markdown-toolbar').forEach((toolbar) => {
    const targetId = v153ToolbarTarget(toolbar);
    const textarea = targetId ? document.getElementById(targetId) : null;
    const label = textarea?.closest('label');
    if (!label) return;
    label.insertAdjacentElement('afterend', toolbar);
    toolbar.classList.add('v153-toolbar-below');
  });
}

function v153TextareaLimit(textarea) {
  if (!textarea) return null;
  if (textarea.maxLength > 0 && textarea.maxLength < 100_000) return textarea.maxLength;
  if (V153_TEXT_LIMITS[textarea.id]) return V153_TEXT_LIMITS[textarea.id];
  if (textarea.matches('[data-nested-content], [data-option-response]')) return 3700;
  return null;
}

function v153CounterState(length, limit) {
  const ratio = limit > 0 ? length / limit : 0;
  if (ratio >= 1) return 'danger';
  if (ratio >= 0.95) return 'warning';
  if (ratio >= 0.8) return 'caution';
  return 'neutral';
}

function v153FormatCount(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function v153Autosize(textarea) {
  if (!textarea) return;
  const rows = Math.max(2, Number(textarea.getAttribute('rows') || 4));
  const minHeight = Math.min(220, Math.max(66, rows * 20 + 18));
  const maxHeight = textarea.id === 'v150CodeValue' ? 380 : 320;
  textarea.style.height = 'auto';
  const next = Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight));
  textarea.style.height = `${next}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

function v153EnhanceTextarea(textarea) {
  if (!textarea || textarea.dataset.v153Enhanced) return;
  textarea.dataset.v153Enhanced = '1';

  const shell = document.createElement('div');
  shell.className = 'v153-textarea-shell';
  textarea.parentNode.insertBefore(shell, textarea);
  shell.append(textarea);

  const limit = v153TextareaLimit(textarea);
  let counter = null;
  if (limit) {
    const footer = document.createElement('div');
    footer.className = 'v153-textarea-footer';
    counter = document.createElement('span');
    counter.className = 'v153-char-counter';
    footer.append(counter);
    shell.append(footer);
  }

  const sync = () => {
    v153Autosize(textarea);
    if (!counter || !limit) return;
    const length = textarea.value.length;
    counter.className = `v153-char-counter ${v153CounterState(length, limit)}`;
    counter.textContent = `${v153FormatCount(length)} / ${v153FormatCount(limit)}`;
    shell.classList.toggle('over-limit', length > limit);
  };
  textarea.addEventListener('input', sync);
  sync();
}

function v153EnhanceTextareas() {
  els.inspector.querySelectorAll('textarea').forEach(v153EnhanceTextarea);
}

function v153Feedback(input, validate) {
  if (!input || input.dataset.v153Validation) return;
  input.dataset.v153Validation = '1';
  const feedback = document.createElement('div');
  feedback.className = 'v153-field-feedback hidden';
  const host = input.closest('label') || input.parentElement;
  host?.append(feedback);

  const sync = () => {
    const message = validate(input.value);
    feedback.textContent = message || '';
    feedback.classList.toggle('hidden', !message);
    input.classList.toggle('v153-invalid', Boolean(message));
  };
  input.addEventListener('input', sync);
  input.addEventListener('change', sync);
  sync();
}

function v153ValidHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function v153InlineValidation(block) {
  if (!block) return;
  const urlInput = els.inspector.querySelector('#iUrl');
  if (urlInput && ['image', 'thumbnail', 'link'].includes(block.type)) {
    v153Feedback(urlInput, (value) => v153ValidHttpUrl(value) ? '' : 'Enter a valid http(s) URL.');
  }

  if (block.type === 'button_row') {
    const rows = els.inspector.querySelector('#v150ButtonRows');
    v153Feedback(rows, (value) => {
      const lines = String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return 'Add at least one button.';
      if (lines.length > 5) return 'A Button Row can contain at most five buttons.';
      for (const line of lines) {
        const parts = line.split('|').map((part) => part.trim());
        if (parts.length < 2 || !parts[0] || !v153ValidHttpUrl(parts.slice(1).join('|'))) return 'Use: Label | https://... for each button.';
      }
      return '';
    });
  }

  if (block.type === 'event') {
    const start = els.inspector.querySelector('#v150EventStart');
    const end = els.inspector.querySelector('#v150EventEnd');
    if (end) {
      v153Feedback(end, () => {
        if (!end.value) return '';
        const startTime = new Date(start?.value || '').getTime();
        const endTime = new Date(end.value).getTime();
        return Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime ? '' : 'End time must be after the start time.';
      });
      start?.addEventListener('change', () => end.dispatchEvent(new Event('change')));
    }
  }
}

function v153MoveToRoot(blockId) {
  const found = v140Find(blockId);
  if (!found?.parent) return;
  if (v140Roots().length >= 25) return toast('The POST root already has 25 blocks/containers.', 'error');

  pushUndo();
  const [block] = found.list.splice(found.index, 1);
  const containerIndex = v140Roots().findIndex((item) => item.id === found.parent.id);
  v140Roots().splice(containerIndex + 1, 0, block);
  state.selectedBlockId = block.id;
  markDirty();
  renderBlockList();
  renderInspector();
  renderPreview();
}

function v153InspectorHeader(block, found) {
  if (!block || !found) return;
  els.inspector.querySelectorAll('.v153-inspector-head').forEach((node) => node.remove());
  const [icon, name] = v153BlockInfo(block);
  const header = document.createElement('div');
  header.className = 'v153-inspector-head';
  header.dataset.blockId = block.id;
  header.innerHTML = `
    <div class="v153-inspector-drag" draggable="true" title="Drag this block to another position">⋮⋮</div>
    <div class="v153-inspector-identity">
      <strong>${icon} ${escapeHtml(name)}</strong>
      <small>${found.parent ? `Inside <b>🧱 ${escapeHtml(found.parent.label || 'Container')}</b>` : '<b>POST root</b>'}</small>
    </div>
    <div class="v153-inspector-head-actions">
      ${found.parent ? '<button type="button" class="btn ghost v153-move-root">↗ Move to POST root</button>' : ''}
    </div>`;

  const drag = header.querySelector('.v153-inspector-drag');
  drag.addEventListener('dragstart', (event) => {
    v153Ui.inspectorDragId = block.id;
    v140Ui.draggedId = block.id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', block.id);
    document.body.classList.add('v153-dragging-block');
    header.classList.add('dragging');
  });
  drag.addEventListener('dragend', () => {
    v153Ui.inspectorDragId = null;
    v140Ui.draggedId = null;
    document.body.classList.remove('v153-dragging-block');
    header.classList.remove('dragging');
    document.querySelectorAll('.v153-root-dropzone.active').forEach((node) => node.classList.remove('active'));
  });
  header.querySelector('.v153-move-root')?.addEventListener('click', () => v153MoveToRoot(block.id));
  els.inspector.prepend(header);
  els.inspector.classList.add('v153-inspector-enhanced');
}

function v153InstallRootDropZone() {
  if (!els.blockList || els.blockList.querySelector('.v153-root-dropzone')) return;
  const zone = document.createElement('div');
  zone.className = 'v153-root-dropzone';
  zone.innerHTML = '<strong>POST root</strong><span>Drop block here to move it out of a Container</span>';
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    zone.classList.add('active');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('active'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    zone.classList.remove('active');
    const blockId = event.dataTransfer.getData('text/plain') || v153Ui.inspectorDragId || v140Ui.draggedId;
    if (blockId) v153MoveToRoot(blockId);
  });
  els.blockList.prepend(zone);
}

function v153AnnotatePreview() {
  if (!els.previewContent?.classList.contains('v140-root-post')) return;
  els.previewContent.querySelectorAll('[data-v153-block-id], [data-v153-container-id]').forEach((node) => {
    delete node.dataset.v153BlockId;
    delete node.dataset.v153ContainerId;
  });

  const rootNodes = [...els.previewContent.children].filter((node) => !node.classList.contains('empty-preview'));
  let rootIndex = 0;
  for (const block of v140Roots()) {
    if (block.type === 'container' && !(block.children || []).length) continue;
    const node = rootNodes[rootIndex++];
    if (!node) break;

    if (block.type !== 'container') {
      node.dataset.v153BlockId = block.id;
      continue;
    }

    node.dataset.v153ContainerId = block.id;
    const childNodes = [...node.children].filter((child) => !child.classList.contains('v140-preview-label'));
    (block.children || []).forEach((child, index) => {
      if (childNodes[index]) childNodes[index].dataset.v153BlockId = child.id;
    });
  }
  v153SyncPreviewSelection();
}

function v153SyncPreviewSelection() {
  if (!els.previewContent) return;
  els.previewContent.querySelectorAll('.v153-preview-selected').forEach((node) => node.classList.remove('v153-preview-selected'));
  const id = state.selectedBlockId;
  if (!id) return;
  for (const node of els.previewContent.querySelectorAll('[data-v153-block-id], [data-v153-container-id]')) {
    if (node.dataset.v153BlockId === id || node.dataset.v153ContainerId === id) {
      node.classList.add('v153-preview-selected');
      break;
    }
  }
}

function v153BindPreviewSelection() {
  if (!els.previewContent || els.previewContent.dataset.v153SelectionBound) return;
  els.previewContent.dataset.v153SelectionBound = '1';
  els.previewContent.addEventListener('click', (event) => {
    const blockNode = event.target.closest('[data-v153-block-id]');
    const containerNode = event.target.closest('[data-v153-container-id]');
    const blockId = blockNode?.dataset.v153BlockId || containerNode?.dataset.v153ContainerId;
    if (!blockId || !v140Find(blockId)) return;
    state.selectedBlockId = blockId;
    renderBlockList();
    renderInspector();
    v153SyncPreviewSelection();
  });
}

function v153PolishInspector() {
  const found = v140Find(state.selectedBlockId);
  const block = found?.block;
  if (!block) {
    v153SyncPreviewSelection();
    return;
  }
  v153OrganizeInspector(block);
  v153MoveMarkdownToolbars();
  v153EnhanceTextareas();
  v153InlineValidation(block);
  v153InspectorHeader(block, found);
  v153SyncPreviewSelection();
}

const v153PreviousRenderInspector = renderInspector;
renderInspector = function v153RenderInspector() {
  const result = v153PreviousRenderInspector();
  v153PolishInspector();
  return result;
};

const v153PreviousRenderBlockList = renderBlockList;
renderBlockList = function v153RenderBlockList() {
  const result = v153PreviousRenderBlockList();
  v153InstallRootDropZone();
  v153SyncPreviewSelection();
  return result;
};

const v153PreviousRenderPreview = renderPreview;
renderPreview = function v153RenderPreview() {
  const result = v153PreviousRenderPreview();
  v153AnnotatePreview();
  return result;
};

function v153Init() {
  v153BindPreviewSelection();
  v153InstallRootDropZone();
  v153AnnotatePreview();
  v153PolishInspector();
  document.title = 'Timewizzard Web Builder v1.5.3';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.3 · Inspector & Editor UX pass';
}

v153Init();
