// Timewizzard v1.6.4 hotfix — Quick Announcement template family.
// These templates are injected into the Web Builder catalogue and are created
// through the existing blank-draft API, then replaced with a validated builder.

const QUICK_ANNOUNCEMENT_TEMPLATES = Object.freeze([
  {
    name: 'Quick Announcement',
    value: 'quick_announcement',
    category: 'Basic',
    icon: '📢',
    featured: true,
    description: 'Fast title + message layout for a clear announcement to many people.'
  },
  {
    name: 'Quick Announcement + Image',
    value: 'quick_announcement_image',
    category: 'Basic',
    icon: '🖼️',
    featured: true,
    description: 'Announcement with a full-width banner/image as the visual attention grabber.'
  },
  {
    name: 'Quick Announcement + Action',
    value: 'quick_announcement_action',
    category: 'Basic',
    icon: '🎯',
    featured: true,
    description: 'Short announcement with a highlighted action and a direct link button.'
  }
]);

const QUICK_ANNOUNCEMENT_KEYS = new Set(QUICK_ANNOUNCEMENT_TEMPLATES.map((template) => template.value));

function quickAnnouncementBlock(type, values = {}) {
  return { id: shortId(3), type, ...values };
}

function quickAnnouncementBuilder(templateKey, title) {
  const builder = {
    schemaVersion: 2,
    mode: 'components_v2',
    accentColor: 0xF1C40F,
    blocks: [],
    actions: {}
  };

  if (templateKey === 'quick_announcement') {
    builder.blocks.push(
      quickAnnouncementBlock('heading', {
        level: 1,
        emoji: '📢',
        title,
        subtitle: 'A short update for everyone.'
      }),
      quickAnnouncementBlock('text', {
        content: 'Write the main announcement here.\n\nKeep the important information short, clear and easy to scan.'
      })
    );
    return builder;
  }

  if (templateKey === 'quick_announcement_image') {
    builder.blocks.push(
      quickAnnouncementBlock('image', {
        url: 'https://example.com/announcement-banner.png',
        description: `${title} announcement banner`,
        spoiler: false
      }),
      quickAnnouncementBlock('heading', {
        level: 1,
        emoji: '📢',
        title,
        subtitle: 'A short update with a visual banner.'
      }),
      quickAnnouncementBlock('text', {
        content: 'Write the main announcement here.\n\nReplace the sample image URL with your own banner or attention-grabbing image before publishing.'
      })
    );
    return builder;
  }

  if (templateKey === 'quick_announcement_action') {
    builder.blocks.push(
      quickAnnouncementBlock('heading', {
        level: 1,
        emoji: '📢',
        title,
        subtitle: 'A short update with one clear action.'
      }),
      quickAnnouncementBlock('text', {
        content: 'Write the main announcement here. Keep the context short so the requested action stands out.'
      }),
      quickAnnouncementBlock('callout', {
        tone: 'warning',
        title: 'Action needed',
        content: 'Explain exactly what people should do, and add a deadline if relevant.'
      }),
      quickAnnouncementBlock('button_row', {
        buttons: [{ label: 'Open details', url: 'https://example.com' }]
      })
    );
    return builder;
  }

  return null;
}

function injectQuickAnnouncementTemplates() {
  if (!state.bootstrap?.templates) return false;
  const existing = new Set(state.bootstrap.templates.map((template) => template.value));
  const missing = QUICK_ANNOUNCEMENT_TEMPLATES.filter((template) => !existing.has(template.value));
  if (missing.length) {
    const templates = [...state.bootstrap.templates];
    const blankIndex = templates.findIndex((template) => template.value === 'blank');
    templates.splice(blankIndex >= 0 ? blankIndex + 1 : 0, 0, ...missing);
    state.bootstrap.templates = templates;
  }

  if (els.newTemplate) {
    for (const template of QUICK_ANNOUNCEMENT_TEMPLATES) {
      if (els.newTemplate.querySelector(`option[value="${template.value}"]`)) continue;
      const option = document.createElement('option');
      option.value = template.value;
      option.textContent = template.name;
      els.newTemplate.append(option);
    }
  }

  if (typeof v140SetupTemplates === 'function') v140SetupTemplates();
  return true;
}

async function createQuickAnnouncementDraft(event) {
  const templateKey = els.newTemplate?.value;
  if (!QUICK_ANNOUNCEMENT_KEYS.has(templateKey)) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const title = String(els.newTitle?.value || '').trim();
  const destination = state.destinations?.find((item) => item.id === els.newForum?.value);
  if (!title) return toast('The post title cannot be empty.', 'error');
  const tagIds = validateSelectedTags(destination, els.newTag);
  if (!tagIds) return;

  let temporaryScope = null;
  try {
    const created = await api('/api/drafts', {
      method: 'POST',
      body: {
        title,
        destinationId: els.newForum.value,
        tagIds,
        template: 'blank'
      }
    });
    temporaryScope = created.scope;

    const builder = quickAnnouncementBuilder(templateKey, title);
    if (!builder) throw new Error('Quick Announcement template could not be created.');

    const saved = await api(`/api/entities/${created.scope.kind}/${encodeURIComponent(created.scope.id)}`, {
      method: 'PUT',
      body: { title, builder }
    });
    temporaryScope = null;

    els.newDraftDialog.close();
    await refreshBootstrap({ keepSelection: false });
    await loadEntity(saved.scope.kind, saved.scope.id, { skipDirtyCheck: true });
    toast('Quick Announcement draft created.', 'success');
  } catch (error) {
    if (temporaryScope) {
      await api(`/api/entities/${temporaryScope.kind}/${encodeURIComponent(temporaryScope.id)}`, { method: 'DELETE' }).catch(() => {});
    }
    toast(error.message, 'error');
  }
}

const previousQuickAnnouncementRefreshBootstrap = refreshBootstrap;
refreshBootstrap = async function refreshBootstrapWithQuickAnnouncements(...args) {
  const result = await previousQuickAnnouncementRefreshBootstrap(...args);
  injectQuickAnnouncementTemplates();
  return result;
};

function quickAnnouncementInit() {
  document.title = 'Timewizzard Web Builder v1.6.4';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.6.4 · Quick Announcement templates';

  els.newDraftForm?.addEventListener('submit', createQuickAnnouncementDraft, true);

  document.addEventListener('click', (event) => {
    if (!event.target.closest('#newDraftBtn,[data-action="new-draft"]')) return;
    injectQuickAnnouncementTemplates();
  }, true);

  let attempts = 0;
  const waitForBootstrap = () => {
    if (injectQuickAnnouncementTemplates()) return;
    attempts += 1;
    if (attempts < 30) setTimeout(waitForBootstrap, 100);
  };
  waitForBootstrap();
}

quickAnnouncementInit();
