// Timewizzard v1.5.10 — grip + Separator layout hotfix.
// Ensure every Blocks-panel move affordance consistently uses ::, regardless of
// pointer type or earlier compatibility layers, and keep Separator checkbox text
// on one compact line.

function v1510PolishBlockGrips() {
  const fine = window.matchMedia?.('(pointer: fine)')?.matches || false;
  els.blockList?.querySelectorAll('.drag-handle').forEach((handle) => {
    if (handle.textContent !== '::') handle.textContent = '::';
    handle.classList.add('v1510-block-grip');
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

function v1510PolishSeparatorInspector() {
  const found = v140Find(state.selectedBlockId);
  if (found?.block?.type !== 'separator') return;

  const checkbox = els.inspector?.querySelector('#iDivider');
  const label = checkbox?.closest('label');
  if (!checkbox || !label) return;

  label.classList.add('v1510-separator-toggle');
  // Put the checkbox first so its label copy naturally sits beside it even if an
  // earlier Inspector layout rendered the field as a grid label.
  if (label.firstElementChild !== checkbox) label.prepend(checkbox);
}

const v1510PreviousRenderBlockList = renderBlockList;
renderBlockList = function v1510RenderBlockList() {
  const result = v1510PreviousRenderBlockList();
  v1510PolishBlockGrips();
  return result;
};

const v1510PreviousRenderInspector = renderInspector;
renderInspector = function v1510RenderInspector() {
  const result = v1510PreviousRenderInspector();
  v1510PolishSeparatorInspector();
  return result;
};

function v1510Init() {
  v1510PolishBlockGrips();
  v1510PolishSeparatorInspector();
  document.body.classList.add('v1510-polish');
  document.title = 'Timewizzard Web Builder v1.5.10';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.10 · Grip + Separator polish';
}

v1510Init();
