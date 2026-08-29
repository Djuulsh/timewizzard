// Timewizzard v1.3.1 Web Builder enhancements.
// This file is concatenated after app.js by the web server so it can reuse the
// existing Builder state and helpers without duplicating the v1.3 editor.

const V131_UNICODE_EMOJIS = [
  ['😀','grinning'],['😃','smiley'],['😄','smile'],['😁','grin'],['😂','joy'],['🤣','rofl'],['😊','blush'],['😍','heart eyes'],['🥰','love'],['😘','kiss'],['😎','sunglasses'],['🤩','star struck'],['🥳','party'],['🤔','thinking'],['🫡','salute'],['😴','sleep'],['😭','cry'],['😡','angry'],['🤯','mind blown'],['😈','devil'],
  ['👍','thumbs up'],['👎','thumbs down'],['👏','clap'],['🙌','raised hands'],['🤝','handshake'],['🙏','pray'],['💪','muscle'],['👌','ok'],['✌️','peace'],['🤞','fingers crossed'],['👀','eyes'],['🫶','heart hands'],
  ['❤️','red heart'],['🧡','orange heart'],['💛','yellow heart'],['💚','green heart'],['💙','blue heart'],['💜','purple heart'],['🖤','black heart'],['🤍','white heart'],['💔','broken heart'],['🔥','fire'],['✨','sparkles'],['⭐','star'],['💥','boom'],['💯','hundred'],['✅','check'],['❌','cross'],['⚠️','warning'],['❓','question'],['❗','exclamation'],
  ['🎉','tada'],['🎊','confetti'],['🏆','trophy'],['🥇','gold medal'],['🎯','target'],['🎮','gaming'],['🕹️','joystick'],['⚔️','swords'],['🛡️','shield'],['🏹','bow'],['🪄','magic wand'],['💀','skull'],['👑','crown'],['💎','gem'],['🧙','wizard'],['🐉','dragon'],
  ['🍭','candy'],['🍬','sweet'],['🍰','cake'],['🍪','cookie'],['☕','coffee'],['🍺','beer'],['🥤','drink'],
  ['📌','pin'],['📢','announcement'],['📣','megaphone'],['📝','memo'],['📋','clipboard'],['🔗','link'],['🔔','bell'],['🔕','no bell'],['🔒','lock'],['🔓','unlock'],['🔍','search'],['⚙️','settings'],['🛠️','tools'],['🗑️','trash'],['📎','attachment'],['💬','chat'],['📅','calendar'],['⏰','alarm'],['🕒','clock'],
  ['⬆️','up'],['⬇️','down'],['⬅️','left'],['➡️','right'],['🔼','up triangle'],['🔽','down triangle'],['➕','plus'],['➖','minus'],['▶️','play'],['⏸️','pause']
].map(([emoji, name]) => ({ id: `u:${emoji}`, emoji, name, insert: emoji, custom: false }));

const v131State = {
  pickerData: null,
  pickerLoadedAt: 0,
  pickerTargetId: null,
  pickerTab: 'people',
  pickerSearch: '',
  mentionPolicy: { mode: 'display', users: [], roles: [] },
  autocomplete: null
};

function v131CurrentScope() {
  return state?.scope?.kind && state?.scope?.id ? { kind: state.scope.kind, id: state.scope.id } : null;
}

function v131DiscordUrl() {
  if (state?.scope?.kind !== 'p' || !state?.entity || !state?.bootstrap?.guild?.id) return null;
  const post = state.entity;
  const forum = (post.destinationType || 'forum') === 'forum';
  const channelId = forum ? (post.threadId || post.postId) : (post.destinationChannelId || post.forumChannelId || post.forumId);
  const messageId = post.starterMessageId || post.postId || post.threadId;
  return channelId && messageId ? `https://discord.com/channels/${state.bootstrap.guild.id}/${channelId}/${messageId}` : null;
}

function v131NormalizePolicy(value) {
  return {
    mode: value?.mode === 'selected' ? 'selected' : 'display',
    users: Array.isArray(value?.users) ? [...new Set(value.users.map(String))] : [],
    roles: Array.isArray(value?.roles) ? [...new Set(value.roles.map(String))] : []
  };
}

