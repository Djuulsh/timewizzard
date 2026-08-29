// Timewizzard v1.5.17 — Separator preview parity + structured Button Row editor.
// Separator spacing now has a reliable Small/Large visual model in the Web Builder,
// while Button Row uses proper Label/URL fields instead of pipe-delimited text.

function v1517ValidHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function v1517Buttons(block) {
  return Array.isArray(block?.buttons) ? block.buttons : [];
}

function v1517SyncButtonValidity(labelInput, urlInput, feedback) {
  const labelOk = Boolean(String(labelInput?.value || '').trim());
  const urlValue = String(urlInput?.value || '').trim();
  const urlOk = v1517ValidHttpUrl(urlValue);
  labelInput?.classList.toggle('v1517-invalid', !labelOk);
  urlInput?.classList.toggle('v1517-invalid', !urlOk);
  if (!feedback) return;
  feedback.textContent = !labelOk
    ? 'Button label is required.'
    : !urlValue
      ? 'URL is required.'
      : !urlOk
        ? 'Use a valid http(s) URL.'
        : '';
  feedback.classList.toggle('hidden', labelOk && urlOk);
}

function v1517MoveButtonRow(block, from, to) {
  const buttons = v1517Buttons(block);
  if (from === to || from < 0 || to < 0 || from >= buttons.length || to >= buttons.length) return;
  pushUndo();
  const [button] = buttons.splice(from, 1);
  buttons.splice(to, 0, button);
  markDirty();
  renderInspector();
  renderBlockList();
}

function v1517DeleteButtonRow(block, index) {
  const buttons = v1517Buttons(block);
  if (buttons.length <= 1) return toast('Button Row needs at least one button.', 'error');
  pushUndo();
  buttons.splice(index, 1);
  markDirty();
  renderInspector();
  renderBlockList();
}

function v1517AddButtonRow(block) {
  const buttons = v1517Buttons(block);
  if (buttons.length >= 5) return toast('Button Row can contain at most five buttons.', 'error');
  pushUndo();
  buttons.push({ label: '', url: '' });
  markDirty();
  renderInspector();
  renderBlockList();
  requestAnimationFrame(() => {
    els.inspector?.querySelector(`#v1517ButtonLabel${buttons.length - 1}`)?.focus();
  });
}

function v1517ButtonRowElement(block, button, index, total) {
  const row = document.createElement('div');
  row.className = 'v1517-button-item';
  row.dataset.buttonIndex = String(index);
  row.innerHTML = `
    <label class="v1517-button-label-cell">
      <span>Label</span>
      <input id="v1517ButtonLabel${index}" maxlength="80" value="${escapeAttr(button?.label || '')}" placeholder="e.g. Documentation">
    </label>
    <label class="v1517-button-url-cell">
      <span>URL</span>
      <input id="v1517ButtonUrl${index}" type="url" inputmode="url" value="${escapeAttr(button?.url || '')}" placeholder="https://example.com/docs">
      <small class="v1517-button-feedback hidden"></small>
    </label>
    <div class="v1517-button-actions" aria-label="Button row actions">
      <button type="button" class="mini-btn" data-v1517-move="up" title="Move button up" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="mini-btn" data-v1517-move="down" title="Move button down" ${index === total - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" class="mini-btn v1517-delete-button" title="Delete button" ${total <= 1 ? 'disabled' : ''}>×</button>
    </div>`;

  const labelInput = row.querySelector(`#v1517ButtonLabel${index}`);
  const urlInput = row.querySelector(`#v1517ButtonUrl${index}`);
  const feedback = row.querySelector('.v1517-button-feedback');
  const syncValidity = () => v1517SyncButtonValidity(labelInput, urlInput, feedback);

  bindInput(labelInput, () => {
    const current = v1517Buttons(block)[index];
    if (!current) return;
    current.label = labelInput.value;
    markDirty();
    renderBlockList();
    syncValidity();
  });
  bindInput(urlInput, () => {
    const current = v1517Buttons(block)[index];
    if (!current) return;
    current.url = urlInput.value;
    markDirty();
    syncValidity();
  });

  row.querySelector('[data-v1517-move="up"]')?.addEventListener('click', () => v1517MoveButtonRow(block, index, index - 1));
  row.querySelector('[data-v1517-move="down"]')?.addEventListener('click', () => v1517MoveButtonRow(block, index, index + 1));
  row.querySelector('.v1517-delete-button')?.addEventListener('click', () => v1517DeleteButtonRow(block, index));
  syncValidity();
  return row;
}

