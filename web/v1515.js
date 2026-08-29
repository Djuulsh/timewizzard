// Timewizzard v1.5.15 — Facts preview/publish spacing parity.
// Facts remain row-based in Inspector, but preview now mirrors Discord's
// proportional-font-safe output: label, one fixed visual gap, then value.

function v1515FactsPreview(block) {
  const title = String(block?.title || '').trim();
  const rows = Array.isArray(block?.items)
    ? block.items.filter((item) => String(item?.label || '').trim() || String(item?.value || '').trim())
    : [];
  const titleHtml = title
    ? `<div class="v1515-facts-preview-title">${renderMarkdown(`### ${title}`)}</div>`
    : '';
  const rowsHtml = rows.map((item) => {
    const label = String(item?.label || '').trim();
    const value = String(item?.value || '').trim();
    return `<div class="v1515-facts-preview-row"><div class="v1515-facts-preview-label">${renderInline(label)}</div><span class="v1515-facts-preview-gap" aria-hidden="true"></span><div class="v1515-facts-preview-value">${renderMarkdown(value)}</div></div>`;
  }).join('');
  return `<div class="preview-block v1515-facts-preview">${titleHtml}<div class="v1515-facts-preview-list">${rowsHtml}</div></div>`;
}

const v1515PreviousRenderPreviewBlock = renderPreviewBlock;
renderPreviewBlock = function v1515RenderPreviewBlock(block) {
  if (block?.type === 'facts') return v1515FactsPreview(block);
  return v1515PreviousRenderPreviewBlock(block);
};

function v1515Init() {
  document.body.classList.add('v1515-facts-publish-parity');
  document.title = 'Timewizzard Web Builder v1.5.15';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.15 · Facts spacing parity';
  renderPreview();
}

v1515Init();