async function v131SaveMentionPolicy(next) {
  const scope = v131CurrentScope();
  if (!scope) return;
  const policy = v131NormalizePolicy(next);
  const data = await api(`/api/entities/${scope.kind}/${encodeURIComponent(scope.id)}/mention-policy`, { method: 'PUT', body: policy });
  v131State.mentionPolicy = v131NormalizePolicy(data.mentionPolicy);
  if (state.entity) state.entity.mentionPolicy = structuredClone(v131State.mentionPolicy);
  v131RenderPicker();
}

async function v131LoadPickerData(force = false) {
  if (!force && v131State.pickerData && Date.now() - v131State.pickerLoadedAt < 30_000) return v131State.pickerData;
  v131State.pickerData = await api('/api/discord-picker');
  v131State.pickerLoadedAt = Date.now();
  return v131State.pickerData;
}

function v131InsertAtCursor(target, text, replaceRange = null) {
  if (!target || !text) return;
  target.focus();
  const start = replaceRange?.start ?? target.selectionStart;
  const end = replaceRange?.end ?? target.selectionEnd;
  target.setRangeText(text, start, end, 'end');
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.focus();
}

function v131EnsureUi() {
  if (!document.getElementById('v131IdentityBtn')) {
    const button = document.createElement('button');
    button.id = 'v131IdentityBtn';
    button.className = 'btn ghost';
    button.type = 'button';
    button.textContent = '🤖 Bot Identity';
    button.addEventListener('click', v131OpenIdentity);
    const actions = document.querySelector('.top-actions');
    actions?.insertBefore(button, document.getElementById('newDraftBtn'));
  }

  if (!document.getElementById('v131OpenDiscordBtn')) {
    const open = document.createElement('button');
    open.id = 'v131OpenDiscordBtn';
    open.type = 'button';
    open.className = 'btn ghost hidden';
    open.textContent = '↗ Open in Discord';
    open.addEventListener('click', () => { const url = v131DiscordUrl(); if (url) window.open(url, '_blank', 'noopener'); });
    const copy = document.createElement('button');
    copy.id = 'v131CopyDiscordBtn';
    copy.type = 'button';
    copy.className = 'btn ghost hidden';
    copy.textContent = '⧉ Copy post link';
    copy.addEventListener('click', async () => {
      const url = v131DiscordUrl();
      if (!url) return;
      await navigator.clipboard.writeText(url);
      toast('Discord post link copied.', 'success');
    });
    els.editor?.querySelector('.editor-actions')?.append(open, copy);
  }

  if (!document.getElementById('v131IdentityDialog')) {
    const dialog = document.createElement('dialog');
    dialog.id = 'v131IdentityDialog';
    dialog.className = 'dialog v131-dialog';
    dialog.innerHTML = `
      <form id="v131IdentityForm" method="dialog">
        <div class="dialog-head"><div><h2>🤖 Bot Identity</h2><p>Server display name is local to this Discord server. Global username and avatar affect the bot everywhere.</p></div><button type="button" class="icon-btn" data-v131-close="v131IdentityDialog">×</button></div>
        <div id="v131IdentityPreview" class="v131-identity-preview"></div>
        <label>Server display name<input id="v131ServerNickname" maxlength="32" placeholder="Use global bot username"></label>
        <div class="v131-global-card">
          <div><strong>Global Discord identity</strong><p>Discord rate-limits global username/avatar changes. Only enable this when you really want to change the bot account itself.</p></div>
          <label class="compact-check"><input id="v131ApplyGlobal" type="checkbox"> Apply global username / avatar changes</label>
          <label>Global bot username<input id="v131GlobalUsername" maxlength="32"></label>
          <label>Bot logo / avatar<input id="v131AvatarFile" type="file" accept="image/png,image/jpeg,image/gif,image/webp"></label>
          <small id="v131AvatarHint" class="v131-hint">PNG/JPG/GIF/WEBP · recommended square · max ~2 MB.</small>
        </div>
        <div class="dialog-actions"><button type="button" class="btn ghost" data-v131-close="v131IdentityDialog">Cancel</button><button type="submit" class="btn primary">Save identity</button></div>
      </form>`;
    document.body.append(dialog);
    dialog.querySelectorAll('[data-v131-close]').forEach((node) => node.addEventListener('click', () => dialog.close()));
    dialog.querySelector('#v131IdentityForm').addEventListener('submit', v131SaveIdentity);
  }

  if (!document.getElementById('v131PickerDialog')) {
    const dialog = document.createElement('dialog');
    dialog.id = 'v131PickerDialog';
    dialog.className = 'dialog v131-picker-dialog';
    dialog.innerHTML = `
      <div class="v131-picker-shell">
        <div class="dialog-head"><div><h2>Discord Insert</h2><p>Insert people, roles, channels, Timewizzard posts, emojis or Discord timestamps at the cursor.</p></div><button type="button" class="icon-btn" data-v131-close="v131PickerDialog">×</button></div>
        <div class="v131-picker-tabs">
          <button type="button" data-v131-tab="people">👤 People</button><button type="button" data-v131-tab="roles">🛡 Roles</button><button type="button" data-v131-tab="channels"># Channels</button><button type="button" data-v131-tab="posts">💬 Posts</button><button type="button" data-v131-tab="emojis">😀 Emojis</button><button type="button" data-v131-tab="time">🕒 Time</button>
        </div>
        <div class="v131-picker-tools">
          <label class="v131-search"><span>Search</span><input id="v131PickerSearch" type="search" placeholder="Search Discord…"></label>
          <label class="v131-mention-mode"><span>Mention behaviour</span><select id="v131MentionMode"><option value="display">Display only · no ping</option><option value="selected">Notify whitelisted people/roles</option></select></label>
        </div>
        <div id="v131PickerHint" class="v131-picker-hint"></div>
        <div id="v131PickerList" class="v131-picker-list"></div>
        <div class="dialog-actions"><button type="button" class="btn ghost" data-v131-close="v131PickerDialog">Close</button></div>
      </div>`;
    document.body.append(dialog);
    dialog.querySelectorAll('[data-v131-close]').forEach((node) => node.addEventListener('click', () => dialog.close()));
    dialog.querySelectorAll('[data-v131-tab]').forEach((node) => node.addEventListener('click', () => { v131State.pickerTab = node.dataset.v131Tab; v131RenderPicker(); }));
    dialog.querySelector('#v131PickerSearch').addEventListener('input', (event) => { v131State.pickerSearch = event.target.value; v131RenderPicker(); });
    dialog.querySelector('#v131MentionMode').addEventListener('change', (event) => v131SaveMentionPolicy({ ...v131State.mentionPolicy, mode: event.target.value }).catch((error) => toast(error.message, 'error')));
  }
}

