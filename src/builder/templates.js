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
    accentColor: DEFAULT_ACCENT_COLOR,
    blocks: [],
    actions: {}
  };
}

function futureEpoch(minutesFromNow) {
  return Math.floor(Date.now() / 1000) + Math.round(minutesFromNow * 60);
}

export const POST_TEMPLATES = [
  { name: 'Blank post', value: 'blank', category: 'Basic', icon: '📄', featured: true, description: 'A completely plain Discord post with no container.' },
  { name: 'Simple announcement', value: 'announcement_simple', category: 'Basic', icon: '📢', featured: true, description: 'Heading, text and separator without an embed/container.' },
  { name: 'Styled announcement', value: 'announcement_styled', category: 'Basic', icon: '📣', featured: true, description: 'Announcement inside a colored container.' },
  { name: 'FAQ', value: 'faq', category: 'Basic', icon: '❓', description: 'Questions and answers in a plain, easy-to-scan post.' },
  { name: 'Links / resources', value: 'links', category: 'Basic', icon: '🔗', description: 'Useful resources with link buttons.' },

  { name: 'Welcome / onboarding', value: 'welcome_onboarding', category: 'Community', icon: '👋', featured: true, description: 'Welcome new members with first steps and useful links.' },
  { name: 'Rules / guidelines', value: 'rules_guidelines', category: 'Community', icon: '📜', featured: true, description: 'Readable rules, expectations and acknowledgement steps.' },
  { name: 'Recruitment', value: 'recruitment', category: 'Community', icon: '🛡️', featured: true, description: 'Guild/team recruitment structure with requirements and contact.' },
  { name: 'Staff / team directory', value: 'staff_directory', category: 'Community', icon: '👥', description: 'Present officers, team leads and contact responsibilities.' },

  { name: 'Raid / event', value: 'raid_event', category: 'Events', icon: '⚔️', featured: true, description: 'Event information prepared for timestamps, roles and channels.' },
  { name: 'Meeting / agenda', value: 'meeting_agenda', category: 'Events', icon: '🗓️', description: 'Meeting time, agenda items and meeting links in one post.' },
  { name: 'Weekly schedule', value: 'weekly_schedule', category: 'Events', icon: '📆', description: 'A compact recurring schedule for raids, events or activities.' },
  { name: 'Giveaway / contest', value: 'giveaway', category: 'Events', icon: '🎁', description: 'Prize, requirements and a live Discord countdown.' },

  { name: 'Guide / information', value: 'guide', category: 'Guides', icon: '📘', featured: true, description: 'Structured guide inside a clean information container.' },
  { name: 'Support / troubleshooting', value: 'support_troubleshooting', category: 'Guides', icon: '🆘', description: 'Checklist and step-by-step troubleshooting flow.' },
  { name: 'Class / build guide', value: 'class_guide', category: 'Guides', icon: '🧙', description: 'Facts, preparation checklist and resource links for game guides.' },

  { name: 'Patch / update notes', value: 'patch_update', category: 'Updates', icon: '🛠️', featured: true, description: 'Compact changelog/update layout.' },
  { name: 'Maintenance / outage', value: 'maintenance', category: 'Updates', icon: '🚧', description: 'Downtime notice with countdown, status and expected return.' },
  { name: 'Release / launch', value: 'release_launch', category: 'Updates', icon: '🚀', description: 'Launch countdown, progress and primary action links.' },
  { name: 'Important / warning', value: 'warning', category: 'Updates', icon: '⚠️', description: 'High-visibility warning container.' },

  { name: 'Media / gallery', value: 'media_gallery', category: 'Media', icon: '🖼️', description: 'Title, gallery and supporting description.' },
  { name: 'YouTube video', value: 'youtube', category: 'Media', icon: '▶️', featured: true, description: 'Smart YouTube block: paste the video URL and Timewizzard builds the presentation.' },
  { name: 'Live stream', value: 'stream_live', category: 'Media', icon: '🔴', description: 'Live-stream announcement with video, status and watch buttons.' },

  { name: 'MerfinUI — compact select', value: 'merfin_select', category: 'Special', icon: '🎮', description: 'Class/resolution profile dropdown.' },
  { name: 'MerfinUI — profile list', value: 'merfin_open_list', category: 'Special', icon: '📋', description: 'Compact profile overview without legacy Open buttons.' }
];

