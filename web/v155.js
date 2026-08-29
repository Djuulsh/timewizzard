// Timewizzard v1.5.5 — touch-friendly tap-to-move block workflow.
// Desktop drag-and-drop remains available. Coarse-pointer/mobile devices use
// a deterministic two-step flow: tap Move on a block, then tap its destination.

const v155Ui = {
  movingId: null,
  coarse: window.matchMedia?.('(pointer: coarse)')?.matches || false
};

function v155MovingFound() {
  return v155Ui.movingId ? v140Find(v155Ui.movingId) : null;
}

function v155BlockName(block) {
  const info = TYPE_INFO[block?.type] || ['▫️', block?.type || 'Block'];
  return `${info[0]} ${info[1]}`;
}

function v155EnsureMoveBanner() {
  let banner = els.blockList?.querySelector('.v155-move-banner');
  if (banner) return banner;
  banner = document.createElement('div');
  banner.className = 'v155-move-banner';
  banner.innerHTML = `
    <div class="v155-move-banner-copy">
      <strong id="v155MoveTitle">Move block</strong>
      <span id="v155MoveHint">Choose a destination.</span>
    </div>
    <button type="button" class="btn ghost" id="v155MoveCancel">Cancel</button>`;
  const rootZone = els.blockList?.querySelector('.v153-root-dropzone');
  if (rootZone) rootZone.insertAdjacentElement('afterend', banner);
  else els.blockList?.prepend(banner);
  banner.querySelector('#v155MoveCancel')?.addEventListener('click', (event) => {
    event.stopPropagation();
    v155CancelMove();
  });
  return banner;
}

function v155SyncMoveUi() {
  if (!els.blockList) return;
  const found = v155MovingFound();
  const banner = v155EnsureMoveBanner();
  const active = Boolean(found);
  document.body.classList.toggle('v155-tap-moving', active);
  banner.classList.toggle('active', active);

  els.blockList.querySelectorAll('[data-block-id]').forEach((node) => {
    node.classList.toggle('v155-move-source', active && node.dataset.blockId === v155Ui.movingId);
    node.classList.toggle('v155-move-target', active && node.dataset.blockId !== v155Ui.movingId);
  });

  const rootZone = els.blockList.querySelector('.v153-root-dropzone');
  rootZone?.classList.toggle('v155-root-tap-target', active);

  if (active) {
    const block = found.block;
    const title = banner.querySelector('#v155MoveTitle');
    const hint = banner.querySelector('#v155MoveHint');
    if (title) title.textContent = `Moving ${v155BlockName(block)}`;
    if (hint) hint.textContent = block.type === 'container'
      ? 'Tap another root block/container to place before it, or POST root to move to the end.'
      : 'Tap a block to place before it, tap a Container to move inside it, or POST root to move out/to the end.';
  }
}

function v155StartMove(blockId) {
  if (!blockId || !v140Find(blockId)) return;
  if (v155Ui.movingId === blockId) return v155CancelMove();
  v155Ui.movingId = blockId;
  state.selectedBlockId = blockId;
  v155SyncMoveUi();
  renderInspector();
}

function v155CancelMove() {
  v155Ui.movingId = null;
  v155SyncMoveUi();
}

function v155MoveToRootEnd(blockId) {
  const found = v140Find(blockId);
  if (!found) return;
  if (found.parent && v140Roots().length >= 25) return toast('The POST root already has 25 blocks/containers.', 'error');
  if (!found.parent && found.index === v140Roots().length - 1) return v155CancelMove();

  pushUndo();
  const [block] = found.list.splice(found.index, 1);
  v140Roots().push(block);
  state.selectedBlockId = block.id;
  markDirty();
  v155Ui.movingId = null;
  renderBlockList();
  renderInspector();
  renderPreview();
}

function v155MoveBefore(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const source = v140Find(sourceId);
  const target = v140Find(targetId);
  if (!source || !target) return;

  // Containers always remain root-level. When a child was tapped, use its
  // parent Container as the root target.
  if (source.block.type === 'container') {
    const rootTarget = target.parent ? v140Find(target.parent.id) : target;
    if (!rootTarget || rootTarget.parent || rootTarget.block.id === sourceId) return;
    pushUndo();
    source.list.splice(source.index, 1);
    let targetIndex = v140Roots().findIndex((item) => item.id === rootTarget.block.id);
    if (source.list === v140Roots() && source.index < targetIndex) targetIndex -= 1;
    v140Roots().splice(Math.max(0, targetIndex), 0, source.block);
  } else {
    // Tapping a Container means "move inside" and appends to that Container.
    if (!target.parent && target.block.type === 'container') {
      if (target.block.children.length >= 25 && source.list !== target.block.children) return toast('This Container already has 25 blocks.', 'error');
      pushUndo();
      source.list.splice(source.index, 1);
      target.block.children.push(source.block);
    } else {
      const destinationList = target.list;
      if (destinationList.length >= 25 && destinationList !== source.list) return toast(target.parent ? 'This Container already has 25 blocks.' : 'The POST root already has 25 blocks/containers.', 'error');
      pushUndo();
      source.list.splice(source.index, 1);
      let destinationIndex = target.index;
      if (destinationList === source.list && source.index < destinationIndex) destinationIndex -= 1;
      destinationList.splice(Math.max(0, destinationIndex), 0, source.block);
    }
  }

  state.selectedBlockId = sourceId;
  v155Ui.movingId = null;
  markDirty();
  renderBlockList();
  renderInspector();
  renderPreview();
}

