// Timewizzard v1.5.11 — authoritative :: block grip rendering.
// The move system has several compatibility layers from v1.5.5-v1.5.10.
// This final polish makes the visible grip independent of any earlier arrow
// text by giving every Blocks-panel handle one stable class and label.

function v1511RefreshBlockGrips() {
  const fine = window.matchMedia?.('(pointer: fine)')?.matches || false;
  els.blockList?.querySelectorAll('.drag-handle').forEach((handle) => {
    handle.textContent = '::';
    handle.classList.add('v1511-authoritative-grip');
    handle.title = fine
      ? 'Drag the block row to move · click :: to choose destination'
      : 'Tap :: to move this block';
    handle.setAttribute('role', 'button');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-label', fine
      ? 'Move block by dragging the row or clicking this grip'
      : 'Move block');
  });
}

const v1511PreviousRenderBlockList = renderBlockList;
renderBlockList = function v1511RenderBlockList() {
  const result = v1511PreviousRenderBlockList();
  v1511RefreshBlockGrips();
  return result;
};

function v1511Init() {
  v1511RefreshBlockGrips();
  document.body.classList.add('v1511-grip-fix');
  document.title = 'Timewizzard Web Builder v1.5.11';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.11 · Stable :: block grip';
}

v1511Init();
