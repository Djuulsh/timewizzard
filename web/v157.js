// Timewizzard v1.5.7 — hybrid Pointer Events drag + click/tap movement.
// Click/tap-to-move remains the deterministic fallback everywhere. On precise
// pointers (mouse/pen), moving the handle beyond a small threshold starts a
// custom Pointer Events drag. No HTML5 draggable/dataTransfer path is used.

const v157Ui = {
  pointerId: null,
  sourceId: null,
  handle: null,
  startX: 0,
  startY: 0,
  dragging: false,
  hover: null,
  ghost: null,
  suppressClickUntil: 0
};

function v157BlockNode(blockId) {
  if (!els.blockList || !blockId) return null;
  return [...els.blockList.querySelectorAll('[data-block-id]')].find((node) => node.dataset.blockId === blockId) || null;
}

function v157BlockIdFromHandle(handle) {
  const owner = handle?.closest?.('[data-block-id]');
  const blockId = owner?.dataset.blockId;
  return blockId && v140Find(blockId) ? blockId : null;
}

function v157PrecisePointer(event) {
  return event.pointerType === 'mouse' || event.pointerType === 'pen';
}

function v157CapacityMessage(parent) {
  return parent ? 'This Container already has 25 blocks.' : 'The POST root already has 25 blocks/containers.';
}

function v157MoveBlock(sourceId, destination) {
  let source = v140Find(sourceId);
  if (!source || !destination) return false;
  const moving = source.block;

  if (destination.kind === 'inside') {
    if (moving.type === 'container') return false;
    const containerFound = v140Find(destination.containerId);
    const container = containerFound?.block;
    if (!container || containerFound.parent || container.type !== 'container') return false;
    if (container.children.length >= 25 && source.list !== container.children) {
      toast('This Container already has 25 blocks.', 'error');
      return false;
    }
  } else if (destination.kind === 'rootEnd') {
    if (source.parent && v140Roots().length >= 25) {
      toast('The POST root already has 25 blocks/containers.', 'error');
      return false;
    }
  } else if (destination.kind === 'before' || destination.kind === 'after') {
    let target = v140Find(destination.targetId);
    if (!target) return false;
    if (moving.type === 'container' && target.parent) {
      destination = { ...destination, targetId: target.parent.id };
      target = v140Find(destination.targetId);
    }
    if (!target || target.block.id === sourceId) return false;
    if (moving.type === 'container' && target.parent) return false;
    if (target.list.length >= 25 && target.list !== source.list) {
      toast(v157CapacityMessage(target.parent), 'error');
      return false;
    }
  } else {
    return false;
  }

  pushUndo();
  source = v140Find(sourceId);
  if (!source) return false;
  const [block] = source.list.splice(source.index, 1);

  if (destination.kind === 'inside') {
    const container = v140Find(destination.containerId)?.block;
    if (!container || container.type !== 'container') return false;
    container.children.push(block);
  } else if (destination.kind === 'rootEnd') {
    v140Roots().push(block);
  } else {
    const target = v140Find(destination.targetId);
    if (!target) return false;
    const index = target.index + (destination.kind === 'after' ? 1 : 0);
    target.list.splice(index, 0, block);
  }

  state.selectedBlockId = block.id;
  v155Ui.movingId = null;
  markDirty();
  renderBlockList();
  renderInspector();
  renderPreview();
  return true;
}

// Route click/tap movement through the same move core used by pointer drag.
v155MoveToRootEnd = function v157ClickMoveToRootEnd(blockId) {
  if (!v157MoveBlock(blockId, { kind: 'rootEnd' })) v155CancelMove();
};

v155MoveBefore = function v157ClickMoveBefore(sourceId, targetId) {
  const source = v140Find(sourceId);
  const target = v140Find(targetId);
  if (!source || !target || sourceId === targetId) return v155CancelMove();

  if (source.block.type === 'container') {
    return v157MoveBlock(sourceId, { kind: 'before', targetId: target.parent?.id || targetId });
  }
  if (!target.parent && target.block.type === 'container') {
    return v157MoveBlock(sourceId, { kind: 'inside', containerId: target.block.id });
  }
  return v157MoveBlock(sourceId, { kind: 'before', targetId });
};

function v157ClearDropVisuals() {
  els.blockList?.querySelectorAll('.v157-drop-before,.v157-drop-after,.v157-drop-inside,.v157-root-active').forEach((node) => {
    node.classList.remove('v157-drop-before', 'v157-drop-after', 'v157-drop-inside', 'v157-root-active');
  });
}

