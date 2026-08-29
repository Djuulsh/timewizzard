// Timewizzard v1.5.12 — definitive :: grip fix.
// Earlier compatibility layers could reapply ↕/↔ during renderInspector().
// Override the shared refresh function itself, then enforce the requested ::
// after both Blocks and Inspector renders so the visible affordance stays stable.

function v1512ForceDoubleColon() {
  const fine = window.matchMedia?.('(pointer: fine)')?.matches || false;
  els.blockList?.querySelectorAll('.drag-handle').forEach((handle) => {
    handle.textContent = '::';
    handle.classList.add('v1512-double-colon-grip');
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

// v1.5.7 was the remaining source that could restore arrow glyphs after an
// Inspector render. Replace that refresh path at its source instead of relying
// on another visual-only override.
if (typeof v157RefreshMoveHandles === 'function') {
  v157RefreshMoveHandles = function v1512RefreshMoveHandles() {
    v1512ForceDoubleColon();
  };
}

const v1512PreviousRenderBlockList = renderBlockList;
renderBlockList = function v1512RenderBlockList() {
  const result = v1512PreviousRenderBlockList();
  v1512ForceDoubleColon();
  return result;
};

const v1512PreviousRenderInspector = renderInspector;
renderInspector = function v1512RenderInspector() {
  const result = v1512PreviousRenderInspector();
  v1512ForceDoubleColon();
  return result;
};

function v1512Init() {
  document.body.classList.add('v1512-grip-root-fix');
  v1512ForceDoubleColon();
  document.title = 'Timewizzard Web Builder v1.5.12';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.12 · Definitive :: block grip';
}

v1512Init();
