// Timewizzard v1.5.16 — fixed-width Facts labels.
// Discord cannot provide a real CSS/table column inside Text Display Markdown,
// so Facts labels are rendered as fixed-width inline-code cells. Values remain
// normal Markdown, preserving Discord Insert links, mentions and timestamps.

const V1516_FACT_LABEL_WIDTH = 18;

function v1516FactLabelText(value) {
  const characters = Array.from(String(value ?? '').trim());
  if (characters.length <= V1516_FACT_LABEL_WIDTH) return characters.join('');
  return `${characters.slice(0, V1516_FACT_LABEL_WIDTH - 1).join('')}…`;
}

function v1516FactsPreview(block) {
  const title = String(block?.title || '').trim();
  const rows = Array.isArray(block?.items)
    ? block.items.filter((item) => String(item?.label || '').trim() || String(item?.value || '').trim())
    : [];
  const titleHtml = title
    ? `<div class="v1516-facts-preview-title">${renderMarkdown(`### ${title}`)}</div>`
    : '';
  const rowsHtml = rows.map((item) => {
    const label = v1516FactLabelText(item?.label);
    const value = String(item?.value || '').trim();
    return `<div class="v1516-facts-preview-row"><code class="v1516-facts-preview-label" title="${escapeAttr(String(item?.label || '').trim())}">${escapeHtml(label)}</code><div class="v1516-facts-preview-value">${renderMarkdown(value)}</div></div>`;
  }).join('');
  return `<div class="preview-block v1516-facts-preview">${titleHtml}<div class="v1516-facts-preview-list">${rowsHtml}</div></div>`;
}

const v1516PreviousRenderPreviewBlock = renderPreviewBlock;
renderPreviewBlock = function v1516RenderPreviewBlock(block) {
  if (block?.type === 'facts') return v1516FactsPreview(block);
  return v1516PreviousRenderPreviewBlock(block);
};

function v1516Init() {
  document.body.classList.add('v1516-facts-fixed-labels');
  document.title = 'Timewizzard Web Builder v1.5.16';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.16 · Fixed-width Facts labels';
  renderPreview();
}

v1516Init();