function v1517EnhanceButtonRowInspector() {
  const found = v140Find(state.selectedBlockId);
  const block = found?.block;
  if (block?.type !== 'button_row') return;

  const card = els.inspector?.querySelector('.inspector-card');
  if (!card || card.querySelector('.v1517-button-editor')) return;

  // Remove the old "Label | URL" textarea and helper text. Keep the existing
  // Button Row description above the structured editor.
  v153LabelFor(card, 'v150ButtonRows')?.remove();
  card.querySelectorAll('.v150-help').forEach((node) => node.remove());

  const content = card.querySelector('.v153-content') || card;
  const editor = document.createElement('div');
  editor.className = 'v1517-button-editor';
  editor.innerHTML = `
    <div class="v1517-button-columns" aria-hidden="true">
      <span>Label</span><span>URL</span><span></span>
    </div>
    <div class="v1517-button-list"></div>
    <div class="v1517-button-footer">
      <button type="button" class="btn ghost v1517-add-button">＋ Add button</button>
      <small>${v1517Buttons(block).length} / 5 buttons</small>
    </div>`;

  const note = content.querySelector('.v140-field-note');
  if (note) note.insertAdjacentElement('afterend', editor);
  else content.append(editor);

  const list = editor.querySelector('.v1517-button-list');
  const buttons = v1517Buttons(block);
  buttons.forEach((button, index) => list.append(v1517ButtonRowElement(block, button, index, buttons.length)));
  const add = editor.querySelector('.v1517-add-button');
  add?.toggleAttribute('disabled', buttons.length >= 5);
  add?.addEventListener('click', () => v1517AddButtonRow(block));
}

function v1517SeparatorPreviewMarkup(block) {
  const spacing = block?.spacing === 1 ? 'small' : 'large';
  const divider = block?.divider !== false;
  return `<div class="preview-block v1517-separator-preview v1517-separator-${spacing}${divider ? ' has-divider' : ' no-divider'}">${divider ? '<hr>' : ''}</div>`;
}

function v1517EnhanceSeparatorInspector() {
  const found = v140Find(state.selectedBlockId);
  const block = found?.block;
  if (block?.type !== 'separator') return;

  const card = els.inspector?.querySelector('.inspector-card');
  const spacingSelect = card?.querySelector('#iSpacing');
  const dividerInput = card?.querySelector('#iDivider');
  const spacingLabel = spacingSelect?.closest('label');
  if (!card || !spacingSelect || !spacingLabel) return;

  let demo = card.querySelector('.separator-size-demo');
  if (!demo) {
    demo = document.createElement('div');
    demo.className = 'separator-size-demo v1517-separator-demo';
    demo.innerHTML = `
      <button type="button" data-v1517-separator-size="1"><span>Small</span><i></i></button>
      <button type="button" data-v1517-separator-size="2"><span>Large</span><i></i></button>`;
    spacingLabel.insertAdjacentElement('afterend', demo);
    demo.querySelectorAll('[data-v1517-separator-size]').forEach((button) => {
      button.addEventListener('click', () => {
        spacingSelect.value = button.dataset.v1517SeparatorSize;
        spacingSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  const sync = () => {
    const selected = Number(spacingSelect.value) === 1 ? 1 : 2;
    const showDivider = dividerInput?.checked !== false;
    demo.querySelectorAll('[data-v1517-separator-size]').forEach((button) => {
      const size = Number(button.dataset.v1517SeparatorSize);
      button.classList.toggle('active', size === selected);
      button.classList.toggle('no-divider', !showDivider);
    });
  };
  spacingSelect.addEventListener('change', sync);
  dividerInput?.addEventListener('change', sync);
  sync();
}

const v1517PreviousRenderInspector = renderInspector;
renderInspector = function v1517RenderInspector() {
  const result = v1517PreviousRenderInspector();
  v1517EnhanceButtonRowInspector();
  v1517EnhanceSeparatorInspector();
  return result;
};

const v1517PreviousRenderPreviewBlock = renderPreviewBlock;
renderPreviewBlock = function v1517RenderPreviewBlock(block) {
  if (block?.type === 'separator') return v1517SeparatorPreviewMarkup(block);
  return v1517PreviousRenderPreviewBlock(block);
};

function v1517Init() {
  document.body.classList.add('v1517-structured-button-row');
  v1517EnhanceButtonRowInspector();
  v1517EnhanceSeparatorInspector();
  document.title = 'Timewizzard Web Builder v1.5.17';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.17 · Button Row editor + Separator preview';
  renderPreview();
}

v1517Init();
