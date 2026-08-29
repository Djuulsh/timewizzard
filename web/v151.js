// Timewizzard v1.5.1 — Heading emoji picker reusing the Discord Insert emoji browser.

function v151HeadingEmojiPreview(value) {
  const emoji = String(value || '').trim();
  if (!emoji) return '<span class="v151-heading-emoji-empty">None</span>';
  return `<span class="v151-heading-emoji-render">${renderInline(emoji)}</span>`;
}

async function v151OpenHeadingEmojiPicker(block) {
  const target = document.getElementById('v151HeadingEmojiTarget');
  if (!target) return;

  target.value = '';
  target.focus();
  target.setSelectionRange?.(0, 0);

  const applySelectedEmoji = () => {
    const selected = String(target.value || '').trim();
    if (!selected) return;
    pushUndo();
    block.emoji = selected;
    markDirty();
    renderPreview();
    renderBlockList();
    document.getElementById('v131PickerDialog')?.close();
    renderInspector();
  };
  target.addEventListener('input', applySelectedEmoji, { once: true });

  try {
    v131State.pickerTab = 'emojis';
    v131State.pickerSearch = '';
    v131State.emojiSource = 'all';
    v131State.emojiCategory = 'all';
    await v131OpenPicker(target.id);

    const dialog = document.getElementById('v131PickerDialog');
    if (!dialog) return;
    dialog.classList.add('v151-emoji-only');
    const title = dialog.querySelector('.dialog-head h2');
    const description = dialog.querySelector('.dialog-head p');
    if (title) title.textContent = 'Choose heading emoji';
    if (description) description.textContent = 'Choose one Discord emoji or server emoji. Search and filters work exactly like Discord Insert.';

    dialog.addEventListener('close', () => {
      dialog.classList.remove('v151-emoji-only');
      const currentTitle = dialog.querySelector('.dialog-head h2');
      const currentDescription = dialog.querySelector('.dialog-head p');
      if (currentTitle) currentTitle.textContent = 'Discord Insert';
      if (currentDescription) currentDescription.textContent = 'Insert several items while this window stays open. Close with Esc, × or Done.';
    }, { once: true });
  } catch (error) {
    target.removeEventListener('input', applySelectedEmoji);
    toast(error.message, 'error');
  }
}

const v151PreviousRenderInspector = renderInspector;
renderInspector = function v151RenderInspector() {
  const found = v140Find(state.selectedBlockId);
  const block = found?.block;
  if (block?.type !== 'heading') return v151PreviousRenderInspector();

  els.inspector.className = 'inspector-form';
  els.inspector.innerHTML = `
    <div class="inspector-card">
      <h3>🔠 Heading</h3>
      <div class="v150-inline-fields v151-heading-top-row">
        <label>Level
          <select id="v150HeadingLevel">
            <option value="1" ${block.level === 1 ? 'selected' : ''}>H1</option>
            <option value="2" ${block.level === 2 ? 'selected' : ''}>H2</option>
            <option value="3" ${block.level === 3 ? 'selected' : ''}>H3</option>
          </select>
        </label>
        <label>Emoji
          <div class="v151-heading-emoji-control">
            <button type="button" id="v151HeadingEmojiButton" class="v151-heading-emoji-button" title="Choose emoji">
              ${v151HeadingEmojiPreview(block.emoji)}
              <small>Choose emoji</small>
            </button>
            <button type="button" id="v151HeadingEmojiNone" class="btn ghost v151-heading-emoji-none" ${block.emoji ? '' : 'disabled'}>None</button>
            <input id="v151HeadingEmojiTarget" class="v151-heading-emoji-target" aria-hidden="true" tabindex="-1">
          </div>
        </label>
      </div>
      <label>Title<input id="v150HeadingTitle" maxlength="200" value="${escapeAttr(block.title || '')}"></label>
      <label>Subtitle<textarea id="v150HeadingSubtitle" rows="3">${escapeHtml(block.subtitle || '')}</textarea></label>
      <p class="v150-help">Click the emoji box to browse Discord and server emojis visually. Choose <b>None</b> to publish the heading without an emoji.</p>
    </div>`;

  bind('#v150HeadingLevel', 'change', (event) => {
    pushUndo();
    block.level = Number(event.target.value);
    markDirty();
    renderPreview();
  });
  bindInput($('#v150HeadingTitle', els.inspector), (event) => {
    block.title = event.target.value;
    markDirty();
    renderBlockList();
  });
  bindInput($('#v150HeadingSubtitle', els.inspector), (event) => {
    block.subtitle = event.target.value;
    markDirty();
  });
  bind('#v151HeadingEmojiButton', 'click', () => v151OpenHeadingEmojiPicker(block));
  bind('#v151HeadingEmojiNone', 'click', () => {
    if (!block.emoji) return;
    pushUndo();
    block.emoji = '';
    markDirty();
    renderPreview();
    renderBlockList();
    renderInspector();
  });

  v150Breadcrumb(found);
};

document.title = 'Timewizzard Web Builder v1.5.1';
const v151BrandSmall = document.querySelector('.brand small');
if (v151BrandSmall) v151BrandSmall.textContent = 'v1.5.1 · Visual heading emoji picker';
