import { DEFAULT_ACCENT_COLOR } from '../constants.js';
import { makeShortId } from './ids.js';
import { BUILDER_SCHEMA_VERSION, normalizeBuilderStructure } from './schema.js';

function block(type, values = {}) {
  return { id: makeShortId(3), type, ...values };
}

function container(label, accentColor, children = []) {
  return block('container', {
    label,
    accentColor,
    collapsed: false,
    children
  });
}

function baseBuilder() {
  return {
    schemaVersion: BUILDER_SCHEMA_VERSION,
    mode: 'components_v2',
    // Kept as a backwards-compatible default for native tools and migrations.
    // Root-level content has no accent in v1.4; containers own their colors.
    accentColor: DEFAULT_ACCENT_COLOR,
    blocks: [],
    actions: {}
  };
}

export const POST_TEMPLATES = [
  { name: 'Blank post', value: 'blank', category: 'Basic', description: 'A completely plain Discord post with no container.' },
  { name: 'Simple announcement', value: 'announcement_simple', category: 'Basic', description: 'Heading, text and separator without an embed/container.' },
  { name: 'Styled announcement', value: 'announcement_styled', category: 'Basic', description: 'Announcement inside a colored container.' },
  { name: 'Guide / information', value: 'guide', category: 'Basic', description: 'Structured guide inside a clean information container.' },
  { name: 'FAQ', value: 'faq', category: 'Basic', description: 'Questions and answers in a plain, easy-to-scan post.' },
  { name: 'Links / resources', value: 'links', category: 'Basic', description: 'Useful resources with link buttons.' },
  { name: 'Raid / event', value: 'raid_event', category: 'Community', description: 'Event information prepared for timestamps, roles and channels.' },
  { name: 'Recruitment', value: 'recruitment', category: 'Community', description: 'Guild/team recruitment structure with requirements and contact.' },
  { name: 'Patch / update notes', value: 'patch_update', category: 'Community', description: 'Compact changelog/update layout.' },
  { name: 'Important / warning', value: 'warning', category: 'Community', description: 'High-visibility warning container.' },
  { name: 'Media / gallery', value: 'media_gallery', category: 'Media', description: 'Title, gallery and supporting description.' },
  { name: 'YouTube video', value: 'youtube', category: 'Media', description: 'Smart YouTube block: paste the video URL and Timewizzard builds the presentation.' },
  { name: 'MerfinUI — compact select', value: 'merfin_select', category: 'Special', description: 'Class/resolution profile dropdown.' },
  { name: 'MerfinUI — profile list', value: 'merfin_open_list', category: 'Special', description: 'Compact profile overview without legacy Open buttons.' }
];