function v157ShowHover(hover) {
  v157ClearDropVisuals();
  if (!hover) return;
  if (hover.kind === 'rootEnd') {
    els.blockList?.querySelector('.v153-root-dropzone')?.classList.add('v157-root-active');
    return;
  }
  const node = v157BlockNode(hover.containerId || hover.targetId);
  if (!node) return;
  if (hover.kind === 'inside') node.classList.add('v157-drop-inside');
  else if (hover.kind === 'before') node.classList.add('v157-drop-before');
  else if (hover.kind === 'after') node.classList.add('v157-drop-after');
}

function v157HitTarget(x, y, sourceId) {
  const element = document.elementFromPoint(x, y);
  if (!element || !els.blockList?.contains(element)) return null;

  const rootZone = element.closest('.v153-root-dropzone');
  if (rootZone) return { kind: 'rootEnd' };

  let targetNode = element.closest('[data-block-id]');
  if (!targetNode || !els.blockList.contains(targetNode)) return null;
  let targetId = targetNode.dataset.blockId;
  const source = v140Find(sourceId);
  let target = v140Find(targetId);
  if (!source || !target) return null;

  if (source.block.type === 'container' && target.parent) {
    targetId = target.parent.id;
    target = v140Find(targetId);
    targetNode = v157BlockNode(targetId);
  }
  if (!target || !targetNode || targetId === sourceId) return null;

  const rect = targetNode.getBoundingClientRect();
  const ratio = rect.height > 0 ? (y - rect.top) / rect.height : 0.5;

  if (source.block.type !== 'container' && !target.parent && target.block.type === 'container') {
    const containerHead = element.closest('.v140-container-head');
    if (!containerHead) return { kind: 'inside', containerId: targetId };
    const headRect = containerHead.getBoundingClientRect();
    const headRatio = headRect.height > 0 ? (y - headRect.top) / headRect.height : 0.5;
    if (headRatio < 0.25) return { kind: 'before', targetId };
    if (headRatio > 0.75) return { kind: 'after', targetId };
    return { kind: 'inside', containerId: targetId };
  }

  return { kind: ratio < 0.5 ? 'before' : 'after', targetId };
}

function v157CreateGhost(blockId) {
  const found = v140Find(blockId);
  if (!found) return null;
  const info = TYPE_INFO[found.block.type] || ['▫️', found.block.type || 'Block'];
  const ghost = document.createElement('div');
  ghost.className = 'v157-pointer-ghost';
  ghost.textContent = `${info[0]} ${info[1]}`;
  document.body.append(ghost);
  return ghost;
}

function v157StartPointerDrag(event) {
  if (v157Ui.dragging || !v157Ui.sourceId) return;
  v157Ui.dragging = true;
  v155CancelMove();
  document.body.classList.add('v157-pointer-dragging');
  v157BlockNode(v157Ui.sourceId)?.classList.add('v157-pointer-source');
  v157Ui.ghost = v157CreateGhost(v157Ui.sourceId);
  v157UpdatePointerDrag(event);
}

function v157UpdatePointerDrag(event) {
  if (!v157Ui.dragging) return;
  event.preventDefault();
  if (v157Ui.ghost) {
    v157Ui.ghost.style.left = `${event.clientX + 14}px`;
    v157Ui.ghost.style.top = `${event.clientY + 14}px`;
  }
  const hover = v157HitTarget(event.clientX, event.clientY, v157Ui.sourceId);
  v157Ui.hover = hover;
  v157ShowHover(hover);
}

function v157CleanupPointerDrag({ suppressClick = false } = {}) {
  if (suppressClick) v157Ui.suppressClickUntil = performance.now() + 450;
  if (v157Ui.handle && v157Ui.pointerId !== null) {
    try {
      if (v157Ui.handle.hasPointerCapture?.(v157Ui.pointerId)) v157Ui.handle.releasePointerCapture(v157Ui.pointerId);
    } catch {}
  }
  v157Ui.ghost?.remove();
  v157Ui.ghost = null;
  document.body.classList.remove('v157-pointer-dragging');
  els.blockList?.querySelectorAll('.v157-pointer-source').forEach((node) => node.classList.remove('v157-pointer-source'));
  v157ClearDropVisuals();
  v157Ui.pointerId = null;
  v157Ui.sourceId = null;
  v157Ui.handle = null;
  v157Ui.dragging = false;
  v157Ui.hover = null;
}

