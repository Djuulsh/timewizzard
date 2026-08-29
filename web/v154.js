// Timewizzard v1.5.4 — Heading layout polish + complete block-tree drag flow.

function v154PolishHeadingInspector() {
  const found = v140Find(state.selectedBlockId);
  const block = found?.block;
  if (block?.type !== 'heading') return;

  const card = els.inspector.querySelector('.inspector-card');
  if (!card) return;

  // The visual emoji picker is self-explanatory now; remove the old explanatory
  // helper and the separate None button. None lives inside the emoji picker.
  card.querySelector('.v150-help')?.remove();
  card.querySelector('#v151HeadingEmojiNone')?.remove();

  const content = card.querySelector('.v153-content');
  const appearance = card.querySelector('.v153-appearance');
  const titleLabel = v153LabelFor(card, 'v150HeadingTitle');
  const subtitleLabel = v153LabelFor(card, 'v150HeadingSubtitle');
  const controls = card.querySelector('.v151-heading-top-row');

  if (content && titleLabel && controls) {
    let row = content.querySelector('.v154-heading-primary-grid');
    if (!row) {
      row = document.createElement('div');
      row.className = 'v154-heading-primary-grid';
      const sectionLabel = content.querySelector('.v153-section-label');
      sectionLabel?.insertAdjacentElement('afterend', row);
    }
    controls.classList.add('v154-heading-controls');
    row.append(titleLabel, controls);
    if (subtitleLabel) content.append(subtitleLabel);
  }

  // Level + Emoji now sit next to Title, so a separate Appearance section would
  // only add visual noise.
  appearance?.remove();
}

const v154PreviousOpenHeadingEmojiPicker = v151OpenHeadingEmojiPicker;
v151OpenHeadingEmojiPicker = async function v154OpenHeadingEmojiPicker(block) {
  await v154PreviousOpenHeadingEmojiPicker(block);
  const dialog = document.getElementById('v131PickerDialog');
  if (!dialog?.open || !dialog.classList.contains('v151-emoji-only')) return;

  dialog.querySelector('.v154-emoji-none-row')?.remove();
  const description = dialog.querySelector('.dialog-head p');
  if (description) description.textContent = 'Choose one Discord or server emoji, or choose None for a heading without an emoji.';

  const noneRow = document.createElement('div');
  noneRow.className = 'v154-emoji-none-row';
  noneRow.innerHTML = `
    <button type="button" class="v154-emoji-none-choice">
      <span class="v154-emoji-none-icon">∅</span>
      <span><strong>None</strong><small>Use no emoji in this heading</small></span>
    </button>`;
  const hint = dialog.querySelector('#v131PickerHint');
  hint?.insertAdjacentElement('afterend', noneRow);

  noneRow.querySelector('button')?.addEventListener('click', () => {
    if (block.emoji) {
      pushUndo();
      block.emoji = '';
      markDirty();
      renderPreview();
      renderBlockList();
    }
    dialog.close();
    renderInspector();
  });
  dialog.addEventListener('close', () => noneRow.remove(), { once: true });
};

function v154DragCard(event) {
  const node = event.target?.closest?.('[data-block-id]');
  if (!node || !els.blockList?.contains(node) || node.classList.contains('v153-root-dropzone')) return null;
  const blockId = node.dataset.blockId;
  return blockId && v140Find(blockId) ? { node, blockId } : null;
}

function v154BindBlockTreeDrag() {
  if (!els.blockList || els.blockList.dataset.v154DragBound) return;
  els.blockList.dataset.v154DragBound = '1';

  els.blockList.addEventListener('dragstart', (event) => {
    const dragged = v154DragCard(event);
    if (!dragged) return;
    document.body.classList.add('v153-dragging-block', 'v154-tree-dragging');
    dragged.node.classList.add('v154-tree-source');
  });

  const cleanup = () => {
    document.body.classList.remove('v153-dragging-block', 'v154-tree-dragging');
    els.blockList.querySelectorAll('.v154-tree-source').forEach((node) => node.classList.remove('v154-tree-source'));
    els.blockList.querySelectorAll('.v154-tree-drop-active').forEach((node) => node.classList.remove('v154-tree-drop-active'));
  };
  els.blockList.addEventListener('dragend', cleanup);
  els.blockList.addEventListener('drop', () => requestAnimationFrame(cleanup));

  // Make container bodies visibly usable as drop targets while dragging a block
  // from the Blocks panel. Existing v1.4 movement logic still performs the move.
  els.blockList.addEventListener('dragover', (event) => {
    const containerBody = event.target?.closest?.('.v140-container-children');
    els.blockList.querySelectorAll('.v154-tree-drop-active').forEach((node) => {
      if (node !== containerBody) node.classList.remove('v154-tree-drop-active');
    });
    containerBody?.classList.add('v154-tree-drop-active');
  });
}

function v154RefreshDragHints() {
  els.blockList?.querySelectorAll('.drag-handle').forEach((handle) => {
    handle.title = 'Drag to reorder, move into another Container, or move out to POST root';
  });
}

const v154PreviousRenderInspector = renderInspector;
renderInspector = function v154RenderInspector() {
  const result = v154PreviousRenderInspector();
  v154PolishHeadingInspector();
  return result;
};

const v154PreviousRenderBlockList = renderBlockList;
renderBlockList = function v154RenderBlockList() {
  const result = v154PreviousRenderBlockList();
  v154RefreshDragHints();
  return result;
};

function v154Init() {
  v154BindBlockTreeDrag();
  v154RefreshDragHints();
  v154PolishHeadingInspector();
  document.title = 'Timewizzard Web Builder v1.5.4';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.4 · Heading + drag UX polish';
}

v154Init();