async function v131OpenIdentity() {
  v131EnsureUi();
  try {
    const identity = await api('/api/bot-identity');
    const dialog = document.getElementById('v131IdentityDialog');
    dialog.querySelector('#v131ServerNickname').value = identity.serverNickname || '';
    dialog.querySelector('#v131GlobalUsername').value = identity.username || '';
    dialog.querySelector('#v131ApplyGlobal').checked = false;
    dialog.querySelector('#v131AvatarFile').value = '';
    dialog.querySelector('#v131IdentityPreview').innerHTML = `<img src="${escapeAttr(identity.avatarUrl || '')}" alt=""><div><strong>${escapeHtml(identity.serverDisplayName || identity.username || 'Timewizzard')}</strong><small>Global: ${escapeHtml(identity.username || '—')}</small></div>`;
    dialog.showModal();
  } catch (error) { toast(error.message, 'error'); }
}

function v131ReadFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected logo file.'));
    reader.readAsDataURL(file);
  });
}

async function v131SaveIdentity(event) {
  event.preventDefault();
  const dialog = document.getElementById('v131IdentityDialog');
  const file = dialog.querySelector('#v131AvatarFile').files?.[0] || null;
  if (file && file.size > 2_000_000) return toast('Logo file is too large. Keep it under about 2 MB.', 'error');
  try {
    const applyGlobal = dialog.querySelector('#v131ApplyGlobal').checked;
    const body = {
      serverNickname: dialog.querySelector('#v131ServerNickname').value,
      applyGlobal,
      globalUsername: dialog.querySelector('#v131GlobalUsername').value,
      avatarDataUrl: applyGlobal && file ? await v131ReadFile(file) : ''
    };
    const identity = await api('/api/bot-identity', { method: 'PUT', body });
    v131State.pickerData = null;
    v131ApplyIdentityPreview(identity);
    dialog.close();
    toast('Bot identity updated.', 'success');
  } catch (error) { toast(error.message, 'error'); }
}

