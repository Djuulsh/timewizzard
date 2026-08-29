// Timewizzard v1.5.8 — whole-row Pointer Events drag + block-only movement controls.
// Desktop users can drag from anywhere on a block row/header (except interactive
// controls). Click/tap-to-move remains available from the :: grip. Inspector
// movement is intentionally limited to the explicit Move to POST root action.

function v158InteractiveTarget(target) {
  return target?.closest?.('button,a,input,select,textarea,label,[contenteditable="true"],[role="button"]') || null;
}

function v158MoveBar(target) {
  if (!target || !els.blockList) return null;
  const content = target.closest?.('#blockList .block-card[data-block-id]');
  if (content && els.blockList.contains(content)) return content;
  const containerHead = target.closest?.('#blockList .v140-container-head');
  if (containerHead && els.blockList.contains(containerHead)) return containerHead;
  return null;
}

function v158SourceIdFromBar(bar) {
  const owner = bar?.closest?.('[data-block-id]');
  const blockId = owner?.dataset.blockId;
  return blockId && v140Find(blockId) ? blockId : null;
}

// v1.5.7 already owns pointermove/pointerup and the safe shared move core.
// This capture listener only widens the pointer-down activation area from the
// grip to the whole visual block bar. No DOM re-render happens during drag.
document.addEventListener('pointerdown', (event) => {
  if (!v157PrecisePointer(event) || event.button !== 0 || !event.isPrimary) return;
  if (v157Ui.pointerId !== null) return; // the :: grip was already handled by v1.5.7.
  if (v158InteractiveTarget(event.target)) return;

  const bar = v158MoveBar(event.target);
  if (!bar) return;
  const sourceId = v158SourceIdFromBar(bar);
  if (!sourceId) return;

  v157Ui.pointerId = event.pointerId;
  v157Ui.sourceId = sourceId;
  v157Ui.handle = bar;
  v157Ui.startX = event.clientX;
  v157Ui.startY = event.clientY;
  v157Ui.dragging = false;
  v157Ui.hover = null;
  try { bar.setPointerCapture?.(event.pointerId); } catch {}
}, true);

// A completed drag may generate a synthetic click after pointerup. v1.5.7
// suppresses that click for grips; this extends the guard to whole-row drags.
document.addEventListener('click', (event) => {
  if (performance.now() > v157Ui.suppressClickUntil) return;
  const bar = v158MoveBar(event.target);
  if (!bar) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

function v158RemoveInspectorMoveHandle() {
  const head = els.inspector?.querySelector('.v153-inspector-head');
  if (!head) return;
  head.querySelector('.v153-inspector-drag')?.remove();
  head.classList.add('v158-inspector-no-drag');
}

function v158RefreshBlockMoveUi() {
  const fine = window.matchMedia?.('(pointer: fine)')?.matches || false;
  els.blockList?.querySelectorAll('.drag-handle.v156-click-move-handle').forEach((handle) => {
    handle.textContent = '::';
    handle.title = fine
      ? 'Drag the block row to move · click :: to choose destination'
      : 'Tap :: to move this block';
    handle.setAttribute('aria-label', fine
      ? 'Move block by dragging the row or clicking this grip'
      : 'Move block');
  });
  v158RemoveInspectorMoveHandle();
}

const v158PreviousRenderBlockList = renderBlockList;
renderBlockList = function v158RenderBlockList() {
  const result = v158PreviousRenderBlockList();
  v158RefreshBlockMoveUi();
  return result;
};

const v158PreviousRenderInspector = renderInspector;
renderInspector = function v158RenderInspector() {
  const result = v158PreviousRenderInspector();
  v158RemoveInspectorMoveHandle();
  return result;
};

function v158Init() {
  v158RefreshBlockMoveUi();
  v158RemoveInspectorMoveHandle();
  document.body.classList.add('v158-whole-row-drag');
  document.title = 'Timewizzard Web Builder v1.5.8';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.8 · Whole-row drag + click-to-move';
}

v158Init();
