import { DEFAULT_ACCENT_COLOR } from '../constants.js';
import { makeShortId } from './ids.js';

function block(type, values = {}) {
  return {
    id: makeShortId(3),
    type,
    ...values
  };
}

export const POST_TEMPLATES = [
  { name: 'Tom builder', value: 'blank' },
  { name: 'MerfinUI — compact select', value: 'merfin_select' },
  { name: 'MerfinUI — Open list (legacy)', value: 'merfin_open_list' }
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
        content: `# ${title}\nVælg din World of Warcraft class og opløsning, og tryk **Open** for at få tekststrengen privat.`
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
      : DEFAULT_ACCENT_COLOR,
    blocks: [],
    actions: {}
  };

  if (post?.bannerUrl) {
    builder.blocks.push(block('image', {
      url: post.bannerUrl,
      description: `${post.heading || post.title || 'Information'} header banner`
    }));
  }

  const heading = post?.heading || post?.title || 'Information';
  const description = post?.description || '';
  builder.blocks.push(
    block('text', {
      content: `# ${heading}${description ? `\n${description}` : ''}`
    }),
    block('separator', { divider: true, spacing: 2 }),
    block('profile_open_list')
  );

  return builder;
}