function v131ApplyIdentityPreview(identity) {
  const author = document.querySelector('.message-author');
  if (author) author.innerHTML = `${escapeHtml(identity?.serverDisplayName || identity?.username || 'Timewizzard')} <span>APP</span>`;
  const avatar = document.querySelector('.bot-avatar');
  if (avatar && identity?.avatarUrl) {
    avatar.textContent = '';
    avatar.style.backgroundImage = `url("${String(identity.avatarUrl).replaceAll('"', '%22')}")`;
    avatar.style.backgroundSize = 'cover';
    avatar.style.backgroundPosition = 'center';
  }
}

async function v131OpenPicker(targetId) {
  v131EnsureUi();
  v131State.pickerTargetId = targetId;
  v131State.pickerSearch = '';
  const dialog = document.getElementById('v131PickerDialog');
  dialog.querySelector('#v131PickerSearch').value = '';
  try {
    await v131LoadPickerData();
    v131State.mentionPolicy = v131NormalizePolicy(state?.entity?.mentionPolicy);
    if (v131CurrentScope()) {
      const scope = v131CurrentScope();
      const policy = await api(`/api/entities/${scope.kind}/${encodeURIComponent(scope.id)}/mention-policy`);
      v131State.mentionPolicy = v131NormalizePolicy(policy.mentionPolicy);
      if (state.entity) state.entity.mentionPolicy = structuredClone(v131State.mentionPolicy);
    }
    v131RenderPicker();
    dialog.showModal();
  } catch (error) { toast(error.message, 'error'); }
}

function v131ItemMatches(item, query) {
  if (!query) return true;
  return `${item.name || ''} ${item.title || ''} ${item.id || ''} ${item.kind || ''}`.toLowerCase().includes(query);
}

function v131InsertAndClose(value, keepOpen = false) {
  const target = document.getElementById(v131State.pickerTargetId);
  v131InsertAtCursor(target, value);
  if (!keepOpen) document.getElementById('v131PickerDialog')?.close();
}

function v131PingButton(kind, id) {
  const policyKey = kind === 'people' ? 'users' : 'roles';
  const active = v131State.mentionPolicy[policyKey].includes(String(id));
  const disabled = v131State.mentionPolicy.mode !== 'selected';
  return `<button type="button" class="v131-ping-btn${active ? ' active' : ''}" data-v131-ping-kind="${policyKey}" data-v131-ping-id="${escapeAttr(id)}" ${disabled ? 'disabled' : ''} title="${disabled ? 'Enable Notify whitelisted first' : active ? 'This mention may notify' : 'Display only'}">${active ? '🔔 Ping' : '🔕 No ping'}</button>`;
}

function v131EmojiHistory() {
  try { return JSON.parse(localStorage.getItem('timewizzard:emoji-recent') || '[]'); } catch { return []; }
}
function v131EmojiFavorites() {
  try { return JSON.parse(localStorage.getItem('timewizzard:emoji-favorites') || '[]'); } catch { return []; }
}
function v131RecordEmoji(id) {
  const recent = [id, ...v131EmojiHistory().filter((item) => item !== id)].slice(0, 20);
  localStorage.setItem('timewizzard:emoji-recent', JSON.stringify(recent));
}
function v131ToggleEmojiFavorite(id) {
  const favorites = v131EmojiFavorites();
  const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [id, ...favorites];
  localStorage.setItem('timewizzard:emoji-favorites', JSON.stringify(next.slice(0, 60)));
  v131RenderPicker();
}

function v131TimestampHtml() {
  const now = new Date(Date.now() + 5 * 60 * 1000);
  now.setSeconds(0, 0);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  return `<div class="v131-time-card"><label>Date & time<input id="v131TimeValue" type="datetime-local" value="${local}"></label><label>Display<select id="v131TimeStyle"><option value="F">Wednesday, 2 September 2026 20:00</option><option value="f" selected>2 September 2026 20:00</option><option value="D">2 September 2026</option><option value="d">02/09/2026</option><option value="t">20:00</option><option value="T">20:00:00</option><option value="R">in 4 days</option></select></label><div id="v131TimePreview" class="v131-time-preview"></div><button id="v131InsertTime" type="button" class="btn primary">Insert timestamp</button></div>`;
}