export function createBuilderTemplate(templateKey = 'blank', title = 'Informationsopslag') {
  if (templateKey === 'announcement') templateKey = 'announcement_styled';

  const builder = baseBuilder();
  if (templateKey === 'blank') return builder;

  if (templateKey === 'announcement_simple') {
    builder.blocks.push(
      block('heading', { level: 1, emoji: '📢', title, subtitle: 'Write the important announcement here.' }),
      block('separator', { divider: true, spacing: 2 }),
      block('checklist', { title: 'What you need to know', items: [
        { text: 'First important point', checked: false },
        { text: 'Second important point', checked: false },
        { text: 'Third important point', checked: false }
      ] })
    );
    return builder;
  }

  if (templateKey === 'announcement_styled') {
    builder.blocks.push(container('Announcement', 0x5865F2, [
      block('heading', { level: 1, emoji: '📢', title, subtitle: 'Write the important announcement here.' }),
      block('separator', { divider: true, spacing: 2 }),
      block('checklist', { title: 'What you need to know', items: [
        { text: 'First important point', checked: false },
        { text: 'Second important point', checked: false },
        { text: 'Third important point', checked: false }
      ] })
    ]));
    return builder;
  }

  if (templateKey === 'faq') {
    builder.blocks.push(
      block('heading', { level: 1, emoji: '❓', title, subtitle: 'Frequently asked questions and quick answers.' }),
      block('separator', { divider: true, spacing: 1 }),
      block('steps', { title: 'Questions', items: [
        { title: 'Question one?', content: 'Answer the first question here.' },
        { title: 'Question two?', content: 'Answer the second question here.' },
        { title: 'Need more help?', content: 'Point members to the correct channel or person.' }
      ] })
    );
    return builder;
  }

  if (templateKey === 'links') {
    builder.blocks.push(
      block('heading', { level: 1, emoji: '🔗', title, subtitle: 'Useful links and resources in one place.' }),
      block('separator', { divider: true, spacing: 1 }),
      block('button_row', { buttons: [
        { label: 'Primary resource', url: 'https://example.com' },
        { label: 'Documentation', url: 'https://example.com/docs' }
      ] })
    );
    return builder;
  }

  if (templateKey === 'welcome_onboarding') {
    builder.blocks.push(container('Welcome', 0x57F287, [
      block('heading', { level: 1, emoji: '👋', title, subtitle: 'Welcome! Here is everything you need to get started.' }),
      block('callout', { tone: 'info', title: 'Start here', content: 'Use **Discord Insert** to replace the placeholder channels and roles with your real server references.' }),
      block('steps', { title: 'First steps', items: [
        { title: 'Read the rules', content: 'Visit the rules / guidelines channel.' },
        { title: 'Choose your roles', content: 'Pick the roles that match your interests or team.' },
        { title: 'Introduce yourself', content: 'Say hello and tell the community a little about yourself.' }
      ] }),
      block('button_row', { buttons: [
        { label: 'Community guide', url: 'https://example.com/guide' },
        { label: 'Website', url: 'https://example.com' }
      ] })
    ]));
    return builder;
  }

  if (templateKey === 'rules_guidelines') {
    builder.blocks.push(container('Rules', 0x5865F2, [
      block('heading', { level: 1, emoji: '📜', title, subtitle: 'Clear expectations help keep the community welcoming and useful.' }),
      block('callout', { tone: 'warning', title: 'Please read before participating', content: 'Breaking important rules may lead to moderation actions. Replace these examples with your own server rules.' }),
      block('steps', { title: 'Community rules', items: [
        { title: 'Be respectful', content: 'Treat other members with respect and keep disagreements constructive.' },
        { title: 'Use the correct channels', content: 'Keep discussions in the channels intended for the topic.' },
        { title: 'No spam or unwanted promotion', content: 'Ask staff before advertising communities, products or services.' },
        { title: 'Follow Discord ToS', content: 'Content must comply with Discord policies and applicable law.' }
      ] })
    ]));
    return builder;
  }

  if (templateKey === 'recruitment') {
    builder.blocks.push(container('Recruitment', 0x2ECC71, [
      block('heading', { level: 1, emoji: '🛡️', title, subtitle: 'We are looking for new members to join the team.' }),
      block('facts', { title: 'Quick facts', items: [
        { label: 'Schedule', value: 'Add raid / event schedule' },
        { label: 'Looking for', value: 'Roles, classes or experience' },
        { label: 'Contact', value: 'Use Discord Insert to mention the right person' }
      ] }),
      block('checklist', { title: 'What we value', items: [
        { text: 'Reliable attendance', checked: true },
        { text: 'Team-first attitude', checked: true },
        { text: 'Willingness to improve', checked: true }
      ] })
    ]));
    return builder;
  }

  if (templateKey === 'staff_directory') {
    builder.blocks.push(
      block('heading', { level: 1, emoji: '👥', title, subtitle: 'Who to contact and what each team member is responsible for.' }),
      block('facts', { title: 'Team directory', items: [
        { label: 'Guild / Community Lead', value: '@person — overall direction' },
        { label: 'Raid Lead', value: '@person — raids and tactics' },
        { label: 'Recruitment', value: '@person — applications and onboarding' },
        { label: 'Support', value: '#channel — questions and help' }
      ] }),
      block('callout', { tone: 'info', title: 'Tip', content: 'Use **Discord Insert** to replace @person and #channel placeholders with live Discord mentions.' })
    );
    return builder;
  }

  if (templateKey === 'raid_event') {
    const start = futureEpoch(24 * 60);
    builder.blocks.push(container('Raid / Event', 0xE67E22, [
      block('heading', { level: 1, emoji: '⚔️', title, subtitle: 'Event information with Discord-native timestamps.' }),
      block('event', { title: 'Raid night', description: 'Add sign-up information, requirements and preparation notes.', startEpoch: start, endEpoch: start + 3 * 3600, location: '#raid-channel' }),
      block('checklist', { title: 'Before we start', items: [
        { text: 'Consumables ready', checked: false },
        { text: 'Gear repaired', checked: false },
        { text: 'Voice chat ready', checked: false }
      ] })
    ]));
    return builder;
  }

  if (templateKey === 'meeting_agenda') {
    const start = futureEpoch(24 * 60);
    builder.blocks.push(container('Meeting', 0x3498DB, [
      block('event', { title, description: 'Team meeting / planning session.', startEpoch: start, endEpoch: start + 60 * 60, location: '#meeting-room' }),
      block('steps', { title: 'Agenda', items: [
        { title: 'Opening', content: 'Current status and quick updates.' },
        { title: 'Main topics', content: 'Discuss decisions, blockers and next actions.' },
        { title: 'Wrap-up', content: 'Confirm owners, deadlines and follow-ups.' }
      ] }),
      block('button_row', { buttons: [{ label: 'Meeting notes', url: 'https://example.com/notes' }] })
    ]));
    return builder;
  }

  if (templateKey === 'weekly_schedule') {
    builder.blocks.push(
      block('heading', { level: 1, emoji: '📆', title, subtitle: 'Weekly activities at a glance.' }),
      block('facts', { title: 'This week', items: [
        { label: 'Wednesday', value: '20:00 — Main raid / event' },
        { label: 'Friday', value: '20:00 — Social / optional activity' },
        { label: 'Sunday', value: '20:00 — Continuation / progression' }
      ] }),
      block('callout', { tone: 'info', title: 'Local times', content: 'Use **Discord Insert → Time** if you want each time to automatically display in the viewer’s local timezone.' })
    );
    return builder;
  }

  if (templateKey === 'giveaway') {
    const target = futureEpoch(48 * 60);
    builder.blocks.push(container('Giveaway', 0xFEE75C, [
      block('heading', { level: 1, emoji: '🎁', title, subtitle: 'A simple giveaway / contest post with a live countdown.' }),
      block('countdown', { title: 'Entries close', text: 'Make sure your entry is submitted before the timer expires.', targetEpoch: target }),
      block('checklist', { title: 'How to enter', items: [
        { text: 'Meet the eligibility requirements', checked: false },
        { text: 'Submit your entry', checked: false },
        { text: 'Only one entry per person', checked: false }
      ] }),
      block('button_row', { buttons: [{ label: 'Entry details', url: 'https://example.com/giveaway' }] })
    ]));
    return builder;
  }

  if (templateKey === 'guide') {
    builder.blocks.push(container('Guide', 0x3498DB, [
      block('heading', { level: 1, emoji: '📘', title, subtitle: 'Short introduction explaining what this guide covers.' }),
      block('steps', { title: 'Guide', items: [
        { title: 'Step 1', content: 'Explain the first step.' },
        { title: 'Step 2', content: 'Explain the next step.' },
        { title: 'Tips', content: 'Add useful notes and link related channels with Discord Insert.' }
      ] })
    ]));
    return builder;
  }

  if (templateKey === 'support_troubleshooting') {
    builder.blocks.push(container('Support', 0x3498DB, [
      block('heading', { level: 1, emoji: '🆘', title, subtitle: 'Work through the quick checks before asking for help.' }),
      block('checklist', { title: 'Quick checks', items: [
        { text: 'Restart the app / addon / client', checked: false },
        { text: 'Confirm you are on the latest version', checked: false },
        { text: 'Check permissions and required settings', checked: false }
      ] }),
      block('steps', { title: 'Still not working?', items: [
        { title: 'Collect details', content: 'Write down the exact error and what you were doing when it happened.' },
        { title: 'Attach evidence', content: 'Include screenshots, logs or reproduction steps if possible.' },
        { title: 'Contact support', content: 'Use Discord Insert to point members at the right support channel.' }
      ] }),
      block('button_row', { buttons: [{ label: 'Documentation', url: 'https://example.com/docs' }] })
    ]));
    return builder;
  }

  if (templateKey === 'class_guide') {
    builder.blocks.push(container('Class / Build Guide', 0x9B59B6, [
      block('heading', { level: 1, emoji: '🧙', title, subtitle: 'Compact game/class guide structure.' }),
      block('facts', { title: 'Build overview', items: [
        { label: 'Role', value: 'DPS / Healer / Tank' },
        { label: 'Build', value: 'Add talent / spec information' },
        { label: 'Stat priority', value: 'Add stat priority here' }
      ] }),
      block('checklist', { title: 'Preparation', items: [
        { text: 'Core abilities configured', checked: true },
        { text: 'Consumables / enchants ready', checked: true },
        { text: 'Macros / addons tested', checked: false }
      ] }),
      block('button_row', { buttons: [{ label: 'Full build', url: 'https://example.com/build' }, { label: 'Logs', url: 'https://example.com/logs' }] })
    ]));
    return builder;
  }

  if (templateKey === 'patch_update') {
    builder.blocks.push(container('Update notes', 0x9B59B6, [
      block('heading', { level: 1, emoji: '🛠️', title, subtitle: 'Update / changelog' }),
      block('facts', { title: 'Release summary', items: [
        { label: 'Added', value: 'New feature' },
        { label: 'Changed', value: 'Updated behaviour' },
        { label: 'Fixed', value: 'Resolved issue' }
      ] }),
      block('progress', { label: 'Rollout', current: 100, total: 100, segments: 10, showNumbers: false, note: 'Deployment complete.' })
    ]));
    return builder;
  }

  if (templateKey === 'maintenance') {
    const target = futureEpoch(180);
    builder.blocks.push(container('Maintenance', 0xED4245, [
      block('callout', { tone: 'danger', title, content: 'A service, bot or feature is temporarily unavailable while maintenance is in progress.' }),
      block('countdown', { title: 'Expected return', text: 'This is an estimate and may change if maintenance takes longer than expected.', targetEpoch: target }),
      block('facts', { title: 'Status', items: [
        { label: 'State', value: 'Maintenance in progress' },
        { label: 'Impact', value: 'Describe affected features' },
        { label: 'Updates', value: 'Use Discord Insert to link the status channel' }
      ] })
    ]));
    return builder;
  }

  if (templateKey === 'release_launch') {
    const target = futureEpoch(24 * 60);
    builder.blocks.push(container('Launch', 0x5865F2, [
      block('heading', { level: 1, emoji: '🚀', title, subtitle: 'Launch announcement with countdown and rollout progress.' }),
      block('countdown', { title: 'Launches', text: 'The countdown updates automatically for every Discord user.', targetEpoch: target }),
      block('progress', { label: 'Release readiness', current: 8, total: 10, segments: 10, showNumbers: true, note: 'Update this as the launch checklist is completed.' }),
      block('button_row', { buttons: [{ label: 'Release notes', url: 'https://example.com/release' }, { label: 'Documentation', url: 'https://example.com/docs' }] })
    ]));
    return builder;
  }

  if (templateKey === 'warning') {
    builder.blocks.push(container('Important', 0xED4245, [
      block('callout', { tone: 'danger', title, content: 'Write the important warning or action members must take.' }),
      block('separator', { divider: true, spacing: 2 }),
      block('checklist', { title: 'Required action', items: [
        { text: 'Explain exactly what people need to do', checked: false },
        { text: 'Add a deadline if relevant', checked: false }
      ] })
    ]));
    return builder;
  }

  if (templateKey === 'media_gallery') {
    builder.blocks.push(
      block('heading', { level: 1, emoji: '🖼️', title, subtitle: 'Add a short introduction to the gallery.' }),
      block('gallery', { items: [
        { url: 'https://example.com/image1.png', description: 'Image 1', spoiler: false },
        { url: 'https://example.com/image2.png', description: 'Image 2', spoiler: false }
      ] }),
      block('callout', { tone: 'neutral', title: 'Gallery note', content: 'Add, remove or reorder gallery images in the Inspector.' })
    );
    return builder;
  }

  if (templateKey === 'youtube') {
    builder.blocks.push(
      block('heading', { level: 1, emoji: '▶️', title, subtitle: 'Add a short introduction to the video.' }),
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

  if (templateKey === 'stream_live') {
    builder.blocks.push(container('Live stream', 0xED4245, [
      block('heading', { level: 1, emoji: '🔴', title, subtitle: 'We are live — join the stream.' }),
      block('callout', { tone: 'danger', title: 'LIVE NOW', content: 'Replace the sample video and links before publishing.' }),
      block('youtube', {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Live stream',
        description: 'Watch the live broadcast and join the conversation.',
        showThumbnail: true,
        showButton: true,
        buttonLabel: 'Watch live'
      }),
      block('button_row', { buttons: [{ label: 'Stream page', url: 'https://example.com/live' }, { label: 'Community', url: 'https://example.com/community' }] })
    ]));
    return builder;
  }

  if (templateKey === 'merfin_select') {
    builder.blocks.push(
      block('heading', { level: 1, emoji: '🎮', title, subtitle: 'Vælg din World of Warcraft class og opløsning nedenfor. Den korrekte tekststreng sendes privat.' }),
      block('separator', { divider: true, spacing: 2 }),
      block('profile_select', { placeholder: 'Vælg class og opløsning…' })
    );
    return builder;
  }

  if (templateKey === 'merfin_open_list') {
    builder.blocks.push(
      block('heading', { level: 1, emoji: '📋', title, subtitle: 'Oversigt over de tilgængelige World of Warcraft class- og opløsningsprofiler.' }),
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