function v157PointerDown(event) {
  if (!v157PrecisePointer(event) || event.button !== 0 || !event.isPrimary) return;
  const handle = event.target.closest('#blockList .drag-handle.v156-click-move-handle, #inspector .v153-inspector-drag.v156-click-move-handle');
  if (!handle) return;
  const sourceId = v157BlockIdFromHandle(handle);
  if (!sourceId) return;

  v157Ui.pointerId = event.pointerId;
  v157Ui.sourceId = sourceId;
  v157Ui.handle = handle;
  v157Ui.startX = event.clientX;
  v157Ui.startY = event.clientY;
  v157Ui.dragging = false;
  v157Ui.hover = null;
  try { handle.setPointerCapture?.(event.pointerId); } catch {}
}

function v157PointerMove(event) {
  if (v157Ui.pointerId !== event.pointerId || !v157Ui.sourceId) return;
  if (!v157Ui.dragging) {
    const dx = event.clientX - v157Ui.startX;
    const dy = event.clientY - v157Ui.startY;
    if (Math.hypot(dx, dy) < 7) return;
    v157StartPointerDrag(event);
  } else {
    v157UpdatePointerDrag(event);
  }
}

function v157PointerUp(event) {
  if (v157Ui.pointerId !== event.pointerId) return;
  if (!v157Ui.dragging) {
    v157CleanupPointerDrag();
    return; // ordinary click continues into v1.5.5 click-to-move.
  }

  event.preventDefault();
  event.stopPropagation();
  const sourceId = v157Ui.sourceId;
  const hover = v157Ui.hover;
  v157CleanupPointerDrag({ suppressClick: true });
  if (sourceId && hover) v157MoveBlock(sourceId, hover);
}

function v157PointerCancel(event) {
  if (v157Ui.pointerId !== event.pointerId) return;
  v157CleanupPointerDrag({ suppressClick: v157Ui.dragging });
}

// Browser click is commonly emitted after pointerup. Suppress exactly the click
// generated by a completed pointer drag, before the v1.5.5 click-move handler.
document.addEventListener('click', (event) => {
  if (performance.now() > v157Ui.suppressClickUntil) return;
  const handle = event.target.closest('#blockList .drag-handle, #inspector .v153-inspector-drag');
  if (!handle) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

document.addEventListener('pointerdown', v157PointerDown, true);
document.addEventListener('pointermove', v157PointerMove, { capture: true, passive: false });
document.addEventListener('pointerup', v157PointerUp, true);
document.addEventListener('pointercancel', v157PointerCancel, true);

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (v157Ui.pointerId !== null) {
    event.preventDefault();
    v157CleanupPointerDrag({ suppressClick: v157Ui.dragging });
  }
  if (v155Ui.movingId) v155CancelMove();
});

function v157RefreshMoveHandles() {
  const fine = window.matchMedia?.('(pointer: fine)')?.matches || false;
  els.blockList?.querySelectorAll('.drag-handle.v156-click-move-handle').forEach((handle) => {
    handle.textContent = fine ? '↕' : '↔';
    handle.title = fine ? 'Drag to move · Click to choose destination' : 'Tap to move this block';
    handle.setAttribute('aria-label', fine ? 'Move block by dragging or clicking' : 'Move block');
  });
  const inspectorHandle = els.inspector?.querySelector('.v153-inspector-drag.v156-click-move-handle');
  if (inspectorHandle) {
    inspectorHandle.textContent = fine ? '↕' : '↔';
    inspectorHandle.title = fine ? 'Drag to move · Click to choose destination' : 'Tap to move this block';
    inspectorHandle.setAttribute('aria-label', fine ? 'Move block by dragging or clicking' : 'Move block');
  }
}

const v157PreviousRenderBlockList = renderBlockList;
renderBlockList = function v157RenderBlockList() {
  const result = v157PreviousRenderBlockList();
  v157RefreshMoveHandles();
  return result;
};

const v157PreviousRenderInspector = renderInspector;
renderInspector = function v157RenderInspector() {
  const result = v157PreviousRenderInspector();
  v157RefreshMoveHandles();
  return result;
};

function v157Init() {
  v157RefreshMoveHandles();
  document.body.classList.add('v157-hybrid-move-enabled');
  document.title = 'Timewizzard Web Builder v1.5.7';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.7 · Pointer drag + click-to-move';
}

v157Init();
