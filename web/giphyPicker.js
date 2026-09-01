// Timewizzard GIPHY picker. GIPHY requires Search/Trending calls to run in the
// client and requires visible Powered by GIPHY attribution where results appear.

const GIPHY_SEARCH_ENDPOINT = 'https://api.giphy.com/v1/gifs/search';
const GIPHY_TRENDING_ENDPOINT = 'https://api.giphy.com/v1/gifs/trending';
const GIPHY_MAX_QUERY_LENGTH = 50;
const GIPHY_CUSTOMER_ID_KEY = 'timewizzard:giphy-customer-id';

let giphyActiveTarget = null;
let giphyAbortController = null;
let giphyRequestId = 0;
let giphyResults = new Map();

function giphyConfiguration() {
  return state.bootstrap?.giphy || { enabled: false, apiKey: null, rating: 'pg-13', limit: 50 };
}

function giphySafeUrl(value) {
  try {
    const raw = String(value || '').trim();
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' ? raw : '';
  } catch {
    return '';
  }
}

function giphyBrowseUrl(query = '') {
  const normalized = String(query || '').trim().slice(0, GIPHY_MAX_QUERY_LENGTH);
  return normalized
    ? `https://giphy.com/search/${encodeURIComponent(normalized)}`
    : 'https://giphy.com/trending-gifs';
}

function giphyUpdateBrowseLink(query = '') {
  const link = document.getElementById('giphyViewMoreLink');
  if (!link) return;
  const normalized = String(query || '').trim().slice(0, GIPHY_MAX_QUERY_LENGTH);
  link.href = giphyBrowseUrl(normalized);
  link.setAttribute('aria-label', normalized
    ? `View more GIPHY results for ${normalized}`
    : 'View more trending GIFs on GIPHY');
}

