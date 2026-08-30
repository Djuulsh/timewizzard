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

function addTemplateLinkSelector(builder, label, entries) {
  const options = entries.map((entry) => {
    const actionId = makeShortId(4);
    builder.actions[actionId] = {
      id: actionId,
      type: 'ephemeral_text',
      title: entry,
      content: `**${entry}**\n[Indsæt link](https://example.com)`,
      children: [],
      presentation: 'buttons'
    };
    return { label: entry, actionId };
  });

  return block('select', {
    placeholder: `Vælg ${label}…`,
    options
  });
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
  { name: 'Channel information / Start here', value: 'channel_start_here', category: 'Community', icon: '📌', featured: true, description: 'Permanent channel introduction with purpose, first steps and useful links.' },
  { name: 'Raid / team roster information', value: 'team_roster_info', category: 'Community', icon: '🛡️', description: 'Team schedule, contacts, expectations and useful roster links.' },

  { name: 'Raid / event', value: 'raid_event', category: 'Events', icon: '⚔️', featured: true, description: 'Event information prepared for timestamps, roles and channels.' },
  { name: 'Meeting / agenda', value: 'meeting_agenda', category: 'Events', icon: '🗓️', description: 'Meeting time, agenda items and meeting links in one post.' },
  { name: 'Weekly schedule', value: 'weekly_schedule', category: 'Events', icon: '📆', description: 'A compact recurring schedule for raids, events or activities.' },
  { name: 'Giveaway / contest', value: 'giveaway', category: 'Events', icon: '🎁', description: 'Prize, requirements and a live Discord countdown.' },
  { name: 'Event signup / attendance', value: 'event_signup', category: 'Events', icon: '✅', featured: true, description: 'Event time, signup expectations, countdown and action links.' },
  { name: 'Results / winners', value: 'results_winners', category: 'Events', icon: '🏆', description: 'Publish winners, results, highlights, media and follow-up links.' },

  { name: 'Guide / information', value: 'guide', category: 'Guides', icon: '📘', featured: true, description: 'Structured guide inside a clean information container.' },
  { name: 'Support / troubleshooting', value: 'support_troubleshooting', category: 'Guides', icon: '🆘', description: 'Checklist and step-by-step troubleshooting flow.' },
  { name: 'Class / build guide', value: 'class_guide', category: 'Guides', icon: '🧙', description: 'Facts, preparation checklist and resource links for game guides.' },
  { name: 'Boss tactics / raid strategy', value: 'boss_tactics', category: 'Guides', icon: '🐉', featured: true, description: 'Raid encounter strategy with key mechanics, phases, assignments and resources.' },
  { name: 'Knowledge base article', value: 'knowledge_base', category: 'Guides', icon: '📚', featured: true, description: 'Reusable documentation layout with quick answer, detailed steps and references.' },
  { name: 'Support ticket instructions', value: 'support_ticket', category: 'Guides', icon: '🎫', description: 'Show members what to check and what information to include before asking for help.' },
  { name: 'Tutorial / how-to', value: 'tutorial_howto', category: 'Guides', icon: '🧑‍🏫', description: 'Hands-on tutorial with steps, screenshots, completion checklist and references.' },

  { name: 'Patch / update notes', value: 'patch_update', category: 'Updates', icon: '🛠️', featured: true, description: 'Compact changelog/update layout.' },
  { name: 'Maintenance / outage', value: 'maintenance', category: 'Updates', icon: '🚧', description: 'Downtime notice with countdown, status and expected return.' },
  { name: 'Release / launch', value: 'release_launch', category: 'Updates', icon: '🚀', description: 'Launch countdown, progress and primary action links.' },
  { name: 'Important / warning', value: 'warning', category: 'Updates', icon: '⚠️', description: 'High-visibility warning container.' },
  { name: 'Goals / progress tracker', value: 'goals_progress', category: 'Updates', icon: '🎯', description: 'Track a goal, milestone progress, remaining tasks and target date.' },
  { name: 'Weekly community update', value: 'weekly_community_update', category: 'Updates', icon: '📰', description: 'Newsletter-style weekly summary with highlights, upcoming items and useful links.' },

  { name: 'Media / gallery', value: 'media_gallery', category: 'Media', icon: '🖼️', description: 'Title, gallery and supporting description.' },
  { name: 'YouTube video', value: 'youtube', category: 'Media', icon: '▶️', featured: true, description: 'Smart YouTube block: paste the video URL and Timewizzard builds the presentation.' },
  { name: 'Live stream', value: 'stream_live', category: 'Media', icon: '🔴', description: 'Live-stream announcement with video, status and watch buttons.' },

  { name: 'MerfinUI — compact select', value: 'merfin_select', category: 'Special', icon: '🎮', description: 'Class/resolution profile dropdown.' },
  { name: 'MerfinUI — TBC WeakAuras library', value: 'merfin_tbc_weakauras', category: 'Special', icon: '📚', featured: true, description: 'Categorized TBC WeakAuras library with live timestamps and editable link menus.' },
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

  if (templateKey === 'channel_start_here') {
    builder.blocks.push(container('Start here', 0x5865F2, [
      block('heading', { level: 1, emoji: '📌', title, subtitle: 'A permanent introduction explaining what this channel is for.' }),
      block('callout', { tone: 'info', title: 'What belongs here', content: 'Explain the purpose of this channel and the type of information members should expect to find here.' }),
      block('steps', { title: 'Start here', items: [
        { title: 'Read the key information', content: 'Review the important notes and expectations before posting.' },
        { title: 'Use the right resources', content: 'Use Discord Insert to point members to related channels, roles or people.' },
        { title: 'Need help?', content: 'Tell members where questions should go.' }
      ] }),
      block('button_row', { buttons: [
        { label: 'Community guide', url: 'https://example.com/guide' },
        { label: 'Resources', url: 'https://example.com/resources' }
      ] })
    ]));
    return builder;
  }

  if (templateKey === 'team_roster_info') {
    builder.blocks.push(container('Team information', 0x3498DB, [
      block('heading', { level: 1, emoji: '🛡️', title, subtitle: 'Keep the team schedule, contacts and expectations together.' }),
      block('facts', { title: 'Team details', items: [
        { label: 'Schedule', value: 'Add regular raid / event days and times' },
        { label: 'Leader', value: 'Use Discord Insert to mention the team lead' },
        { label: 'Signups', value: 'Use Discord Insert for the signup channel or system' }
      ] }),
      block('checklist', { title: 'Team expectations', items: [
        { text: 'Be ready before the scheduled start', checked: true },
        { text: 'Communicate absences early', checked: true },
        { text: 'Review assignments and preparation notes', checked: true }
      ] }),
      block('button_row', { buttons: [
        { label: 'Roster', url: 'https://example.com/roster' },
        { label: 'Logs', url: 'https://example.com/logs' }
      ] })
    ]));
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

  if (templateKey === 'event_signup') {
    const start = futureEpoch(24 * 60);
    builder.blocks.push(container('Event signup', 0x57F287, [
      block('heading', { level: 1, emoji: '✅', title, subtitle: 'Everything members need before signing up for the event.' }),
      block('event', { title: 'Upcoming event', description: 'Add signup requirements, expected duration and any attendance notes.', startEpoch: start, endEpoch: start + 2 * 3600, location: '#event-channel' }),
      block('countdown', { title: 'Starts', text: 'The relative timer updates automatically for every Discord user.', targetEpoch: start }),
      block('checklist', { title: 'Before signing up', items: [
        { text: 'Confirm you can attend the full event', checked: false },
        { text: 'Review the requirements', checked: false },
        { text: 'Notify the organizer if plans change', checked: false }
      ] }),
      block('button_row', { buttons: [
        { label: 'Sign up', url: 'https://example.com/signup' },
        { label: 'Event details', url: 'https://example.com/event' }
      ] })
    ]));
    return builder;
  }

  if (templateKey === 'results_winners') {
    builder.blocks.push(container('Results', 0xFEE75C, [
      block('heading', { level: 1, emoji: '🏆', title, subtitle: 'Celebrate the result and keep the important follow-up information together.' }),
      block('callout', { tone: 'success', title: 'Congratulations!', content: 'Announce the winner, result or achievement here.' }),
      block('facts', { title: 'Result details', items: [
        { label: 'Winner', value: 'Use Discord Insert to mention the winner' },
        { label: 'Result', value: 'Add the winning score, placement or outcome' },
        { label: 'Date', value: 'Add the result date or a Discord timestamp' }
      ] }),
      block('gallery', { items: [
        { url: 'https://example.com/highlight1.png', description: 'Highlight 1', spoiler: false },
        { url: 'https://example.com/highlight2.png', description: 'Highlight 2', spoiler: false }
      ] }),
      block('button_row', { buttons: [{ label: 'Full results', url: 'https://example.com/results' }] })
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

  if (templateKey === 'boss_tactics') {
    builder.blocks.push(container('Boss tactics', 0xE67E22, [
      block('heading', { level: 1, emoji: '🐉', title, subtitle: 'A compact encounter plan that is easy to scan before and during the raid.' }),
      block('callout', { tone: 'warning', title: 'Key mechanic', content: 'Write the one mechanic the raid absolutely must understand before pulling.' }),
      block('steps', { title: 'Encounter flow', items: [
        { title: 'Phase 1', content: 'Explain positioning, priority targets and the first important mechanic.' },
        { title: 'Phase 2', content: 'Explain what changes and what the raid should focus on next.' },
        { title: 'Finish', content: 'Add execute-phase notes, cooldown timing or final positioning.' }
      ] }),
      block('checklist', { title: 'Assignments', items: [
        { text: 'Tanks know positioning and swaps', checked: false },
        { text: 'Healers know major damage windows', checked: false },
        { text: 'Interrupts / dispels / special jobs assigned', checked: false }
      ] }),
      block('button_row', { buttons: [
        { label: 'Strategy reference', url: 'https://example.com/strategy' },
        { label: 'Logs', url: 'https://example.com/logs' },
        { label: 'Video', url: 'https://example.com/video' }
      ] })
    ]));
    return builder;
  }

  if (templateKey === 'knowledge_base') {
    builder.blocks.push(
      block('heading', { level: 1, emoji: '📚', title, subtitle: 'Reusable documentation with a quick answer first and details below.' }),
      container('Quick answer', 0x5865F2, [
        block('callout', { tone: 'info', title: 'In short', content: 'Give the shortest useful answer here so readers can solve simple cases immediately.' })
      ]),
      container('Detailed instructions', 0x3498DB, [
        block('steps', { title: 'How it works', items: [
          { title: 'Prepare', content: 'List what the reader needs before starting.' },
          { title: 'Do the task', content: 'Explain the main action in clear, short steps.' },
          { title: 'Verify', content: 'Explain how to confirm the result is correct.' }
        ] }),
        block('checklist', { title: 'Before you finish', items: [
          { text: 'Result verified', checked: false },
          { text: 'Relevant settings saved', checked: false }
        ] })
      ]),
      block('button_row', { buttons: [
        { label: 'Documentation', url: 'https://example.com/docs' },
        { label: 'Related article', url: 'https://example.com/article' }
      ] })
    );
    return builder;
  }

  if (templateKey === 'support_ticket') {
    builder.blocks.push(container('Support request', 0x3498DB, [
      block('heading', { level: 1, emoji: '🎫', title, subtitle: 'Help members submit useful support requests the first time.' }),
      block('callout', { tone: 'info', title: 'Before opening a ticket', content: 'Check the common fixes below. Good reports are faster to investigate and solve.' }),
      block('checklist', { title: 'Quick checks', items: [
        { text: 'Restarted the affected app / addon / device', checked: false },
        { text: 'Confirmed the issue still happens on the latest version', checked: false },
        { text: 'Checked the FAQ / known issues', checked: false }
      ] }),
      block('steps', { title: 'Include this information', items: [
        { title: 'What happened?', content: 'Describe the problem and what you expected instead.' },
        { title: 'How can we reproduce it?', content: 'List the shortest reliable reproduction steps.' },
        { title: 'Attach evidence', content: 'Include screenshots, logs, error messages or version information.' }
      ] }),
      block('button_row', { buttons: [
        { label: 'Open support', url: 'https://example.com/support' },
        { label: 'Known issues', url: 'https://example.com/issues' }
      ] })
    ]));
    return builder;
  }

  if (templateKey === 'tutorial_howto') {
    builder.blocks.push(container('Tutorial', 0x57F287, [
      block('heading', { level: 1, emoji: '🧑‍🏫', title, subtitle: 'A practical walkthrough readers can follow from start to finish.' }),
      block('steps', { title: 'Walkthrough', items: [
        { title: 'Prepare', content: 'Explain what the reader needs before beginning.' },
        { title: 'Configure', content: 'Describe the main setup or configuration step.' },
        { title: 'Test', content: 'Show how to confirm everything works.' }
      ] }),
      block('gallery', { items: [
        { url: 'https://example.com/step1.png', description: 'Step 1 screenshot', spoiler: false },
        { url: 'https://example.com/step2.png', description: 'Step 2 screenshot', spoiler: false }
      ] }),
      block('checklist', { title: 'Finished when', items: [
        { text: 'Setup matches the guide', checked: false },
        { text: 'Final test succeeds', checked: false }
      ] }),
      block('button_row', { buttons: [{ label: 'Further reading', url: 'https://example.com/learn-more' }] })
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

  if (templateKey === 'goals_progress') {
    const target = futureEpoch(7 * 24 * 60);
    builder.blocks.push(container('Goal tracker', 0x5865F2, [
      block('heading', { level: 1, emoji: '🎯', title, subtitle: 'Track progress toward a shared goal or milestone.' }),
      block('progress', { label: 'Overall progress', current: 6, total: 10, segments: 10, showNumbers: true, note: 'Update current and total as the team moves forward.' }),
      block('checklist', { title: 'Remaining tasks', items: [
        { text: 'Complete the next milestone', checked: false },
        { text: 'Review outstanding blockers', checked: false },
        { text: 'Share the final result', checked: false }
      ] }),
      block('countdown', { title: 'Target date', text: 'Use this as the next milestone or completion target.', targetEpoch: target }),
      block('button_row', { buttons: [{ label: 'Project details', url: 'https://example.com/project' }] })
    ]));
    return builder;
  }

  if (templateKey === 'weekly_community_update') {
    const nextEvent = futureEpoch(3 * 24 * 60);
    builder.blocks.push(container('Weekly update', 0x5865F2, [
      block('heading', { level: 1, emoji: '📰', title, subtitle: 'A quick weekly summary members can scan in under a minute.' }),
      block('callout', { tone: 'neutral', title: 'This week', content: 'Write the biggest news, achievement or change from the past week.' }),
      block('checklist', { title: 'Highlights', items: [
        { text: 'Highlight or achievement #1', checked: true },
        { text: 'Highlight or achievement #2', checked: true },
        { text: 'Important reminder for members', checked: false }
      ] }),
      block('event', { title: 'Next up', description: 'The next important community event or activity.', startEpoch: nextEvent, endEpoch: nextEvent + 2 * 3600, location: '#community-channel' }),
      block('button_row', { buttons: [
        { label: 'Full update', url: 'https://example.com/update' },
        { label: 'Calendar', url: 'https://example.com/calendar' }
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

  if (templateKey === 'merfin_tbc_weakauras') {
    builder.blocks.push(
      block('heading', { level: 1, emoji: '📚', title, subtitle: 'Categorized TBC WeakAuras and strings with live Discord timestamps.' }),
      container("Anchors & Strings", 0x5865F2, [
        block('text', { content: "## [TBC ICON] **TBC Anchors & Strings**\n•⠀**Anchors UI FHD** - <t:1783789927:R>\n•⠀**Anchors UI QHD** - <t:1783789826:R>\n•⠀**Raid Anchors** - <t:1787997850:R>" }),
        addTemplateLinkSelector(builder, "Anchors & Strings", ["**Anchors UI FHD**","**Anchors UI QHD**","**Raid Anchors**"])
      ]),
      container("ElvUI Replacements", 0x3498DB, [
        block('text', { content: "## [TBC ICON] **TBC ElvUI Replacements**\n•⠀Experience Bar (Luxthos) - <t:1783745720:R>\n•⠀Show Action Bar in Vehicle - <t:1783745753:R>\n•⠀UF Cast Bar - <t:1783790060:R>\n•⠀Unit Frames Indicators - <t:1783745829:R>" }),
        addTemplateLinkSelector(builder, "ElvUI Replacements", ["Experience Bar (Luxthos)","Show Action Bar in Vehicle","UF Cast Bar","Unit Frames Indicators"])
      ]),
      container("Classpacks", 0x9B59B6, [
        block('text', { content: "## [TBC ICON] **TBC Classpacks**\n•⠀[DRUID ICON] Druid (FHD) - <t:1784864812:R>\n•⠀[DRUID ICON] Druid (QHD) - <t:1784864736:R>\n•⠀[HUNTER ICON] Hunter (FHD) - <t:1787100059:R>\n•⠀[HUNTER ICON] Hunter (QHD) - <t:1787100119:R>\n•⠀[HUNTER ICON] Hunter Clickable Aspects - <t:1783744655:R>\n•⠀[HUNTER ICON] Hunter Easy Pet - <t:1784866606:R>\n•⠀[MAGE ICON] Mage (FHD) - <t:1784864492:R>\n•⠀[MAGE ICON] Mage (QHD) - <t:1784864450:R>\n•⠀[MAGE ICON] Mage Portals - <t:1783744866:R>\n•⠀[PALADIN ICON] Paladin - Clickable Auras - <t:1783824946:R>\n•⠀[PALADIN ICON] Paladin (FHD) - <t:1787532169:R>\n•⠀[PALADIN ICON] Paladin (QHD) - <t:1787532329:R>\n•⠀[PALADIN ICON] Paladin Easy PallyPower - <t:1783745116:R>\n•⠀[PRIEST ICON] Priest (FHD) - <t:1784864253:R>\n•⠀[PRIEST ICON] Priest (QHD) - <t:1784864195:R>\n•⠀[ROGUE ICON] Rogue (FHD) - <t:1784864123:R>\n•⠀[ROGUE ICON] Rogue (QHD) - <t:1784864058:R>\n•⠀[SHAMAN ICON] Shaman (FHD) - <t:1787530708:R>\n•⠀[SHAMAN ICON] Shaman (QHD) - <t:1787528765:R>\n•⠀[SHAMAN ICON] Shaman Smart Totems - <t:1783745467:R>\n•⠀[WARLOCK ICON] Warlock (FHD) - <t:1784863782:R>\n•⠀[WARLOCK ICON] Warlock (QHD) - <t:1784863676:R>\n•⠀[WARRIOR ICON] Warrior (FHD) - <t:1787527667:R>\n•⠀[WARRIOR ICON] Warrior (QHD) - <t:1787527330:R>" }),
        addTemplateLinkSelector(builder, "Classpacks", ["Druid (FHD)","Druid (QHD)","Hunter (FHD)","Hunter (QHD)","Hunter Clickable Aspects","Hunter Easy Pet","Mage (FHD)","Mage (QHD)","Mage Portals","Paladin - Clickable Auras","Paladin (FHD)","Paladin (QHD)","Paladin Easy PallyPower","Priest (FHD)","Priest (QHD)","Rogue (FHD)","Rogue (QHD)","Shaman (FHD)","Shaman (QHD)","Shaman Smart Totems","Warlock (FHD)","Warlock (QHD)","Warrior (FHD)","Warrior (QHD)"])
      ]),
      container("General Auras", 0x2ECC71, [
        block('text', { content: "## [TBC ICON] **TBC General Auras**\n•⠀Auction Helper - <t:1783745908:R>\n•⠀Auction Helper Materials - <t:1783745958:R>\n•⠀Auto Role - <t:1783746001:R>\n•⠀BiS Helper - <t:1783746092:R>\n•⠀Center Texture - <t:1783746141:R>\n•⠀Consumables Bar - <t:1787830947:R>\n•⠀Dropdown Lists - <t:1786727869:R>\n•⠀Eat & Drink Buttons - <t:1783746474:R>\n•⠀Equipped Items - <t:1783746514:R>\n•⠀Extra Sounds - <t:1783746585:R>\n•⠀GCD History - <t:1783746623:R>\n•⠀Interrupted on Nameplate - <t:1783746677:R>\n•⠀Nan Shield - <t:1783746881:R>\n•⠀Player CC Icon - <t:1783746915:R>\n•⠀Player Level - <t:1783746963:R>\n•⠀Range Indicator - <t:1783747002:R>\n•⠀Reminders - <t:1787440616:R>\n•⠀Target Threat - <t:1783789730:R>\n•⠀Threat Difference - <t:1783747164:R>\n•⠀Time To Die - <t:1783789189:R>" }),
        addTemplateLinkSelector(builder, "General Auras", ["Auction Helper","Auction Helper Materials","Auto Role","BiS Helper","Center Texture","Consumables Bar","Dropdown Lists","Eat & Drink Buttons","Equipped Items","Extra Sounds","GCD History","Interrupted on Nameplate","Nan Shield","Player CC Icon","Player Level","Range Indicator","Reminders","Target Threat","Threat Difference","Time To Die"])
      ]),
      container("Additional Auras", 0x1ABC9C, [
        block('text', { content: "## [TBC ICON] **TBC Additional Auras**\n•⠀Auto Bijou - <t:1783743423:R>\n•⠀Auto Invite (NoM0Re) - <t:1783743477:R>\n•⠀Auto Vendor Buyer - <t:1783743543:R>\n•⠀Cursor Aim - <t:1783743595:R>\n•⠀Cursor Aim_Cast_GCD - <t:1783743645:R>\n•⠀Cursor Aim_Cast_GCD (Hide on MB Down) - <t:1783743712:R>\n•⠀Escape Items and Consumables - <t:1783743780:R>\n•⠀Escape Items Autoswap - <t:1783743851:R>\n•⠀Healers Mana - <t:1783743911:R>\n•⠀Loot Widget - <t:1787999837:R>\n•⠀Set Equipper - <t:1783744031:R>\n•⠀Stats - <t:1783744085:R>" }),
        addTemplateLinkSelector(builder, "Additional Auras", ["Auto Bijou","Auto Invite (NoM0Re)","Auto Vendor Buyer","Cursor Aim","Cursor Aim_Cast_GCD","Cursor Aim_Cast_GCD (Hide on MB Down)","Escape Items and Consumables","Escape Items Autoswap","Healers Mana","Loot Widget","Set Equipper","Stats"])
      ]),
      container("Raid & Dungeon Auras", 0xE67E22, [
        block('text', { content: "## [TBC ICON] **TBC Raid & Dungeon Auras**\n•⠀Dungeon Pack - <t:1787997456:R>\n•⠀Magtheridon Cube Assigner - <t:1783747467:R>\n•⠀T4 Raid Pack (Mag, Gruul, Kara) - <t:1787998645:R>\n•⠀T5 Raid Pack - <t:1787998346:R>\n•⠀T6 Assignments - <t:1787830952:R>\n•⠀T6 Raidpack - <t:1788059449:R>" }),
        addTemplateLinkSelector(builder, "Raid & Dungeon Auras", ["Dungeon Pack","Magtheridon Cube Assigner","T4 Raid Pack (Mag, Gruul, Kara)","T5 Raid Pack","T6 Assignments","T6 Raidpack"])
      ]),
      container("Raid Additionals", 0xE74C3C, [
        block('text', { content: "## [TBC ICON] **TBC Raid Additionals**\n•⠀Combat Timers - <t:1783747755:R>\n•⠀Drums Debuff - <t:1783747792:R>\n•⠀Jewelcrafting Necks - <t:1784266704:R>\n•⠀Loot Everything (Clickable) - <t:1783747914:R>\n•⠀Paladin Auras - <t:1783747950:R>\n•⠀Pull & Break Timers - <t:1784293622:R>\n•⠀Raid Buffs HUD - <t:1785820406:R>\n•⠀Raid Prep - <t:1783747511:R>\n•⠀Release Button Hider - <t:1783748064:R>\n•⠀Resurrection Cast - <t:1783748100:R>\n•⠀Summon Alert Overlay - <t:1783748144:R>\n•⠀T5-T6 Trash Requirements - <t:1783748180:R>\n•⠀Target Raid Debuffs - <t:1787997579:R>\n•⠀Totems & Aura Range Tracker - <t:1783748286:R>\n•⠀Who Died Warning - <t:1783748447:R>" }),
        addTemplateLinkSelector(builder, "Raid Additionals", ["Combat Timers","Drums Debuff","Jewelcrafting Necks","Loot Everything (Clickable)","Paladin Auras","Pull & Break Timers","Raid Buffs HUD","Raid Prep","Release Button Hider","Resurrection Cast","Summon Alert Overlay","T5-T6 Trash Requirements","Target Raid Debuffs","Totems & Aura Range Tracker","Who Died Warning"])
      ]),
      container("Raid Cooldowns", 0xF1C40F, [
        block('text', { content: "## [TBC ICON] **TBC Raid Cooldowns**\n•⠀Raid Cooldowns Frontend (RCD) - <t:1786690247:R>" }),
        addTemplateLinkSelector(builder, "Raid Cooldowns", ["Raid Cooldowns Frontend (RCD)"])
      ])
    );
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
