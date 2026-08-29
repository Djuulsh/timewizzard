// Timewizzard v1.5.0 — category-first template browser + ten reusable smart blocks.

Object.assign(TYPE_INFO, {
  heading: ['🔠', 'Heading'],
  callout: ['💡', 'Callout'],
  checklist: ['☑️', 'Checklist'],
  steps: ['👣', 'Steps'],
  facts: ['🏷️', 'Facts / Key values'],
  button_row: ['🔗', 'Button Row'],
  event: ['📅', 'Event'],
  countdown: ['⏳', 'Countdown'],
  code: ['💻', 'Code Snippet'],
  progress: ['📊', 'Progress']
});

const V150_SMART_TYPES = new Set(['heading', 'callout', 'checklist', 'steps', 'facts', 'button_row', 'event', 'countdown', 'code', 'progress']);
const V150_CONTAINER_TEMPLATES = new Set([
  'announcement_styled', 'welcome_onboarding', 'rules_guidelines', 'recruitment', 'raid_event', 'meeting_agenda',
  'giveaway', 'guide', 'support_troubleshooting', 'class_guide', 'patch_update', 'maintenance', 'release_launch',
  'warning', 'stream_live'
]);
const V150_TEMPLATE_CATEGORIES = ['Recommended', 'Basic', 'Community', 'Events', 'Guides', 'Updates', 'Media', 'Special', 'All'];
const v150TemplateUi = { category: 'Recommended', search: '' };

