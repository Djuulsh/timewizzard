// Timewizzard v1.5.13 — structured Facts / Key Values rows.
// Keeps the existing { label, value } schema, but replaces the pipe-delimited
// textarea with a proper row editor and a responsive two-column preview.

function v1513FactRows(block) {
  return Array.isArray(block?.items) ? block.items : [];
}

function v1513SyncFactValue(block, index, value) {
  const item = v1513FactRows(block)[index];
  if (!item) return;
  item.value = value;
  markDirty();
  renderPreview();
}

function v1513MoveFactRow(block, from, to) {
  const items = v1513FactRows(block);
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
  pushUndo();
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
  markDirty();
  renderInspector();
  renderBlockList();
  renderPreview();
}

function v1513DeleteFactRow(block, index) {
  const items = v1513FactRows(block);
  if (items.length <= 1) return toast('Facts needs at least one row.', 'error');
  pushUndo();
  items.splice(index, 1);
  markDirty();
  renderInspector();
  renderBlockList();
  renderPreview();
}

function v1513AddFactRow(block) {
  const items = v1513FactRows(block);
  if (items.length >= 25) return toast('Facts can contain at most 25 rows.', 'error');
  pushUndo();
  items.push({ label: '', value: '' });
  markDirty();
  renderInspector();
  renderBlockList();
  renderPreview();
  requestAnimationFrame(() => {
    const input = els.inspector?.querySelector(`#v1513FactLabel${items.length - 1}`);
    input?.focus();
  });
}

async function v1513OpenFactDiscordInsert(block, index, textarea) {
  if (!textarea) return;
  textarea.focus();
  const end = textarea.value.length;
  textarea.setSelectionRange?.(end, end);
  try {
    await v131OpenPicker(textarea.id);
    const dialog = document.getElementById('v131PickerDialog');
    if (!dialog) return;
    dialog.addEventListener('close', () => {
      v1513SyncFactValue(block, index, textarea.value);
    }, { once: true });
  } catch (error) {
    toast(error.message, 'error');
  }
}

function v1513FactRowElement(block, item, index, total) {
  const row = document.createElement('div');
  row.className = 'v1513-fact-row';
  row.dataset.factIndex = String(index);
  row.innerHTML = `
    <label class="v1513-fact-label-cell">
      <span>Label</span>
      <input id="v1513FactLabel${index}" maxlength="80" value="${escapeAttr(item?.label || '')}" placeholder="e.g. State">
    </label>
    <div class="v1513-fact-value-cell">
      <label>
        <span>Value</span>
        <textarea id="v1513FactValue${index}" maxlength="300" rows="2" placeholder="e.g. Maintenance in progress">${escapeHtml(item?.value || '')}</textarea>
      </label>
      <div class="v1513-fact-value-tools">
        <button type="button" class="mini-btn v1513-discord-insert">💬 Discord Insert</button>
      </div>
    </div>
    <div class="v1513-fact-row-actions" aria-label="Fact row actions">
      <button type="button" class="mini-btn" data-v1513-move="up" title="Move row up" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="mini-btn" data-v1513-move="down" title="Move row down" ${index === total - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" class="mini-btn v1513-delete-row" title="Delete row" ${total <= 1 ? 'disabled' : ''}>×</button>
    </div>`;

  const labelInput = row.querySelector(`#v1513FactLabel${index}`);
  const valueInput = row.querySelector(`#v1513FactValue${index}`);

  labelInput?.addEventListener('input', () => {
    const current = v1513FactRows(block)[index];
    if (!current) return;
    current.label = labelInput.value;
    markDirty();
    renderBlockList();
    renderPreview();
  });
  valueInput?.addEventListener('input', () => v1513SyncFactValue(block, index, valueInput.value));
  row.querySelector('.v1513-discord-insert')?.addEventListener('click', () => v1513OpenFactDiscordInsert(block, index, valueInput));
  row.querySelector('[data-v1513-move="up"]')?.addEventListener('click', () => v1513MoveFactRow(block, index, index - 1));
  row.querySelector('[data-v1513-move="down"]')?.addEventListener('click', () => v1513MoveFactRow(block, index, index + 1));
  row.querySelector('.v1513-delete-row')?.addEventListener('click', () => v1513DeleteFactRow(block, index));

  if (valueInput && typeof v153EnhanceTextarea === 'function') v153EnhanceTextarea(valueInput);
  return row;
}