export function createBuilderTemplate(templateKey = 'blank', title = 'Informationsopslag') {
  // Accept the v1.3 template key for old bookmarks/API callers.
  if (templateKey === 'announcement') templateKey = 'announcement_styled';

  const builder = baseBuilder();
  if (templateKey === 'blank') return builder;

  if (templateKey === 'announcement_simple') {
    builder.blocks.push(
      block('text', { content: `# 📢 ${title}\nWrite the important announcement here.` }),
      block('separator', { divider: true, spacing: 2 }),
      block('text', { content: '## What you need to know\n- First important point\n- Second important point\n- Third important point\n\n-# Edit or remove placeholder text before publishing.' })
    );
    return builder;
  }

  if (templateKey === 'announcement_styled') {
    builder.blocks.push(container('Announcement', 0x5865F2, [
      block('text', { content: `# 📢 ${title}\nWrite the important announcement here.` }),
      block('separator', { divider: true, spacing: 2 }),
      block('text', { content: '## What you need to know\n- First important point\n- Second important point\n- Third important point' })
    ]));
    return builder;
  }

  if (templateKey === 'guide') {
    builder.blocks.push(container('Guide', 0x3498DB, [
      block('text', { content: `# 📘 ${title}\nShort introduction explaining what this guide covers.` }),
      block('separator', { divider: true, spacing: 1 }),
      block('text', { content: '## Step 1\nExplain the first step.\n\n## Step 2\nExplain the next step.\n\n## Tips\n- Add useful notes\n- Link related channels with **Discord Insert**' })
    ]));
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

  if (templateKey === 'raid_event') {
    builder.blocks.push(container('Raid / Event', 0xE67E22, [
      block('text', { content: `# ⚔️ ${title}\nUse **Discord Insert → Time** for the event time and **Roles/Channels** for the relevant mentions.` }),
      block('separator', { divider: true, spacing: 1 }),
      block('text', { content: '## Schedule\n📅 Date: <t:0:D>\n🕒 Starts: <t:0:t>\n\n## Information\n- Meeting point / channel\n- Requirements\n- What members should prepare' })
    ]));
    return builder;
  }

  if (templateKey === 'recruitment') {
    builder.blocks.push(container('Recruitment', 0x2ECC71, [
      block('text', { content: `# 🛡️ ${title}\nWe are looking for new members to join the team.` }),
      block('separator', { divider: true, spacing: 1 }),
      block('text', { content: '## We are looking for\n- Role / class / experience\n- Availability\n- Team-first attitude\n\n## What we offer\n- Raid / event schedule\n- Community information\n\n## Contact\nUse **Discord Insert** to mention the right person or channel.' })
    ]));
    return builder;
  }

  if (templateKey === 'patch_update') {
    builder.blocks.push(container('Update notes', 0x9B59B6, [
      block('text', { content: `# 🛠️ ${title}\n-# Update / changelog` }),
      block('separator', { divider: true, spacing: 1 }),
      block('text', { content: '## Added\n- New feature\n\n## Changed\n- Updated behaviour\n\n## Fixed\n- Resolved issue' })
    ]));
    return builder;
  }

  if (templateKey === 'warning') {
    builder.blocks.push(container('Important', 0xED4245, [
      block('text', { content: `# ⚠️ ${title}\nWrite the important warning or action members must take.` }),
      block('separator', { divider: true, spacing: 2 }),
      block('text', { content: '**Required action**\nExplain exactly what people need to do and when.' })
    ]));
    return builder;
  }

  if (templateKey === 'media_gallery') {
    builder.blocks.push(
      block('text', { content: `# 🖼️ ${title}\nAdd a short introduction to the gallery.` }),
      block('gallery', { items: [
        { url: 'https://example.com/image1.png', description: 'Image 1', spoiler: false },
        { url: 'https://example.com/image2.png', description: 'Image 2', spoiler: false }
      ] }),
      block('text', { content: '-# Add, remove or reorder gallery images in the Inspector.' })
    );
    return builder;
  }

  if (templateKey === 'youtube') {
    builder.blocks.push(
      block('text', { content: `# ▶️ ${title}\nAdd a short introduction to the video.` }),
      block('youtube', {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Video title',
        description: 'Add a short description or call to action.',
        showThumbnail: true,
        showButton: true,
        buttonLabel: 'Watch on YouTube'
      })
    );
    return builder;
  }

  if (templateKey === 'merfin_select') {
    builder.blocks.push(
      block('text', { content: `# ${title}\nVælg din World of Warcraft class og opløsning nedenfor. Den korrekte tekststreng sendes privat.` }),
      block('separator', { divider: true, spacing: 2 }),
      block('profile_select', { placeholder: 'Vælg class og opløsning…' })
    );
    return builder;
  }

  if (templateKey === 'merfin_open_list') {
    builder.blocks.push(
      block('text', { content: `# ${title}\nOversigt over de tilgængelige World of Warcraft class- og opløsningsprofiler.` }),
      block('separator', { divider: true, spacing: 2 }),
      block('profile_open_list')
    );
    return builder;
  }

  throw new Error(`Ukendt template: ${templateKey}`);
}

export function migrateLegacyPostToBuilder(post) {
  if (post?.builder?.blocks && post?.builder?.actions) {
    return normalizeBuilderStructure(post.builder, { preserveLegacyAppearance: true });
  }

  const builder = baseBuilder();
  builder.accentColor = Number.isInteger(post?.accentColor)
    ? post.accentColor
    : Number.isInteger(post?.color)
      ? post.color
      : DEFAULT_ACCENT_COLOR;

  const heading = post?.heading || post?.title || post?.forumTitle || 'Information';
  const children = [];
  if (post?.bannerUrl) {
    children.push(block('image', { url: post.bannerUrl, description: `${heading} header banner` }));
  }
  const description = post?.description || '';
  children.push(
    block('text', { content: `# ${heading}${description ? `\n${description}` : ''}` }),
    block('separator', { divider: true, spacing: 2 }),
    block('profile_select', { placeholder: 'Vælg class og opløsning…' })
  );
  builder.blocks.push(container('Migrated post', builder.accentColor, children));
  return builder;
}
