import { DEFAULT_ACCENT_COLOR } from '../constants.js';
import { makeShortId } from './ids.js';

function block(type, values = {}) {
  return {
    id: makeShortId(3),
    type,
    ...values
  };
}

function action(builder, { title, content }) {
  const id = makeShortId(4);
  builder.actions[id] = { id, type: 'ephemeral_text', title, content, children: [], presentation: 'buttons' };
  return id;
}

export const POST_TEMPLATES = [
  { name: 'Blank builder', value: 'blank' },
  { name: 'Announcement', value: 'announcement' },
  { name: 'Guide / information', value: 'guide' },
  { name: 'FAQ', value: 'faq' },
  { name: 'Links / resources', value: 'links' },
  { name: 'YouTube video', value: 'youtube' },
  { name: 'MerfinUI — compact select', value: 'merfin_select' },
  { name: 'MerfinUI — profile list (legacy)', value: 'merfin_open_list' }
];

export function createBuilderTemplate(templateKey = 'blank', title = 'Informationsopslag') {
  const builder = {
    schemaVersion: 1,
    mode: 'components_v2',
    accentColor: DEFAULT_ACCENT_COLOR,
    blocks: [],
    actions: {}
  };

  if (templateKey === 'blank') return builder;

  if (templateKey === 'announcement') {
    builder.blocks.push(
      block('text', { content: `# 📢 ${title}\nWrite the important announcement here.` }),
      block('separator', { divider: true, spacing: 2 }),
      block('text', { content: '## What you need to know\n- First important point\n- Second important point\n- Third important point\n\n-# Edit or remove any placeholder text before publishing.' })
    );
    return builder;
  }

  if (templateKey === 'guide') {
    builder.blocks.push(
      block('text', { content: `# 📘 ${title}\nShort introduction explaining what this guide covers.` }),
      block('separator', { divider: true, spacing: 1 }),
      block('text', { content: '## Step 1\nExplain the first step.\n\n## Step 2\nExplain the next step.\n\n## Tips\n- Add useful notes\n- Link related channels with **Discord Insert**' })
    );
    return builder;
  }

  if (templateKey === 'faq') {
    builder.blocks.push(
      block('text', { content: `# ❓ ${title}\nFrequently asked questions and quick answers.` }),
      block('separator', { divider: true, spacing: 1 }),
      block('text', { content: '## Question one?\nAnswer the first question here.\n\n## Question two?\nAnswer the second question here.\n\n## Need more help?\nPoint members to the correct channel or person.' })
    );
    return builder;
  }

  if (templateKey === 'links') {
    builder.blocks.push(
      block('text', { content: `# 🔗 ${title}\nUseful links and resources in one place.` }),
      block('separator', { divider: true, spacing: 1 }),
      block('link', { text: '🌐 • **Primary resource**\nShort description of the destination.', label: 'Open', url: 'https://example.com' }),
      block('link', { text: '📚 • **Documentation**\nAdd another useful resource here.', label: 'Open', url: 'https://example.com/docs' })
    );
    return builder;
  }

  if (templateKey === 'youtube') {
    builder.blocks.push(
      block('text', { content: `# ▶️ ${title}\nAdd a short introduction to the video.\n\n-# Replace VIDEO_ID in the thumbnail and link before publishing.` }),
      block('image', { url: 'https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg', description: `${title} YouTube thumbnail`, spoiler: false }),
      block('container', { label: 'Video actions', accentColor: 0xFF0000 }),
      block('text', { content: '## Watch the video\nAdd a short description, chapter note or call to action here.' }),
      block('link', { text: '▶️ • **Open on YouTube**', label: 'Watch video', url: 'https://www.youtube.com/watch?v=VIDEO_ID' })
    );
    return builder;
  }

  if (templateKey === 'merfin_select') {
    builder.blocks.push(
      block('text', {
        content: `# ${title}\nVælg din World of Warcraft class og opløsning nedenfor. Den korrekte tekststreng sendes privat.`
      }),
      block('separator', { divider: true, spacing: 2 }),
      block('profile_select', { placeholder: 'Vælg class og opløsning…' })
    );
    return builder;
  }

  if (templateKey === 'merfin_open_list') {
    builder.blocks.push(
      block('text', {
        content: `# ${title}\nOversigt over de tilgængelige World of Warcraft class- og opløsningsprofiler.`
      }),
      block('separator', { divider: true, spacing: 2 }),
      block('profile_open_list')
    );
    return builder;
  }

  throw new Error(`Ukendt template: ${templateKey}`);
}

export function migrateLegacyPostToBuilder(post) {
  if (post?.builder?.blocks && post?.builder?.actions) {
    return post.builder;
  }

  const builder = {
    schemaVersion: 1,
    mode: 'components_v2',
    accentColor: Number.isInteger(post?.accentColor)
      ? post.accentColor
      : Number.isInteger(post?.color)
        ? post.color
        : DEFAULT_ACCENT_COLOR,
    blocks: [],
    actions: {}
  };

  const heading = post?.heading || post?.title || post?.forumTitle || 'Information';

  if (post?.bannerUrl) {
    builder.blocks.push(block('image', {
      url: post.bannerUrl,
      description: `${heading} header banner`
    }));
  }

  const description = post?.description || '';
  builder.blocks.push(
    block('text', {
      content: `# ${heading}${description ? `\n${description}` : ''}`
    }),
    block('separator', { divider: true, spacing: 2 }),
    block('profile_select', { placeholder: 'Vælg class og opløsning…' })
  );

  return builder;
}