function v1513EnhanceFactsInspector() {
  const found = v140Find(state.selectedBlockId);
  const block = found?.block;
  if (block?.type !== 'facts') return;

  const card = els.inspector?.querySelector('.inspector-card');
  if (!card || card.querySelector('.v1513-facts-editor')) return;

  // Remove the legacy "Label | Value" textarea and its helper copy. The title
  // field remains intact and keeps its existing bindings.
  v153LabelFor(card, 'v150FactsItems')?.remove();
  card.querySelectorAll('.v150-help').forEach((node) => node.remove());

  const content = card.querySelector('.v153-content') || card;
  const editor = document.createElement('div');
  editor.className = 'v1513-facts-editor';
  editor.innerHTML = `
    <div class="v1513-facts-column-head" aria-hidden="true">
      <span>Label</span><span>Value</span><span></span>
    </div>
    <div class="v1513-facts-rows"></div>
    <div class="v1513-facts-footer">
      <button type="button" class="btn ghost v1513-add-row">＋ Add row</button>
      <small>Line breaks and spaces are preserved · ${v1513FactRows(block).length} / 25 rows</small>
    </div>`;

  const titleLabel = v153LabelFor(card, 'v150FactsTitle');
  if (titleLabel?.parentElement === content) titleLabel.insertAdjacentElement('afterend', editor);
  else content.append(editor);

  const rows = editor.querySelector('.v1513-facts-rows');
  const items = v1513FactRows(block);
  items.forEach((item, index) => rows.append(v1513FactRowElement(block, item, index, items.length)));
  editor.querySelector('.v1513-add-row')?.toggleAttribute('disabled', items.length >= 25);
  editor.querySelector('.v1513-add-row')?.addEventListener('click', () => v1513AddFactRow(block));
}

function v1513FactsPreview(block) {
  const title = String(block?.title || '').trim();
  const rows = v1513FactRows(block).filter((item) => String(item?.label || '').trim() || String(item?.value || '').trim());
  const titleHtml = title ? `<div class="v1513-facts-preview-title">${renderMarkdown(`### ${title}`)}</div>` : '';
  const rowsHtml = rows.map((item) => {
    const label = String(item?.label || '').trim();
    const value = String(item?.value ?? '');
    return `<div class="v1513-facts-preview-row"><div class="v1513-facts-preview-label">${renderInline(label)}</div><div class="v1513-facts-preview-value">${renderMarkdown(value)}</div></div>`;
  }).join('');
  return `<div class="preview-block v1513-facts-preview">${titleHtml}<div class="v1513-facts-preview-grid">${rowsHtml}</div></div>`;
}

const v1513PreviousRenderInspector = renderInspector;
renderInspector = function v1513RenderInspector() {
  const result = v1513PreviousRenderInspector();
  v1513EnhanceFactsInspector();
  return result;
};

const v1513PreviousRenderPreviewBlock = renderPreviewBlock;
renderPreviewBlock = function v1513RenderPreviewBlock(block) {
  if (block?.type === 'facts') return v1513FactsPreview(block);
  return v1513PreviousRenderPreviewBlock(block);
};

function v1513Init() {
  v1513EnhanceFactsInspector();
  document.body.classList.add('v1513-facts-rows-enabled');
  document.title = 'Timewizzard Web Builder v1.5.13';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.13 · Facts row editor';
  renderPreview();
}

v1513Init();