function v155HandleTapDestination(event) {
  if (!v155Ui.movingId) return false;
  const source = v155MovingFound();
  if (!source) { v155CancelMove(); return false; }

  const rootZone = event.target.closest('.v153-root-dropzone');
  if (rootZone && els.blockList.contains(rootZone)) {
    event.preventDefault();
    event.stopPropagation();
    v155MoveToRootEnd(v155Ui.movingId);
    return true;
  }

  const targetNode = event.target.closest('[data-block-id]');
  if (!targetNode || !els.blockList.contains(targetNode)) return false;
  const targetId = targetNode.dataset.blockId;
  if (!targetId) return false;
  event.preventDefault();
  event.stopPropagation();
  if (targetId === v155Ui.movingId) v155CancelMove();
  else v155MoveBefore(v155Ui.movingId, targetId);
  return true;
}

function v155PrepareTouchCards() {
  if (!els.blockList || !v155Ui.coarse) return;
  els.blockList.querySelectorAll('[data-block-id]').forEach((card) => {
    card.draggable = false;
    const head = card.querySelector('.v140-container-head');
    if (head) head.draggable = false;
    const handle = card.querySelector('.drag-handle');
    if (!handle) return;
    handle.classList.add('v155-tap-move-handle');
    handle.title = 'Tap to move this block';
    handle.setAttribute('role', 'button');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-label', 'Move block');
    handle.textContent = '↔';
  });

  const inspectorHandle = els.inspector?.querySelector('.v153-inspector-drag');
  if (inspectorHandle) {
    inspectorHandle.draggable = false;
    inspectorHandle.classList.add('v155-tap-move-handle');
    inspectorHandle.title = 'Tap to move this block';
    inspectorHandle.setAttribute('role', 'button');
    inspectorHandle.setAttribute('tabindex', '0');
    inspectorHandle.textContent = '↔';
  }
}

function v155BindTapMove() {
  if (!els.blockList || els.blockList.dataset.v155TapBound) return;
  els.blockList.dataset.v155TapBound = '1';

  els.blockList.addEventListener('click', (event) => {
    if (!v155Ui.coarse && !v155Ui.movingId) return;
    if (v155HandleTapDestination(event)) return;
    const handle = event.target.closest('.drag-handle');
    if (!handle || !els.blockList.contains(handle)) return;
    const card = handle.closest('[data-block-id]');
    if (!card?.dataset.blockId) return;
    event.preventDefault();
    event.stopPropagation();
    v155StartMove(card.dataset.blockId);
  }, true);

  els.blockList.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const handle = event.target.closest('.v155-tap-move-handle');
    if (!handle) return;
    const card = handle.closest('[data-block-id]');
    if (!card?.dataset.blockId) return;
    event.preventDefault();
    v155StartMove(card.dataset.blockId);
  });

  els.inspector?.addEventListener('click', (event) => {
    if (!v155Ui.coarse) return;
    const handle = event.target.closest('.v153-inspector-drag');
    if (!handle) return;
    const header = handle.closest('[data-block-id]');
    if (!header?.dataset.blockId) return;
    event.preventDefault();
    event.stopPropagation();
    v155StartMove(header.dataset.blockId);
  }, true);
}

const v155PreviousRenderBlockList = renderBlockList;
renderBlockList = function v155RenderBlockList() {
  const result = v155PreviousRenderBlockList();
  v155EnsureMoveBanner();
  v155PrepareTouchCards();
  v155SyncMoveUi();
  return result;
};

const v155PreviousRenderInspector = renderInspector;
renderInspector = function v155RenderInspector() {
  const result = v155PreviousRenderInspector();
  v155PrepareTouchCards();
  return result;
};

function v155Init() {
  v155BindTapMove();
  v155EnsureMoveBanner();
  v155PrepareTouchCards();
  v155SyncMoveUi();
  document.title = 'Timewizzard Web Builder v1.5.5';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.5 · Touch-friendly block movement';
}

v155Init();