function v150LocalDateTime(epoch) {
  const value = Number(epoch);
  if (!Number.isFinite(value) || value <= 0) return '';
  const date = new Date(value * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function v150Epoch(value) {
  const date = new Date(value);
  const epoch = Math.floor(date.getTime() / 1000);
  return Number.isFinite(epoch) ? epoch : null;
}
function v150Lines(value) {
  return String(value ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
function v150Pipe(value) {
  const index = String(value).indexOf('|');
  return index < 0 ? [String(value).trim(), ''] : [String(value).slice(0, index).trim(), String(value).slice(index + 1).trim()];
}
function v150ChecklistSpec(block) {
  return (block.items || []).map((item) => `[${item.checked ? 'x' : ' '}] ${item.text || ''}`).join('\n');
}
function v150ParseChecklist(value) {
  return v150Lines(value).map((line) => {
    const match = line.match(/^\[(x|X| )\]\s*(.*)$/);
    return { checked: Boolean(match && match[1].toLowerCase() === 'x'), text: (match ? match[2] : line).trim() };
  });
}
function v150StepsSpec(block) {
  return (block.items || []).map((item) => `${item.title || ''} | ${item.content || ''}`).join('\n');
}
function v150ParseSteps(value) {
  return v150Lines(value).map((line, index) => { const [title, content] = v150Pipe(line); return { title: title || `Step ${index + 1}`, content }; });
}
function v150FactsSpec(block) {
  return (block.items || []).map((item) => `${item.label || ''} | ${item.value || ''}`).join('\n');
}
function v150ParseFacts(value) {
  return v150Lines(value).map((line) => { const [label, itemValue] = v150Pipe(line); return { label, value: itemValue }; });
}
function v150ButtonsSpec(block) {
  return (block.buttons || []).map((button) => `${button.label || ''} | ${button.url || ''}`).join('\n');
}
function v150ParseButtons(value) {
  return v150Lines(value).slice(0, 5).map((line) => { const [label, url] = v150Pipe(line); return { label, url }; });
}

function v150HeadingText(block) {
  const level = [1, 2, 3].includes(Number(block.level)) ? Number(block.level) : 2;
  return [`${'#'.repeat(level)} ${block.emoji ? `${block.emoji} ` : ''}${block.title || 'Heading'}`, block.subtitle || ''].filter(Boolean).join('\n');
}
function v150CalloutText(block) {
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', danger: '🛑', neutral: '💬' };
  return [`### ${icons[block.tone] || 'ℹ️'} ${block.title || 'Notice'}`, block.content || ''].filter(Boolean).join('\n');
}
function v150ChecklistText(block) {
  return [block.title ? `### ${block.title}` : '', ...(block.items || []).map((item) => `${item.checked ? '☑️' : '☐'} ${item.text || ''}`)].filter(Boolean).join('\n');
}
function v150StepsText(block) {
  return [block.title ? `## ${block.title}` : '', ...(block.items || []).flatMap((item, index) => [`### ${index + 1}. ${item.title || `Step ${index + 1}`}`, item.content || ''])].filter(Boolean).join('\n');
}
function v150FactsText(block) {
  return [block.title ? `### ${block.title}` : '', ...(block.items || []).map((item) => `**${item.label || ''}:** ${item.value || ''}`)].filter(Boolean).join('\n');
}
function v150EventText(block) {
  const rows = [`## 📅 ${block.title || 'Event'}`, block.description || ''];
  if (block.startEpoch) rows.push(`**Starts:** <t:${block.startEpoch}:F> · <t:${block.startEpoch}:R>`);
  if (block.endEpoch) rows.push(`**Ends:** <t:${block.endEpoch}:F>`);
  if (block.location) rows.push(`**Where:** ${block.location}`);
  return rows.filter(Boolean).join('\n');
}
function v150CountdownText(block) {
  return [`## ⏳ ${block.title || 'Countdown'}`, block.text || '', block.targetEpoch ? `**<t:${block.targetEpoch}:R>**` : '', block.targetEpoch ? `-# <t:${block.targetEpoch}:F>` : ''].filter(Boolean).join('\n');
}
function v150CodeText(block) {
  const language = String(block.language || '').replace(/[^A-Za-z0-9_+.-]/g, '').slice(0, 30);
  const code = String(block.code || '').replaceAll('```', '``\u200b`');
  return [block.caption || '', `\`\`\`${language}\n${code}\n\`\`\``].filter(Boolean).join('\n');
}
function v150ProgressText(block) {
  const current = Number(block.current || 0); const total = Number(block.total || 1);
  const segments = Math.min(20, Math.max(5, Number(block.segments || 10)));
  const ratio = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
  const filled = Math.round(ratio * segments); const percent = Math.round(ratio * 100);
  const numbers = block.showNumbers === false ? `${percent}%` : `${current}/${total} · ${percent}%`;
  return [`**${block.label || 'Progress'}**`, `\`${'█'.repeat(filled)}${'░'.repeat(segments - filled)}\` **${numbers}**`, block.note || ''].filter(Boolean).join('\n');
}
function v150SmartText(block) {
  if (block.type === 'heading') return v150HeadingText(block);
  if (block.type === 'callout') return v150CalloutText(block);
  if (block.type === 'checklist') return v150ChecklistText(block);
  if (block.type === 'steps') return v150StepsText(block);
  if (block.type === 'facts') return v150FactsText(block);
  if (block.type === 'event') return v150EventText(block);
  if (block.type === 'countdown') return v150CountdownText(block);
  if (block.type === 'code') return v150CodeText(block);
  if (block.type === 'progress') return v150ProgressText(block);
  return '';
}

const v150PreviousMakeContentBlock = v140MakeContentBlock;
v140MakeContentBlock = function v150MakeContentBlock(type) {
  const now = Math.floor(Date.now() / 1000);
  if (type === 'heading') return { id: shortId(3), type, level: 2, emoji: '✨', title: 'Heading', subtitle: 'Short supporting text.' };
  if (type === 'callout') return { id: shortId(3), type, tone: 'info', title: 'Notice', content: 'Add the important information here.' };
  if (type === 'checklist') return { id: shortId(3), type, title: 'Checklist', items: [{ text: 'First item', checked: true }, { text: 'Second item', checked: false }] };
  if (type === 'steps') return { id: shortId(3), type, title: 'Steps', items: [{ title: 'First step', content: 'Explain what to do.' }, { title: 'Next step', content: 'Continue with the next action.' }] };
  if (type === 'facts') return { id: shortId(3), type, title: 'Quick facts', items: [{ label: 'Status', value: 'Ready' }, { label: 'Owner', value: 'Team' }] };
  if (type === 'button_row') return { id: shortId(3), type, buttons: [{ label: 'Website', url: 'https://example.com' }, { label: 'Documentation', url: 'https://example.com/docs' }] };
  if (type === 'event') return { id: shortId(3), type, title: 'Event', description: 'Add event information here.', startEpoch: now + 3600, endEpoch: now + 7200, location: '#channel or location' };
  if (type === 'countdown') return { id: shortId(3), type, title: 'Countdown', text: 'Time remaining:', targetEpoch: now + 86400 };
  if (type === 'code') return { id: shortId(3), type, language: 'text', caption: 'Example', code: 'Paste code or configuration here.' };
  if (type === 'progress') return { id: shortId(3), type, label: 'Progress', current: 3, total: 5, segments: 10, showNumbers: true, note: 'Optional progress note.' };
  return v150PreviousMakeContentBlock(type);
};

const v150PreviousBlockSummary = blockSummary;
blockSummary = function v150BlockSummary(block) {
  if (block?.type === 'heading') return block.title || 'Heading';
  if (block?.type === 'callout') return `${block.tone || 'info'} · ${block.title || 'Notice'}`;
  if (block?.type === 'checklist') return `${block.items?.length || 0} checklist items`;
  if (block?.type === 'steps') return `${block.items?.length || 0} steps`;
  if (block?.type === 'facts') return `${block.items?.length || 0} key/value rows`;
  if (block?.type === 'button_row') return `${block.buttons?.length || 0} link buttons`;
  if (block?.type === 'event') return block.title || 'Event';
  if (block?.type === 'countdown') return block.title || 'Countdown';
  if (block?.type === 'code') return `${block.language || 'text'} · ${String(block.code || '').length} chars`;
  if (block?.type === 'progress') return `${block.current || 0}/${block.total || 0} · ${block.label || 'Progress'}`;
  return v150PreviousBlockSummary(block);
};

v140BuildAddMenu = function v150BuildAddMenu() {
  const add = document.querySelector('.add-block');
  if (!add) return;
  const container = v140TargetContainer();
  add.innerHTML = `<div class="v140-add-heading"><div><h3>Add block</h3><small>Adding to: <b>${container ? `🧱 ${escapeHtml(container.label || 'Container')}` : 'POST root'}</b></small></div>${container ? '<button type="button" class="mini-btn" id="v140AddToRoot">Use POST root</button>' : ''}</div>
  <div class="v140-add-section"><strong>CONTENT</strong><div class="add-grid"><button data-v140-add="text">📝 Text</button><button data-v140-add="heading">🔠 Heading</button><button data-v140-add="callout">💡 Callout</button><button data-v140-add="image">🖼️ Image</button><button data-v140-add="thumbnail">🔲 Thumbnail</button><button data-v140-add="gallery">🖼️ Gallery</button><button data-v140-add="youtube">▶️ YouTube</button><button data-v140-add="code">💻 Code Snippet</button></div></div>
  <div class="v140-add-section"><strong>STRUCTURED CONTENT</strong><div class="add-grid"><button data-v140-add="checklist">☑️ Checklist</button><button data-v140-add="steps">👣 Steps</button><button data-v140-add="facts">🏷️ Facts</button><button data-v140-add="progress">📊 Progress</button></div></div>
  <div class="v140-add-section"><strong>TIME & EVENTS</strong><div class="add-grid"><button data-v140-add="event">📅 Event</button><button data-v140-add="countdown">⏳ Countdown</button></div></div>
  <div class="v140-add-section"><strong>LAYOUT</strong><div class="add-grid"><button data-v140-add="separator">➖ Separator</button><button data-v140-add="container" class="v140-container-add">🧱 Container</button></div></div>
  <div class="v140-add-section"><strong>INTERACTIONS</strong><div class="add-grid"><button data-v140-add="link">🔗 Link</button><button data-v140-add="button_row">🔗 Button Row</button><button data-v140-add="open">🔘 Open / Ephemeral</button><button data-v140-add="select">🔽 Select</button></div></div>
  <details class="v140-special"><summary>SPECIAL</summary><div class="add-grid"><button data-v140-add="profile_select">🎮 MerfinUI Select</button><button data-v140-add="profile_open_list">📋 MerfinUI Profile List</button></div></details>`;
  $$('[data-v140-add]', add).forEach((button) => button.addEventListener('click', () => addBlock(button.dataset.v140Add)));
  $('#v140AddToRoot', add)?.addEventListener('click', () => { state.selectedBlockId = null; renderBlockList(); renderInspector(); });
};

function v150Breadcrumb(found) {
  const breadcrumb = document.createElement('div');
  breadcrumb.className = 'v140-breadcrumb';
  breadcrumb.innerHTML = found?.parent ? `Inside <b>🧱 ${escapeHtml(found.parent.label || 'Container')}</b><button type="button" class="mini-btn">Move to POST root</button>` : '<span>Location: <b>POST root</b></span>';
  if (found?.parent) breadcrumb.querySelector('button').addEventListener('click', () => {
    if (v140Roots().length >= 25) return toast('The POST root already has 25 blocks/containers.', 'error');
    pushUndo();
    found.list.splice(found.index, 1);
    const containerIndex = v140Roots().findIndex((item) => item.id === found.parent.id);
    v140Roots().splice(containerIndex + 1, 0, found.block);
    markDirty(); renderBlockList(); renderInspector();
  });
  els.inspector.prepend(breadcrumb);
}

const v150PreviousRenderInspector = renderInspector;
renderInspector = function v150RenderInspector() {
  const found = v140Find(state.selectedBlockId);
  const block = found?.block;
  if (!block || !V150_SMART_TYPES.has(block.type)) return v150PreviousRenderInspector();
  els.inspector.className = 'inspector-form';

  if (block.type === 'heading') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>🔠 Heading</h3><div class="v150-inline-fields"><label>Level<select id="v150HeadingLevel"><option value="1" ${block.level===1?'selected':''}>H1</option><option value="2" ${block.level===2?'selected':''}>H2</option><option value="3" ${block.level===3?'selected':''}>H3</option></select></label><label>Emoji / prefix<input id="v150HeadingEmoji" maxlength="24" value="${escapeAttr(block.emoji || '')}" placeholder="✨"></label></div><label>Title<input id="v150HeadingTitle" maxlength="200" value="${escapeAttr(block.title || '')}"></label><label>Subtitle<textarea id="v150HeadingSubtitle" rows="3">${escapeHtml(block.subtitle || '')}</textarea></label></div>`;
    bind('#v150HeadingLevel','change',(event)=>{pushUndo();block.level=Number(event.target.value);markDirty();renderPreview();});
    bindInput($('#v150HeadingEmoji',els.inspector),(event)=>{block.emoji=event.target.value;markDirty();});
    bindInput($('#v150HeadingTitle',els.inspector),(event)=>{block.title=event.target.value;markDirty();renderBlockList();});
    bindInput($('#v150HeadingSubtitle',els.inspector),(event)=>{block.subtitle=event.target.value;markDirty();});
  }

  if (block.type === 'callout') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>💡 Callout</h3><label>Tone<select id="v150CalloutTone"><option value="info" ${block.tone==='info'?'selected':''}>ℹ️ Info</option><option value="success" ${block.tone==='success'?'selected':''}>✅ Success</option><option value="warning" ${block.tone==='warning'?'selected':''}>⚠️ Warning</option><option value="danger" ${block.tone==='danger'?'selected':''}>🛑 Danger</option><option value="neutral" ${block.tone==='neutral'?'selected':''}>💬 Neutral</option></select></label><label>Title<input id="v150CalloutTitle" maxlength="200" value="${escapeAttr(block.title || '')}"></label>${toolbarHtml('v150CalloutContent')}<label>Content<textarea id="v150CalloutContent" rows="7">${escapeHtml(block.content || '')}</textarea></label></div>`;
    bind('#v150CalloutTone','change',(event)=>{pushUndo();block.tone=event.target.value;markDirty();renderPreview();});
    bindInput($('#v150CalloutTitle',els.inspector),(event)=>{block.title=event.target.value;markDirty();renderBlockList();});
    bindInput($('#v150CalloutContent',els.inspector),(event)=>{block.content=event.target.value;markDirty();}); bindToolbar();
  }

  if (block.type === 'checklist') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>☑️ Checklist</h3><label>Title<input id="v150ChecklistTitle" maxlength="200" value="${escapeAttr(block.title || '')}"></label><label>Items<textarea id="v150ChecklistItems" rows="9" spellcheck="false">${escapeHtml(v150ChecklistSpec(block))}</textarea></label><p class="v150-help"><code>[x]</code> completed · <code>[ ]</code> not completed · one item per line.</p></div>`;
    bindInput($('#v150ChecklistTitle',els.inspector),(event)=>{block.title=event.target.value;markDirty();});
    bindInput($('#v150ChecklistItems',els.inspector),(event)=>{block.items=v150ParseChecklist(event.target.value);markDirty();renderBlockList();});
  }

  if (block.type === 'steps') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>👣 Steps</h3><label>Title<input id="v150StepsTitle" maxlength="200" value="${escapeAttr(block.title || '')}"></label><label>Steps<textarea id="v150StepsItems" rows="10" spellcheck="false">${escapeHtml(v150StepsSpec(block))}</textarea></label><p class="v150-help">One step per line: <code>Step title | Description</code></p></div>`;
    bindInput($('#v150StepsTitle',els.inspector),(event)=>{block.title=event.target.value;markDirty();});
    bindInput($('#v150StepsItems',els.inspector),(event)=>{block.items=v150ParseSteps(event.target.value);markDirty();renderBlockList();});
  }

  if (block.type === 'facts') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>🏷️ Facts / Key values</h3><label>Title<input id="v150FactsTitle" maxlength="200" value="${escapeAttr(block.title || '')}"></label><label>Rows<textarea id="v150FactsItems" rows="9" spellcheck="false">${escapeHtml(v150FactsSpec(block))}</textarea></label><p class="v150-help">One row per line: <code>Label | Value</code></p></div>`;
    bindInput($('#v150FactsTitle',els.inspector),(event)=>{block.title=event.target.value;markDirty();});
    bindInput($('#v150FactsItems',els.inspector),(event)=>{block.items=v150ParseFacts(event.target.value);markDirty();renderBlockList();});
  }

  if (block.type === 'button_row') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>🔗 Button Row</h3><p class="v140-field-note">Places up to five URL buttons on one Discord Action Row instead of using one Section per link.</p><label>Buttons<textarea id="v150ButtonRows" rows="8" spellcheck="false">${escapeHtml(v150ButtonsSpec(block))}</textarea></label><p class="v150-help">One button per line: <code>Label | https://...</code> · maximum 5.</p></div>`;
    bindInput($('#v150ButtonRows',els.inspector),(event)=>{block.buttons=v150ParseButtons(event.target.value);markDirty();renderBlockList();});
  }

  if (block.type === 'event') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>📅 Event</h3><label>Title<input id="v150EventTitle" maxlength="200" value="${escapeAttr(block.title || '')}"></label>${toolbarHtml('v150EventDescription')}<label>Description<textarea id="v150EventDescription" rows="5">${escapeHtml(block.description || '')}</textarea></label><div class="v150-inline-fields"><label>Starts<input id="v150EventStart" type="datetime-local" value="${v150LocalDateTime(block.startEpoch)}"></label><label>Ends · optional<input id="v150EventEnd" type="datetime-local" value="${v150LocalDateTime(block.endEpoch)}"></label></div>${toolbarHtml('v150EventLocation')}<label>Where / channel<textarea id="v150EventLocation" rows="2">${escapeHtml(block.location || '')}</textarea></label><p class="v150-help">Discord timestamps automatically display in each member’s own timezone.</p></div>`;
    bindInput($('#v150EventTitle',els.inspector),(event)=>{block.title=event.target.value;markDirty();renderBlockList();});
    bindInput($('#v150EventDescription',els.inspector),(event)=>{block.description=event.target.value;markDirty();});
    bind('#v150EventStart','change',(event)=>{pushUndo();block.startEpoch=v150Epoch(event.target.value);markDirty();renderPreview();});
    bind('#v150EventEnd','change',(event)=>{pushUndo();block.endEpoch=event.target.value ? v150Epoch(event.target.value) : null;markDirty();renderPreview();});
    bindInput($('#v150EventLocation',els.inspector),(event)=>{block.location=event.target.value;markDirty();}); bindToolbar();
  }

  if (block.type === 'countdown') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>⏳ Countdown</h3><label>Title<input id="v150CountdownTitle" maxlength="200" value="${escapeAttr(block.title || '')}"></label>${toolbarHtml('v150CountdownText')}<label>Supporting text<textarea id="v150CountdownText" rows="4">${escapeHtml(block.text || '')}</textarea></label><label>Target date & time<input id="v150CountdownTarget" type="datetime-local" value="${v150LocalDateTime(block.targetEpoch)}"></label><div class="v150-live-sample">Discord will show: ${block.targetEpoch ? `<b>${escapeHtml(renderDiscordTimestamp(block.targetEpoch,'R'))}</b>` : 'choose a target'}</div></div>`;
    bindInput($('#v150CountdownTitle',els.inspector),(event)=>{block.title=event.target.value;markDirty();renderBlockList();});
    bindInput($('#v150CountdownText',els.inspector),(event)=>{block.text=event.target.value;markDirty();});
    bind('#v150CountdownTarget','change',(event)=>{pushUndo();block.targetEpoch=v150Epoch(event.target.value);markDirty();renderInspector();renderPreview();}); bindToolbar();
  }

  if (block.type === 'code') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>💻 Code Snippet</h3><div class="v150-inline-fields"><label>Language<input id="v150CodeLanguage" maxlength="30" value="${escapeAttr(block.language || '')}" placeholder="lua"></label><label>Caption<input id="v150CodeCaption" maxlength="300" value="${escapeAttr(block.caption || '')}"></label></div><label>Code<textarea id="v150CodeValue" rows="14" spellcheck="false">${escapeHtml(block.code || '')}</textarea></label></div>`;
    bindInput($('#v150CodeLanguage',els.inspector),(event)=>{block.language=event.target.value;markDirty();});
    bindInput($('#v150CodeCaption',els.inspector),(event)=>{block.caption=event.target.value;markDirty();});
    bindInput($('#v150CodeValue',els.inspector),(event)=>{block.code=event.target.value;markDirty();renderBlockList();});
  }

  if (block.type === 'progress') {
    els.inspector.innerHTML = `<div class="inspector-card"><h3>📊 Progress</h3><label>Label<input id="v150ProgressLabel" maxlength="200" value="${escapeAttr(block.label || '')}"></label><div class="v150-triple-fields"><label>Current<input id="v150ProgressCurrent" type="number" min="0" step="1" value="${escapeAttr(block.current ?? 0)}"></label><label>Total<input id="v150ProgressTotal" type="number" min="1" step="1" value="${escapeAttr(block.total ?? 1)}"></label><label>Segments<input id="v150ProgressSegments" type="number" min="5" max="20" step="1" value="${escapeAttr(block.segments ?? 10)}"></label></div><label class="compact-check"><input id="v150ProgressNumbers" type="checkbox" ${block.showNumbers !== false ? 'checked' : ''}> Show current / total</label><label>Note<textarea id="v150ProgressNote" rows="3">${escapeHtml(block.note || '')}</textarea></label><div class="v150-live-sample">${renderMarkdown(v150ProgressText(block))}</div></div>`;
    const update=()=>{markDirty();renderPreview();};
    bindInput($('#v150ProgressLabel',els.inspector),(event)=>{block.label=event.target.value;update();renderBlockList();});
    bindInput($('#v150ProgressCurrent',els.inspector),(event)=>{block.current=Number(event.target.value);update();});
    bindInput($('#v150ProgressTotal',els.inspector),(event)=>{block.total=Number(event.target.value);update();});
    bindInput($('#v150ProgressSegments',els.inspector),(event)=>{block.segments=Number(event.target.value);update();});
    bind('#v150ProgressNumbers','change',(event)=>{pushUndo();block.showNumbers=event.target.checked;update();renderInspector();});
    bindInput($('#v150ProgressNote',els.inspector),(event)=>{block.note=event.target.value;update();});
  }

  v150Breadcrumb(found);
};

const v150PreviousPreviewBlock = renderPreviewBlock;
renderPreviewBlock = function v150RenderPreviewBlock(block) {
  if (!V150_SMART_TYPES.has(block?.type)) return v150PreviousPreviewBlock(block);
  if (block.type === 'button_row') return `<div class="v150-button-row">${(block.buttons || []).map((button)=>`<button class="mock-btn" type="button" disabled>${escapeHtml(button.label || 'Link')}</button>`).join('')}</div>`;
  const content = v150SmartText(block);
  if (block.type === 'callout') return `<div class="v150-callout v150-callout-${escapeAttr(block.tone || 'info')}">${renderMarkdown(content)}</div>`;
  return `<div class="preview-block preview-text v150-smart-preview v150-${escapeAttr(block.type)}">${renderMarkdown(content)}</div>`;
};

const v150PreviousUnitList = unitList;
unitList = function v150UnitList(block) {
  if (!V150_SMART_TYPES.has(block?.type)) return v150PreviousUnitList(block);
  if (block.type === 'button_row') return [{ count: 1 + (block.buttons?.length || 0), text: 0 }];
  return [{ count: 1, text: v150SmartText(block).length }];
};

v140SetupTemplates = function v150SetupTemplates() {
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
  let shown = all.filter((template) => {
    const categoryMatch = v150TemplateUi.category === 'All'
      || (v150TemplateUi.category === 'Recommended' ? template.featured : template.category === v150TemplateUi.category);
    if (!categoryMatch) return false;
    if (!search) return true;
    return `${template.name} ${template.description || ''} ${template.category || ''}`.toLowerCase().includes(search);
  });
  host.innerHTML = `<div class="v140-template-title"><strong>Choose a starting point</strong><small>Pick a category first. You can still start completely blank, or choose a ready-made structure and change every block afterwards.</small></div><div class="v150-template-toolbar"><div class="v150-category-tabs">${V150_TEMPLATE_CATEGORIES.map((category)=>`<button type="button" data-v150-category="${escapeAttr(category)}" class="${v150TemplateUi.category===category?'active':''}">${escapeHtml(category)}</button>`).join('')}</div><label class="v150-template-search"><span>Search templates</span><input id="v150TemplateSearch" type="search" value="${escapeAttr(v150TemplateUi.search)}" placeholder="Search announcement, raid, guide…"></label></div><div class="v150-template-count">${shown.length} template${shown.length===1?'':'s'} · ${escapeHtml(v150TemplateUi.category)}</div><div class="v140-template-grid v150-template-grid">${shown.map((template)=>`<button type="button" data-v140-template="${escapeAttr(template.value)}" class="${els.newTemplate.value===template.value?'active':''}"><span class="v150-template-icon">${escapeHtml(template.icon || '📄')}</span><span class="v150-template-copy"><strong>${escapeHtml(template.name)}</strong><small>${escapeHtml(template.description || '')}</small></span><span class="v150-template-badges"><i>${escapeHtml(template.category || 'Other')}</i><i class="${V150_CONTAINER_TEMPLATES.has(template.value)?'container':'plain'}">${V150_CONTAINER_TEMPLATES.has(template.value)?'Container':'Plain'}</i></span></button>`).join('')}</div>${shown.length?'':'<div class="v150-template-empty">No templates match this category/search.</div>'}`;
  $$('[data-v150-category]',host).forEach((button)=>button.addEventListener('click',()=>{v150TemplateUi.category=button.dataset.v150Category;v140SetupTemplates();}));
  $('#v150TemplateSearch',host)?.addEventListener('input',(event)=>{v150TemplateUi.search=event.target.value;v140SetupTemplates();requestAnimationFrame(()=>{const input=$('#v150TemplateSearch');input?.focus();input?.setSelectionRange(input.value.length,input.value.length);});});
  $$('[data-v140-template]',host).forEach((button)=>button.addEventListener('click',()=>{els.newTemplate.value=button.dataset.v140Template;$$('[data-v140-template]',host).forEach((node)=>node.classList.toggle('active',node===button));}));
};

v140BuildAddMenu();
v140SetupTemplates();
document.title = 'Timewizzard Web Builder v1.5.0';
const v150BrandSmall = document.querySelector('.brand small');
if (v150BrandSmall) v150BrandSmall.textContent = 'v1.5.0 · Smart blocks + template categories';