function v131RenderPicker() {
  const dialog = document.getElementById('v131PickerDialog');
  if (!dialog || !v131State.pickerData) return;
  const list = dialog.querySelector('#v131PickerList');
  const hint = dialog.querySelector('#v131PickerHint');
  const search = dialog.querySelector('#v131PickerSearch');
  const mode = dialog.querySelector('#v131MentionMode');
  mode.value = v131State.mentionPolicy.mode;
  search.closest('label').classList.toggle('hidden', v131State.pickerTab === 'time');
  dialog.querySelectorAll('[data-v131-tab]').forEach((node) => node.classList.toggle('active', node.dataset.v131Tab === v131State.pickerTab));
  const q = v131State.pickerSearch.trim().toLowerCase();
  const data = v131State.pickerData;
  hint.textContent = '';

  if (v131State.pickerTab === 'time') {
    hint.textContent = 'Discord timestamps automatically render in each viewer’s local time zone.';
    list.innerHTML = v131TimestampHtml();
    const update = () => {
      const value = list.querySelector('#v131TimeValue').value;
      const style = list.querySelector('#v131TimeStyle').value;
      const date = new Date(value);
      const epoch = Math.floor(date.getTime() / 1000);
      list.querySelector('#v131TimePreview').textContent = Number.isFinite(epoch) ? `<t:${epoch}:${style}> · ${renderDiscordTimestamp(epoch, style)}` : 'Choose a valid date/time.';
    };
    list.querySelector('#v131TimeValue').addEventListener('input', update);
    list.querySelector('#v131TimeStyle').addEventListener('change', update);
    list.querySelector('#v131InsertTime').addEventListener('click', () => {
      const date = new Date(list.querySelector('#v131TimeValue').value);
      const epoch = Math.floor(date.getTime() / 1000);
      const style = list.querySelector('#v131TimeStyle').value;
      if (Number.isFinite(epoch)) v131InsertAndClose(`<t:${epoch}:${style}>`);
    });
    update();
    return;
  }

  let items = [];
  if (v131State.pickerTab === 'people') {
    items = data.users.filter((item) => v131ItemMatches(item, q));
    hint.textContent = data.peopleLimited ? `Showing members currently known to the bot (${data.users.length} of about ${data.memberCount}). You can also paste a raw user ID below.` : `${data.users.length} people available.`;
    list.innerHTML = `${items.map((item) => `<div class="v131-picker-row"><button type="button" class="v131-picker-main" data-v131-insert="<@${item.id}>">${item.avatarUrl ? `<img src="${escapeAttr(item.avatarUrl)}" alt="">` : '<span class="v131-row-icon">👤</span>'}<span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.id)}${item.bot ? ' · bot' : ''}</small></span></button>${v131PingButton('people', item.id)}</div>`).join('')}<div class="v131-manual-id"><input id="v131ManualUser" inputmode="numeric" placeholder="User ID"><button type="button" class="btn ghost" id="v131InsertManualUser">Insert user ID</button></div>`;
    list.querySelector('#v131InsertManualUser')?.addEventListener('click', () => { const id = list.querySelector('#v131ManualUser').value.trim(); if (/^\d{16,22}$/.test(id)) v131InsertAndClose(`<@${id}>`); else toast('Enter a valid Discord user ID.', 'error'); });
  } else if (v131State.pickerTab === 'roles') {
    items = data.roles.filter((item) => v131ItemMatches(item, q));
    hint.textContent = 'Role mentions are display-only unless you explicitly whitelist a role for notification.';
    list.innerHTML = items.map((item) => `<div class="v131-picker-row"><button type="button" class="v131-picker-main" data-v131-insert="${escapeAttr(item.insert)}"><span class="v131-role-dot" style="background:${escapeAttr(item.color || '#99aab5')}"></span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.id)}${item.managed ? ' · managed' : ''}</small></span></button>${v131PingButton('roles', item.id)}</div>`).join('');
  } else if (v131State.pickerTab === 'channels') {
    items = data.channels.filter((item) => v131ItemMatches(item, q));
    hint.textContent = 'Click a channel to insert a native Discord channel mention.';
    list.innerHTML = items.map((item) => `<button type="button" class="v131-picker-main v131-full-row" data-v131-insert="${escapeAttr(item.insert)}"><span class="v131-row-icon">#</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.kind)} · ${escapeHtml(item.id)}</small></span></button>`).join('');
  } else if (v131State.pickerTab === 'posts') {
    items = data.posts.filter((item) => v131ItemMatches(item, q));
    hint.textContent = 'Forum posts are inserted as channel/thread mentions. Normal-channel posts are inserted as named Discord message links.';
    list.innerHTML = items.map((item) => `<div class="v131-picker-row"><button type="button" class="v131-picker-main" data-v131-insert="${escapeAttr(item.insert)}"><span class="v131-row-icon">💬</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.destinationType)}${item.deleted ? ' · deleted on Discord' : ''}</small></span></button>${item.url ? `<button type="button" class="v131-open-mini" data-v131-open="${escapeAttr(item.url)}">↗</button>` : ''}</div>`).join('');
  } else if (v131State.pickerTab === 'emojis') {
    const custom = data.emojis.map((item) => ({ ...item, custom: true }));
    const all = [...custom, ...V131_UNICODE_EMOJIS];
    const recent = v131EmojiHistory();
    const favorites = v131EmojiFavorites();
    items = all.filter((item) => v131ItemMatches(item, q)).sort((a, b) => {
      const af = favorites.includes(a.id) ? 1 : 0; const bf = favorites.includes(b.id) ? 1 : 0; if (af !== bf) return bf - af;
      const ar = recent.indexOf(a.id); const br = recent.indexOf(b.id); if (ar >= 0 || br >= 0) return (ar < 0 ? 999 : ar) - (br < 0 ? 999 : br);
      return String(a.name).localeCompare(String(b.name));
    });
    hint.textContent = `${custom.length} server emojis + common Unicode emojis. Favorites and recent emojis stay in this browser.`;
    list.innerHTML = `<div class="v131-emoji-grid">${items.map((item) => `<div class="v131-emoji-cell"><button type="button" class="v131-emoji-main" data-v131-emoji-id="${escapeAttr(item.id)}" data-v131-insert="${escapeAttr(item.insert)}" title="${escapeAttr(item.name)}">${item.custom ? `<img src="${escapeAttr(item.url)}" alt="${escapeAttr(item.name)}">` : `<span>${item.emoji}</span>`}<small>:${escapeHtml(item.name)}:</small></button><button type="button" class="v131-star${favorites.includes(item.id) ? ' active' : ''}" data-v131-favorite="${escapeAttr(item.id)}">${favorites.includes(item.id) ? '★' : '☆'}</button></div>`).join('')}</div>`;
  }

  list.querySelectorAll('[data-v131-insert]').forEach((node) => node.addEventListener('click', () => {
    if (node.dataset.v131EmojiId) v131RecordEmoji(node.dataset.v131EmojiId);
    v131InsertAndClose(node.dataset.v131Insert);
  }));
  list.querySelectorAll('[data-v131-open]').forEach((node) => node.addEventListener('click', () => window.open(node.dataset.v131Open, '_blank', 'noopener')));
  list.querySelectorAll('[data-v131-favorite]').forEach((node) => node.addEventListener('click', (event) => { event.stopPropagation(); v131ToggleEmojiFavorite(node.dataset.v131Favorite); }));
  list.querySelectorAll('[data-v131-ping-id]').forEach((node) => node.addEventListener('click', async () => {
    const key = node.dataset.v131PingKind;
    const id = node.dataset.v131PingId;
    const current = v131State.mentionPolicy[key];
    const nextIds = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    try { await v131SaveMentionPolicy({ ...v131State.mentionPolicy, [key]: nextIds }); } catch (error) { toast(error.message, 'error'); }
  }));
}

