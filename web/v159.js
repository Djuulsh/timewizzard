// Timewizzard v1.5.9 — preserve click-to-edit while keeping whole-row Pointer drag.
// v1.5.8 widened the drag activation area to the whole block row. The row was
// pointer-captured immediately on pointerdown, which could retarget a normal
// click away from .block-main and make the row feel drag-only. v1.5.9 keeps a
// normal click native, then captures only after the drag threshold is crossed.

function v159IsWholeRowCandidate(target) {
  const bar = v158MoveBar(target);
  if (!bar) return null;
  if (target.closest?.('.drag-handle')) return null; // :: keeps its existing click-to-move path.
  if (v158InteractiveTarget(target)) return null;
  return bar;
}

// v1.5.8 currently captures the whole row during pointerdown. Release that
// capture immediately for row-originated candidates so a short click keeps its
// original target and opens the Inspector normally. Document-level pointermove
// still tracks the candidate, so no drag capability is lost.
document.addEventListener('pointerdown', (event) => {
  if (!v157PrecisePointer(event) || event.button !== 0 || !event.isPrimary) return;
  const bar = v159IsWholeRowCandidate(event.target);
  if (!bar || v157Ui.pointerId !== event.pointerId) return;
  try {
    if (bar.hasPointerCapture?.(event.pointerId)) bar.releasePointerCapture(event.pointerId);
  } catch {}
}, true);

// Once v1.5.7 has crossed the movement threshold and entered actual drag mode,
// re-capture the pointer to the row. This gives us stable dragging outside the
// source row without sacrificing ordinary click behaviour before the threshold.
document.addEventListener('pointermove', (event) => {
  if (!v157Ui.dragging || v157Ui.pointerId !== event.pointerId || !v157Ui.handle) return;
  const row = v157Ui.handle;
  if (!row.matches?.('.block-card,.v140-container-head')) return;
  try {
    if (!row.hasPointerCapture?.(event.pointerId)) row.setPointerCapture?.(event.pointerId);
  } catch {}
}, { capture: true, passive: true });

// Safety fallback: if a browser still retargets a short whole-row click to the
// row itself, select the block here. Existing .block-main/container-main click
// listeners remain the primary route, so this only handles the lost-click case
// and clicks on harmless row padding.
function v159SelectFromRowClick(event) {
  if (performance.now() <= v157Ui.suppressClickUntil) return;
  if (v155Ui.movingId) return;
  if (v158InteractiveTarget(event.target)) return;
  if (event.target.closest?.('.block-main,.v140-container-main')) return;

  const bar = v158MoveBar(event.target);
  if (!bar) return;
  const blockId = v158SourceIdFromBar(bar);
  if (!blockId || !v140Find(blockId)) return;

  state.selectedBlockId = blockId;
  renderBlockList();
  renderInspector();
  v153SyncPreviewSelection?.();
}

els.blockList?.addEventListener('click', v159SelectFromRowClick);

function v159Init() {
  document.body.classList.add('v159-click-edit-safe');
  document.title = 'Timewizzard Web Builder v1.5.9';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.9 · Click-to-edit + whole-row drag';
}

v159Init();