function giphyCustomerId() {
  try {
    let id = localStorage.getItem(GIPHY_CUSTOMER_ID_KEY);
    if (!/^[a-f0-9-]{16,64}$/i.test(id || '')) {
      id = crypto.randomUUID();
      localStorage.setItem(GIPHY_CUSTOMER_ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function giphyPing(value) {
  const url = giphySafeUrl(value);
  if (!url) return;
  const parsed = new URL(url);
  if (parsed.hostname !== 'giphy-analytics.giphy.com') return;
  parsed.searchParams.set('customer_id', giphyCustomerId());
  parsed.searchParams.set('ts', String(Date.now()));
  fetch(parsed.href, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(() => {});
}

function giphyDialog() {
  let dialog = document.getElementById('giphyPickerDialog');
  if (dialog) return dialog;

  dialog = document.createElement('dialog');
  dialog.id = 'giphyPickerDialog';
  dialog.className = 'dialog giphy-picker-dialog';
  dialog.setAttribute('aria-labelledby', 'giphyPickerTitle');
  dialog.innerHTML = `
    <form id="giphySearchForm" method="dialog">
      <div class="dialog-head">
        <div>
          <h2 id="giphyPickerTitle">Choose a GIF</h2>
          <p>Search GIPHY and insert the selected direct GIF URL.</p>
        </div>
        <button type="button" class="icon-btn" data-giphy-close aria-label="Close">×</button>
      </div>
      <div class="giphy-search-row">
        <label>
          <span class="sr-only">Search GIPHY</span>
          <input id="giphySearchInput" type="search" maxlength="${GIPHY_MAX_QUERY_LENGTH}" autocomplete="off" placeholder="Search GIFs…">
        </label>
        <button class="btn primary" type="submit">Search</button>
      </div>
      <div class="giphy-result-head">
        <strong id="giphyResultTitle">Trending GIFs</strong>
        <a href="https://giphy.com/" target="_blank" rel="noopener noreferrer" aria-label="Powered by GIPHY — open GIPHY"><img src="/powered-by-giphy.png" alt="Powered by GIPHY"></a>
      </div>
      <div id="giphyPickerStatus" class="giphy-picker-status" role="status" aria-live="polite"></div>
      <div id="giphyPickerResults" class="giphy-picker-results" aria-label="GIPHY search results"></div>
      <div class="dialog-actions">
        <a id="giphyViewMoreLink" class="btn ghost giphy-view-more" href="https://giphy.com/trending-gifs" target="_blank" rel="noopener noreferrer">View more on GIPHY</a>
        <button type="button" class="btn ghost" data-giphy-close>Cancel</button>
      </div>
    </form>`;
  document.body.append(dialog);

  dialog.querySelectorAll('[data-giphy-close]').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });
  dialog.querySelector('#giphySearchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = dialog.querySelector('#giphySearchInput').value.trim().slice(0, GIPHY_MAX_QUERY_LENGTH);
    void giphyLoad(query);
  });
  dialog.querySelector('#giphyPickerResults').addEventListener('click', (event) => {
    const button = event.target.closest('[data-giphy-result]');
    if (!button) return;
    const result = giphyResults.get(button.dataset.giphyResult);
    if (!result || !giphyActiveTarget) return;

    pushUndo();
    giphyActiveTarget.apply(result.url, result.altText);
    markDirty();
    giphyPing(result.analytics?.onclick?.url);
    dialog.close();
    renderInspector();
    toast('GIPHY GIF added to the image URL.', 'success');
  });
  dialog.addEventListener('close', () => {
    giphyAbortController?.abort();
    giphyAbortController = null;
    giphyActiveTarget = null;
  });
  return dialog;
}

function giphyNormalizeResult(item) {
  const images = item?.images || {};
  const url = giphySafeUrl(
    images.downsized_medium?.url ||
    images.downsized?.url ||
    images.original?.url
  );
  const preview = giphySafeUrl(
    images.fixed_width?.webp ||
    images.fixed_width?.url ||
    images.downsized_still?.url ||
    url
  );
  if (!item?.id || !url || !preview) return null;
  const title = String(item.title || 'GIPHY GIF').trim() || 'GIPHY GIF';
  return {
    id: String(item.id),
    title,
    altText: String(item.alt_text || title).trim() || title,
    username: String(item.username || '').trim(),
    url,
    preview,
    analytics: item.analytics || null
  };
}

function giphySetStatus(message, type = '') {
  const status = document.getElementById('giphyPickerStatus');
  if (!status) return;
  status.className = `giphy-picker-status${type ? ` ${type}` : ''}`;
  status.textContent = message;
}

function giphyRenderResults(items) {
  const host = document.getElementById('giphyPickerResults');
  if (!host) return;
  const normalized = items.map(giphyNormalizeResult).filter(Boolean);
  giphyResults = new Map(normalized.map((result) => [result.id, result]));

  if (!normalized.length) {
    host.innerHTML = '<div class="giphy-empty">No GIFs matched this search.</div>';
    giphySetStatus('No GIFs found. Try another search.', 'empty');
    return;
  }

  host.innerHTML = normalized.map((result) => `
    <button type="button" class="giphy-result" data-giphy-result="${escapeAttr(result.id)}" aria-label="Choose ${escapeAttr(result.title)}">
      <img src="${escapeAttr(result.preview)}" alt="${escapeAttr(result.altText)}" loading="lazy">
      <span>${escapeHtml(result.title)}</span>
      ${result.username ? `<small>@${escapeHtml(result.username)}</small>` : ''}
    </button>`).join('');
  giphySetStatus(`${normalized.length} GIFs ready. Select one to insert it.`);

  host.querySelectorAll('[data-giphy-result]').forEach((button) => {
    const result = giphyResults.get(button.dataset.giphyResult);
    const image = button.querySelector('img');
    if (!result || !image) return;
    const registerView = () => {
      if (button.dataset.giphyViewed) return;
      button.dataset.giphyViewed = 'true';
      giphyPing(result.analytics?.onload?.url);
    };
    image.addEventListener('load', registerView, { once: true });
    if (image.complete) queueMicrotask(registerView);
  });
}

async function giphyLoad(query = '') {
  const config = giphyConfiguration();
  if (!config.enabled || !config.apiKey) {
    giphySetStatus('GIPHY search is not configured. Add GIPHY_API_KEY and redeploy.', 'error');
    return;
  }

  giphyAbortController?.abort();
  giphyAbortController = new AbortController();
  const requestId = ++giphyRequestId;
  const params = new URLSearchParams({
    api_key: config.apiKey,
    limit: String(Math.min(Math.max(Number(config.limit) || 50, 1), 50)),
    rating: config.rating || 'pg-13',
    bundle: 'messaging_non_clips',
    customer_id: giphyCustomerId()
  });
  if (query) params.set('q', query);
  const endpoint = query ? GIPHY_SEARCH_ENDPOINT : GIPHY_TRENDING_ENDPOINT;
  giphyUpdateBrowseLink(query);
  const title = document.getElementById('giphyResultTitle');
  if (title) title.textContent = query ? `Results for “${query}”` : 'Trending GIFs';
  const host = document.getElementById('giphyPickerResults');
  if (host) host.innerHTML = '<div class="giphy-loading" aria-hidden="true"><span></span><span></span><span></span></div>';
  giphySetStatus(query ? `Searching GIPHY for ${query}…` : 'Loading trending GIFs…');

  try {
    const response = await fetch(`${endpoint}?${params}`, {
      signal: giphyAbortController.signal,
      headers: { Accept: 'application/json' }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.meta?.msg || `GIPHY returned HTTP ${response.status}.`);
    if (requestId !== giphyRequestId) return;
    giphyRenderResults(Array.isArray(payload.data) ? payload.data : []);
  } catch (error) {
    if (error.name === 'AbortError' || requestId !== giphyRequestId) return;
    if (host) host.innerHTML = '<div class="giphy-empty">GIPHY results could not be loaded.</div>';
    giphySetStatus(error.message || 'GIPHY search failed.', 'error');
  }
}

function giphyOpenPicker(target) {
  const config = giphyConfiguration();
  if (!config.enabled || !config.apiKey) {
    toast('GIPHY search is not configured. Add GIPHY_API_KEY and redeploy.', 'error');
    return;
  }
  giphyActiveTarget = target;
  const dialog = giphyDialog();
  dialog.querySelector('#giphySearchInput').value = '';
  dialog.showModal();
  dialog.querySelector('#giphySearchInput').focus();
  void giphyLoad('');
}

function giphyPickerButton(label = 'Search GIPHY') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn ghost giphy-picker-open';
  button.textContent = label;
  const enabled = Boolean(giphyConfiguration().enabled && giphyConfiguration().apiKey);
  button.disabled = !enabled;
  if (!enabled) button.title = 'Add GIPHY_API_KEY and redeploy to enable GIPHY search.';
  return button;
}

function giphyEnhanceInspector() {
  const block = selectedBlock();
  if (!block || !els.inspector || els.inspector.querySelector('[data-giphy-enhanced]')) return;

  if (block.type === 'image' || block.type === 'thumbnail') {
    const input = els.inspector.querySelector('#iUrl');
    if (!input) return;
    const action = document.createElement('div');
    action.className = 'giphy-field-action';
    action.dataset.giphyEnhanced = 'true';
    const button = giphyPickerButton();
    button.addEventListener('click', () => giphyOpenPicker({
      apply(url, title) {
        block.url = url;
        if (!String(block.description || '').trim()) block.description = title;
      }
    }));
    action.append(button);
    input.closest('label')?.insertAdjacentElement('afterend', action);
    return;
  }

  if (block.type === 'gallery') {
    const rows = [...els.inspector.querySelectorAll('.gallery-editor-row')];
    if (!rows.length) return;
    rows.forEach((row) => {
      const index = Number(row.dataset.galleryIndex);
      const item = block.items?.[index];
      if (!item) return;
      row.classList.add('giphy-enabled');
      row.dataset.giphyEnhanced = 'true';
      const button = giphyPickerButton('GIPHY');
      button.classList.add('giphy-gallery-open');
      button.addEventListener('click', () => giphyOpenPicker({
        apply(url, title) {
          item.url = url;
          if (!String(item.description || '').trim()) item.description = title;
        }
      }));
      row.querySelector('[data-gallery-remove]')?.insertAdjacentElement('beforebegin', button);
    });
  }
}

const giphyPreviousRenderInspector = renderInspector;
renderInspector = function renderInspectorWithGiphy(...args) {
  const result = giphyPreviousRenderInspector(...args);
  giphyEnhanceInspector();
  return result;
};