function v131ContextButtons() {
  const url = v131DiscordUrl();
  const open = document.getElementById('v131OpenDiscordBtn');
  const copy = document.getElementById('v131CopyDiscordBtn');
  open?.classList.toggle('hidden', !url);
  copy?.classList.toggle('hidden', !url);
}

// Add a Discord Insert button to every Markdown toolbar without rewriting the
// existing editor implementation.
const v131OriginalToolbarHtml = toolbarHtml;
toolbarHtml = function v131ToolbarHtml(targetId) {
  const original = v131OriginalToolbarHtml(targetId);
  return original.replace('</div>', `<span class="toolbar-spacer"></span><button type="button" class="toolbar-btn discord-insert-btn" data-discord-insert="${escapeAttr(targetId)}">👤/#/😀 Discord</button></div>`);
};

const v131OriginalBindToolbar = bindToolbar;
bindToolbar = function v131BindToolbar(root = els.inspector) {
  v131OriginalBindToolbar(root);
  $$('[data-discord-insert]', root).forEach((button) => button.addEventListener('click', () => v131OpenPicker(button.dataset.discordInsert)));
};

const v131OriginalRenderEditorMeta = renderEditorMeta;
renderEditorMeta = function v131RenderEditorMeta() {
  v131OriginalRenderEditorMeta();
  v131ContextButtons();
};

