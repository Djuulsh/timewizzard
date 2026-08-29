// Timewizzard v1.5.18 — global search, wrap-safe Facts and expanded templates.

const V1518_CONTAINER_TEMPLATES = [
  'channel_start_here',
  'team_roster_info',
  'event_signup',
  'results_winners',
  'boss_tactics',
  'knowledge_base',
  'support_ticket',
  'tutorial_howto',
  'goals_progress',
  'weekly_community_update'
];
V1518_CONTAINER_TEMPLATES.forEach((key) => V150_CONTAINER_TEMPLATES.add(key));

// Search is global. Categories are for browsing only when the search box is empty.
v152VisibleBlocks = function v1518VisibleBlocks() {
  const query = v152Ui.search.trim().toLowerCase();
  return V152_BLOCKS.filter((item) => {
    if (query) {
      return `${item.name} ${item.description} ${item.category} ${item.type}`
        .toLowerCase()
        .includes(query);
    }
    return v152Ui.category === 'All'
      || (v152Ui.category === 'Recommended' ? item.recommended : item.category === v152Ui.category);
  });
};

const v1518PreviousRenderAddGrid = v152RenderAddGrid;
v152RenderAddGrid = function v1518RenderAddGrid() {
  const result = v1518PreviousRenderAddGrid();
  const dialog = document.getElementById('v152AddBlockDialog');
  const query = v152Ui.search.trim();
  const title = dialog?.querySelector('#v152AddResultTitle');
  const categories = dialog?.querySelector('#v152AddCategories');
  if (query && title) title.textContent = 'Search results · All blocks';
  categories?.classList.toggle('v1518-searching-all', Boolean(query));
  return result;
};

// Template search follows the same rule: a non-empty search scans the entire
// catalog, independent of the selected browse category.
v140SetupTemplates = function v1518SetupTemplates() {
  if (!state.bootstrap?.templates?.length || !els.newTemplate) return;
  const oldLabel = els.newTemplate.closest('label');
  if (oldLabel) oldLabel.classList.add('v140-hidden-template-select');

  let host = document.getElementById('v140TemplateChooser');
  if (!host) {
    host = document.createElement('div');
    host.id = 'v140TemplateChooser';
    host.className = 'v140-template-chooser v150-template-browser';
    oldLabel?.insertAdjacentElement('beforebegin', host);
  }
  host.classList.add('v150-template-browser');

  const all = state.bootstrap.templates;
  const search = v150TemplateUi.search.trim().toLowerCase();
  const shown = all.filter((template) => {
    if (search) {
      return `${template.name} ${template.description || ''} ${template.category || ''} ${template.value || ''}`
        .toLowerCase()
        .includes(search);
    }
    return v150TemplateUi.category === 'All'
      || (v150TemplateUi.category === 'Recommended'
        ? template.featured
        : template.category === v150TemplateUi.category);
  });

  const resultContext = search ? 'Search results · all categories' : v150TemplateUi.category;
  host.classList.toggle('v1518-template-searching', Boolean(search));
  host.innerHTML = `
    <div class="v140-template-title">
      <strong>Choose a starting point</strong>
      <small>Browse by category, or search the complete template library. Every template can be changed block by block afterwards.</small>
    </div>
    <div class="v150-template-toolbar">
      <div class="v150-category-tabs">
        ${V150_TEMPLATE_CATEGORIES.map((category) => `<button type="button" data-v150-category="${escapeAttr(category)}" class="${v150TemplateUi.category === category ? 'active' : ''}">${escapeHtml(category)}</button>`).join('')}
      </div>
      <label class="v150-template-search">
        <span>Search templates</span>
        <input id="v150TemplateSearch" type="search" value="${escapeAttr(v150TemplateUi.search)}" placeholder="Search announcement, raid, support, tutorial…">
      </label>
    </div>
    <div class="v150-template-count">${shown.length} template${shown.length === 1 ? '' : 's'} · ${escapeHtml(resultContext)}</div>
    <div class="v140-template-grid v150-template-grid">
      ${shown.map((template) => `<button type="button" data-v140-template="${escapeAttr(template.value)}" class="${els.newTemplate.value === template.value ? 'active' : ''}">
        <span class="v150-template-icon">${escapeHtml(template.icon || '📄')}</span>
        <span class="v150-template-copy"><strong>${escapeHtml(template.name)}</strong><small>${escapeHtml(template.description || '')}</small></span>
        <span class="v150-template-badges"><i>${escapeHtml(template.category || 'Other')}</i><i class="${V150_CONTAINER_TEMPLATES.has(template.value) ? 'container' : 'plain'}">${V150_CONTAINER_TEMPLATES.has(template.value) ? 'Container' : 'Plain'}</i></span>
      </button>`).join('')}
    </div>
    ${shown.length ? '' : '<div class="v150-template-empty">No templates match this search.</div>'}`;

  $$('[data-v150-category]', host).forEach((button) => button.addEventListener('click', () => {
    v150TemplateUi.category = button.dataset.v150Category;
    v140SetupTemplates();
  }));
  $('#v150TemplateSearch', host)?.addEventListener('input', (event) => {
    v150TemplateUi.search = event.target.value;
    v140SetupTemplates();
    requestAnimationFrame(() => {
      const input = $('#v150TemplateSearch');
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    });
  });
  $$('[data-v140-template]', host).forEach((button) => button.addEventListener('click', () => {
    els.newTemplate.value = button.dataset.v140Template;
    $$('[data-v140-template]', host).forEach((node) => node.classList.toggle('active', node === button));
  }));
};

function v1518FactsPreview(block) {
  const title = String(block?.title || '').trim();
  const rows = Array.isArray(block?.items)
    ? block.items.filter((item) => String(item?.label || '').trim() || String(item?.value || '').trim())
    : [];
  const titleHtml = title
    ? `<div class="v1518-facts-preview-title">${renderMarkdown(`### ${title}`)}</div>`
    : '';
  const rowsHtml = rows.map((item) => {
    const label = String(item?.label || '').trim();
    const value = String(item?.value || '').trim();
    return `<div class="v1518-facts-preview-row"><div class="v1518-facts-preview-label">${renderInline(label)}</div><div class="v1518-facts-preview-value">${renderMarkdown(value)}</div></div>`;
  }).join('');
  return `<div class="preview-block v1518-facts-preview">${titleHtml}<div class="v1518-facts-preview-list">${rowsHtml}</div></div>`;
}

const v1518PreviousRenderPreviewBlock = renderPreviewBlock;
renderPreviewBlock = function v1518RenderPreviewBlock(block) {
  if (block?.type === 'facts') return v1518FactsPreview(block);
  return v1518PreviousRenderPreviewBlock(block);
};

function v1518Init() {
  document.body.classList.add('v1518-global-search');
  document.title = 'Timewizzard Web Builder v1.5.18';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.18 · Global search + expanded templates';
  v140SetupTemplates();
  if (state.entity) renderPreview();
}

v1518Init();
