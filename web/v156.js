// Timewizzard v1.5.6 — safe universal click/tap block movement.
// HTML5 drag-and-drop is disabled for Builder blocks because browser-native
// drag sessions can become unstable when the hierarchical tree changes layout
// during drag. The deterministic source -> destination move flow now works on
// desktop, tablet and mobile alike.

// v1.5.5 already contains the complete tap-to-move engine. Make that engine
// universal rather than coarse-pointer only.
v155Ui.coarse = true;

function v156DisableNativeDrag() {
  els.blockList?.querySelectorAll('[data-block-id], .v140-container-head').forEach((node) => {
    node.draggable = false;
    node.removeAttribute('draggable');
  });
  els.blockList?.querySelectorAll('.drag-handle').forEach((handle) => {
    handle.classList.add('v156-click-move-handle', 'v155-tap-move-handle');
    handle.title = 'Click to move this block';
    handle.setAttribute('role', 'button');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-label', 'Move block');
    handle.textContent = '↔';
  });

  const inspectorHandle = els.inspector?.querySelector('.v153-inspector-drag');
  if (inspectorHandle) {
    inspectorHandle.draggable = false;
    inspectorHandle.removeAttribute('draggable');
    inspectorHandle.classList.add('v156-click-move-handle', 'v155-tap-move-handle');
    inspectorHandle.title = 'Click to move this block';
    inspectorHandle.setAttribute('role', 'button');
    inspectorHandle.setAttribute('tabindex', '0');
    inspectorHandle.textContent = '↔';
  }
}

// Stop the older v1.4/v1.5.4 drag listeners before a browser drag session can
// start. This is capture-phase on purpose: it runs before the legacy target and
// bubble listeners and prevents the freeze/crash path entirely.
document.addEventListener('dragstart', (event) => {
  const blockDrag = event.target?.closest?.('#blockList [data-block-id], #blockList .v140-container-head, #inspector .v153-inspector-drag');
  if (!blockDrag) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

const v156PreviousRenderBlockList = renderBlockList;
renderBlockList = function v156RenderBlockList() {
  const result = v156PreviousRenderBlockList();
  v156DisableNativeDrag();
  v155SyncMoveUi();
  return result;
};

const v156PreviousRenderInspector = renderInspector;
renderInspector = function v156RenderInspector() {
  const result = v156PreviousRenderInspector();
  v156DisableNativeDrag();
  return result;
};

function v156Init() {
  v156DisableNativeDrag();
  v155PrepareTouchCards();
  v155SyncMoveUi();
  document.body.classList.add('v156-click-move-enabled');
  document.title = 'Timewizzard Web Builder v1.5.6';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.6 · Safe click-to-move blocks';
}

v156Init();