function v131AutocompleteClose() {
  document.getElementById('v131Autocomplete')?.remove();
  v131State.autocomplete = null;
}

async function v131AutocompleteFor(textarea) {
  if (!textarea || textarea.tagName !== 'TEXTAREA') return v131AutocompleteClose();
  const cursor = textarea.selectionStart;
  const before = textarea.value.slice(0, cursor);
  const match = before.match(/(?:^|\s)([@#:])([A-Za-z0-9_\-]{0,24})$/);
  if (!match) return v131AutocompleteClose();
  const trigger = match[1];
  const term = match[2].toLowerCase();
  try { await v131LoadPickerData(); } catch { return; }
  let values = [];
  if (trigger === '@') values = [
    ...v131State.pickerData.users.map((item) => ({ label: `@${item.name}`, insert: `<@${item.id}>`, icon: '👤' })),
    ...v131State.pickerData.roles.map((item) => ({ label: `@${item.name}`, insert: `<@&${item.id}>`, icon: '🛡' }))
  ];
  else if (trigger === '#') values = v131State.pickerData.channels.map((item) => ({ label: `#${item.name}`, insert: item.insert, icon: '#' }));
  else values = [
    ...v131State.pickerData.emojis.map((item) => ({ label: `:${item.name}:`, insert: item.insert, iconUrl: item.url })),
    ...V131_UNICODE_EMOJIS.map((item) => ({ label: `:${item.name}:`, insert: item.insert, icon: item.emoji }))
  ];
  values = values.filter((item) => item.label.toLowerCase().includes(term)).slice(0, 8);
  if (!values.length) return v131AutocompleteClose();
  let pop = document.getElementById('v131Autocomplete');
  if (!pop) { pop = document.createElement('div'); pop.id = 'v131Autocomplete'; pop.className = 'v131-autocomplete'; document.body.append(pop); }
  const rect = textarea.getBoundingClientRect();
  pop.style.left = `${Math.min(rect.left, window.innerWidth - 330)}px`;
  pop.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - 260)}px`;
  pop.style.width = `${Math.min(rect.width, 320)}px`;
  const replaceStart = cursor - match[2].length - 1;
  pop.innerHTML = values.map((item, index) => `<button type="button" data-ac-index="${index}">${item.iconUrl ? `<img src="${escapeAttr(item.iconUrl)}" alt="">` : `<span>${item.icon || '•'}</span>`}<strong>${escapeHtml(item.label)}</strong></button>`).join('');
  pop.querySelectorAll('[data-ac-index]').forEach((node) => node.addEventListener('mousedown', (event) => {
    event.preventDefault();
    const item = values[Number(node.dataset.acIndex)];
    v131InsertAtCursor(textarea, item.insert, { start: replaceStart, end: cursor });
    v131AutocompleteClose();
  }));
}

document.addEventListener('input', (event) => {
  if (event.target?.closest?.('#inspector') && event.target.tagName === 'TEXTAREA') v131AutocompleteFor(event.target);
});
document.addEventListener('click', (event) => { if (!event.target.closest?.('#v131Autocomplete')) v131AutocompleteClose(); });

v131EnsureUi();
document.title = 'Timewizzard Web Builder v1.3.1';
const v131BrandSmall = document.querySelector('.brand small');
if (v131BrandSmall) v131BrandSmall.textContent = 'v1.3.1 · Discord-native content editor';
v131ContextButtons();
v131LoadPickerData().then((data) => v131ApplyIdentityPreview(data.identity)).catch(() => undefined);
