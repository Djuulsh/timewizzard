import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { RESOLUTIONS, WOW_CLASSES, findClass, findResolution } from '../constants.js';
import { getBuilderStats } from './render.js';
import { colorToHex } from './validate.js';
import { serializeSelectOptions } from './blocks.js';
import { truncate } from '../utils.js';

const TYPE_NAMES = {
  text: 'Tekst / Markdown',
  image: 'Billede / banner',
  separator: 'Separator',
  open: 'Open-knap + ephemeral svar',
  link: 'Link-knap',
  select: 'Select box + ephemeral svar',
  profile_select: 'MerfinUI class/resolution select',
  profile_open_list: 'MerfinUI Open-liste (legacy)'
};

const TYPE_ICONS = {
  text: '📝',
  image: '🖼️',
  separator: '➖',
  open: '🔘',
  link: '🔗',
  select: '🔽',
  profile_select: '🎮',
  profile_open_list: '📋'
};

function makeInput({ id, style = TextInputStyle.Short, required = true, maxLength, value, placeholder }) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setStyle(style)
    .setRequired(required);

  if (maxLength) input.setMaxLength(maxLength);
  if (value !== undefined && value !== null && String(value).length > 0) input.setValue(String(value));
  if (placeholder) input.setPlaceholder(placeholder);
  return input;
}

function makeLabel({ label, description, input }) {
  const component = new LabelBuilder()
    .setLabel(label)
    .setTextInputComponent(input);
  if (description) component.setDescription(description);
  return component;
}

function scopePart(scope) {
  return `${scope.kind}:${scope.id}`;
}

function profilePart(classKey, resolutionKey) {
  return `${classKey}:${resolutionKey}`;
}

function blockSummary(block) {
  switch (block.type) {
    case 'text': return `Tekst: ${truncate(String(block.content ?? '').replace(/\s+/g, ' '), 65)}`;
    case 'image': return `Billede: ${truncate(block.url, 65)}`;
    case 'separator': return 'Separator';
    case 'open': return `Open: ${truncate(String(block.text ?? '').replace(/\s+/g, ' '), 65)}`;
    case 'link': return `Link: ${truncate(String(block.text ?? '').replace(/\s+/g, ' '), 65)}`;
    case 'select': return `Select: ${block.options?.length ?? 0} options · ${truncate(block.placeholder || 'Vælg…', 45)}`;
    case 'profile_select': return `MerfinUI select: ${truncate(block.placeholder || 'Vælg class og opløsning…', 50)}`;
    case 'profile_open_list': return 'MerfinUI Open-liste (18 rækker)';
    default: return block.type;
  }
}

function publishedStateMatches(entity) {
  if (!entity?.publishedBuilder) return true;
  return entity.title === entity.publishedTitle &&
    JSON.stringify(entity.builder) === JSON.stringify(entity.publishedBuilder);
}

export function isPublishedModified(entity, scope) {
  return scope.kind === 'p' && !publishedStateMatches(entity);
}

export function buildBuilderPanel(entity, scope) {
  let stats;
  let statsError = null;
  try {
    stats = getBuilderStats(entity, scope);
  } catch (error) {
    stats = { blockCount: entity.builder?.blocks?.length ?? 0, messageCount: '?' };
    statsError = error.message;
  }

  const modified = isPublishedModified(entity, scope);
  const status = scope.kind === 'd'
    ? '🟡 Kladde'
    : modified
      ? '🟠 Ændringer ikke publiceret'
      : '🟢 Synkroniseret';
  const publishLabel = scope.kind === 'd' ? 'Publicer' : modified ? 'Publicer ændringer' : 'Genpublicer';
  const noBlocks = (entity.builder?.blocks?.length ?? 0) === 0;

  const lines = [
    '## 🛠 Shrouded Post Builder v1.2',
    `**${entity.title}**`,
    `${status} · ID: \`${scope.id}\``,
    `Blocks: **${stats.blockCount}** · Discord-beskeder: **${stats.messageCount}** · Accent: \`${colorToHex(entity.builder.accentColor)}\``
  ];

  if (scope.kind === 'p' && modified) {
    lines.push('⚠️ Builderen er ændret siden sidste publicering. Brug **Publicer ændringer** når previewet ser rigtigt ud.');
  } else if (scope.kind === 'p') {
    lines.push('Builderen matcher det senest publicerede opslag. Du kan stadig **Genpublicere** for at genopbygge Discord-layoutet.');
  }
  if (statsError) lines.push(`⚠️ Preview kan ikke bygges endnu: ${statsError}`);

  const firstRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`builder_settings:${scopePart(scope)}`).setLabel('Post settings').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`builder_add:${scopePart(scope)}`).setLabel('+ Block').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`builder_blocks:${scopePart(scope)}`).setLabel('Blocks').setStyle(ButtonStyle.Secondary).setDisabled(noBlocks),
    new ButtonBuilder().setCustomId(`builder_preview:${scopePart(scope)}`).setLabel('Preview').setStyle(ButtonStyle.Secondary).setDisabled(noBlocks || Boolean(statsError)),
    new ButtonBuilder().setCustomId(`builder_publish:${scopePart(scope)}`).setLabel(publishLabel).setStyle(ButtonStyle.Success).setDisabled(noBlocks || Boolean(statsError))
  );

  const secondRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`builder_clone:${scopePart(scope)}`).setLabel('Clone').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`builder_export:${scopePart(scope)}`).setLabel('Export JSON').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`builder_delete:${scopePart(scope)}`).setLabel('Slet').setStyle(ButtonStyle.Danger)
  );

  return {
    content: lines.join('\n'),
    components: [firstRow, secondRow],
    allowedMentions: { parse: [] }
  };
}

export function buildAddBlockPicker(entity, scope) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`builder_add_select:${scopePart(scope)}`)
    .setPlaceholder('Vælg block-type…')
    .addOptions(
      { label: 'Tekst / Markdown', value: 'text', description: 'Overskrifter, beskrivelser og fri Markdown-tekst' },
      { label: 'Billede / banner', value: 'image', description: 'Et header-banner eller andet billede' },
      { label: 'Separator', value: 'separator', description: 'En rigtig Components V2 skillelinje' },
      { label: 'Open-knap', value: 'open', description: 'Tekstlinje + Open-knap med ephemeral svar' },
      { label: 'Link-knap', value: 'link', description: 'Tekstlinje + knap der åbner en URL' },
      { label: 'Select box', value: 'select', description: 'Dropdown hvor hver option giver et ephemeral svar' },
      { label: 'MerfinUI compact select', value: 'profile_select', description: 'Alle 18 class/resolution-profiler i én dropdown' },
      { label: 'MerfinUI Open-liste', value: 'profile_open_list', description: 'De 18 Open-rækker fra v1.0 (kan blive delt)' }
    );

  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`builder_back:${scopePart(scope)}`).setLabel('Tilbage').setStyle(ButtonStyle.Secondary)
  );

  return {
    content: `## ➕ Tilføj block\n**${entity.title}**\nVælg hvilken type indhold eller interaction du vil indsætte.`,
    components: [new ActionRowBuilder().addComponents(menu), back],
    allowedMentions: { parse: [] }
  };
}

export function buildBlockPicker(entity, scope) {
  const blocks = entity.builder.blocks;
  if (!blocks.length) return buildBuilderPanel(entity, scope);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`builder_manage_select:${scopePart(scope)}`)
    .setPlaceholder('Vælg et block…')
    .addOptions(blocks.map((block, index) => ({
      label: `${String(index + 1).padStart(2, '0')} · ${TYPE_NAMES[block.type] ?? block.type}`.slice(0, 100),
      value: block.id,
      description: blockSummary(block).slice(0, 100)
    })));

  const visibleList = blocks.map((block, index) =>
    `**${String(index + 1).padStart(2, '0')}** ${TYPE_ICONS[block.type] ?? '▫️'} ${truncate(blockSummary(block), 54)}`
  );

  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`builder_back:${scopePart(scope)}`).setLabel('Tilbage').setStyle(ButtonStyle.Secondary)
  );

  return {
    content: [
      '## 🧱 Blocks',
      `**${entity.title}**`,
      'Rækkefølgen her er den rækkefølge, Discord publicerer i. Vælg et block nedenfor for at redigere, flytte, duplikere eller slette det.',
      '',
      ...visibleList
    ].join('\n').slice(0, 1_950),
    components: [new ActionRowBuilder().addComponents(menu), back],
    allowedMentions: { parse: [] }
  };
}

export function buildBlockManager(entity, scope, blockId) {
  const index = entity.builder.blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return buildBlockPicker(entity, scope);
  const block = entity.builder.blocks[index];
  const canEdit = block.type !== 'separator' && block.type !== 'profile_open_list';
  const hasProfiles = block.type === 'profile_select' || block.type === 'profile_open_list';

  const controls = [
    new ButtonBuilder().setCustomId(`builder_block_edit:${scopePart(scope)}:${block.id}`).setLabel('Rediger').setStyle(ButtonStyle.Primary).setDisabled(!canEdit),
    new ButtonBuilder().setCustomId(`builder_block_move:${scopePart(scope)}:${block.id}`).setLabel('Flyt').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`builder_block_duplicate:${scopePart(scope)}:${block.id}`).setLabel('Duplikér').setStyle(ButtonStyle.Secondary)
  ];
  if (hasProfiles) {
    controls.push(new ButtonBuilder().setCustomId(`builder_profiles:${scopePart(scope)}:${block.id}`).setLabel('Profiler').setStyle(ButtonStyle.Success));
  }
  controls.push(new ButtonBuilder().setCustomId(`builder_block_delete:${scopePart(scope)}:${block.id}`).setLabel('Slet').setStyle(ButtonStyle.Danger));

  const row = new ActionRowBuilder().addComponents(...controls);
  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`builder_blocks:${scopePart(scope)}`).setLabel('← Blocks').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`builder_back:${scopePart(scope)}`).setLabel('Builder').setStyle(ButtonStyle.Secondary)
  );

  return {
    content: [
      '## 🧱 Block',
      `**#${index + 1} · ${TYPE_ICONS[block.type] ?? ''} ${TYPE_NAMES[block.type] ?? block.type}**`,
      `ID: \`${block.id}\``,
      blockSummary(block),
      '',
      '**Flyt** åbner en positionsliste, så du ikke længere behøver klikke Op/Ned gentagne gange.'
    ].join('\n'),
    components: [row, back],
    allowedMentions: { parse: [] }
  };
}

export function buildMovePicker(entity, scope, blockId) {
  const index = entity.builder.blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return buildBlockPicker(entity, scope);
  const source = entity.builder.blocks[index];

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`builder_move_select:${scopePart(scope)}:${blockId}`)
    .setPlaceholder(`Flyt block #${index + 1} til position…`)
    .addOptions(entity.builder.blocks.map((block, targetIndex) => ({
      label: `Position ${targetIndex + 1}${targetIndex === index ? ' · nuværende' : ''}`,
      value: String(targetIndex),
      description: targetIndex === index
        ? 'Behold nuværende position'
        : `Placér ved ${truncate(blockSummary(block), 70)}`
    })));

  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`builder_manage_direct:${scopePart(scope)}:${blockId}`).setLabel('← Block').setStyle(ButtonStyle.Secondary)
  );

  return {
    content: `## ↕️ Flyt block\n**${TYPE_ICONS[source.type] ?? ''} ${TYPE_NAMES[source.type] ?? source.type}**\nVælg den endelige position direkte.`,
    components: [new ActionRowBuilder().addComponents(menu), back],
    allowedMentions: { parse: [] }
  };
}

function profileOptions(store) {
  return WOW_CLASSES.flatMap((wowClass) => RESOLUTIONS.map((resolution) => {
    const value = store.getProfile(wowClass.key, resolution.key);
    return {
      label: `${wowClass.name} — ${resolution.name}`,
      value: profilePart(wowClass.key, resolution.key),
      description: value ? `✅ ${value.length} tegn` : '❌ Mangler tekststreng',
      emoji: { name: wowClass.emojiName, id: wowClass.emojiId }
    };
  }));
}

export function buildProfilePicker(entity, scope, blockId, store) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`builder_profile_select:${scopePart(scope)}:${blockId}`)
    .setPlaceholder('Vælg class og opløsning…')
    .addOptions(profileOptions(store));

  const savedCount = WOW_CLASSES.flatMap((wowClass) => RESOLUTIONS.map((resolution) =>
    Boolean(store.getProfile(wowClass.key, resolution.key))
  )).filter(Boolean).length;

  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`builder_manage_direct:${scopePart(scope)}:${blockId}`).setLabel('← Block').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`builder_back:${scopePart(scope)}`).setLabel('Builder').setStyle(ButtonStyle.Secondary)
  );

  return {
    content: [
      '## 🎮 MerfinUI profiler',
      `**${entity.title}**`,
      `Gemte profiler: **${savedCount}/18**`,
      'Vælg én dropdown-option for at redigere dens TXT-indhold, teste den ephemeral besked eller rydde værdien.'
    ].join('\n'),
    components: [new ActionRowBuilder().addComponents(menu), back],
    allowedMentions: { parse: [] }
  };
}

export function buildProfileManager(entity, scope, blockId, classKey, resolutionKey, store) {
  const wowClass = findClass(classKey);
  const resolution = findResolution(resolutionKey);
  if (!wowClass || !resolution) throw new Error('Ugyldig class eller opløsning.');
  const value = store.getProfile(classKey, resolutionKey);
  const modalEditable = value.length <= 4_000;

  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`builder_profile_edit:${scopePart(scope)}:${blockId}:${profilePart(classKey, resolutionKey)}`)
      .setLabel(value ? 'Rediger TXT' : 'Tilføj TXT')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!modalEditable),
    new ButtonBuilder()
      .setCustomId(`builder_profile_preview:${scopePart(scope)}:${blockId}:${profilePart(classKey, resolutionKey)}`)
      .setLabel('Test ephemeral')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`builder_profile_clear:${scopePart(scope)}:${blockId}:${profilePart(classKey, resolutionKey)}`)
      .setLabel('Ryd')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!value)
  );

  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`builder_profiles:${scopePart(scope)}:${blockId}`).setLabel('← Profiler').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`builder_manage_direct:${scopePart(scope)}:${blockId}`).setLabel('Block').setStyle(ButtonStyle.Secondary)
  );

  const preview = value
    ? truncate(value.replace(/\s+/g, ' '), 240)
    : 'Ingen tekststreng gemt.';
  const longHint = modalEditable
    ? 'Denne værdi kan redigeres direkte i builderen.'
    : `⚠️ Strengen er over 4.000 tegn. Brug \`/profil importer klasse:${wowClass.name} oplosning:${resolution.name}\` til at erstatte den.`;

  return {
    content: [
      `## ${wowClass.name} — ${resolution.name}`,
      `Status: ${value ? `✅ **${value.length} tegn**` : '❌ **Mangler**'}`,
      longHint,
      '',
      `**Preview:** ${preview}`
    ].join('\n').slice(0, 1_950),
    components: [actions, back],
    allowedMentions: { parse: [] }
  };
}

export function buildProfileClearConfirmation(entity, scope, blockId, classKey, resolutionKey) {
  const wowClass = findClass(classKey);
  const resolution = findResolution(resolutionKey);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`builder_profile_clear_confirm:${scopePart(scope)}:${blockId}:${profilePart(classKey, resolutionKey)}`)
      .setLabel('Ja, ryd TXT')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`builder_profile_return:${scopePart(scope)}:${blockId}:${profilePart(classKey, resolutionKey)}`)
      .setLabel('Annuller')
      .setStyle(ButtonStyle.Secondary)
  );
  return {
    content: `⚠️ Ryd den gemte tekststreng for **${wowClass.name} — ${resolution.name}**? Dropdown-optionen bliver stående, men vil svare at profilen mangler.`,
    components: [row],
    allowedMentions: { parse: [] }
  };
}

export function buildSettingsModal(entity, scope) {
  return new ModalBuilder()
    .setCustomId(`builder_settings_modal:${scopePart(scope)}`)
    .setTitle('Post settings')
    .addLabelComponents(
      makeLabel({
        label: 'Forum-postens titel',
        input: makeInput({ id: 'post_title', maxLength: 100, value: entity.title, placeholder: 'Informationsopslag' })
      }),
      makeLabel({
        label: 'Accentfarve som HEX',
        input: makeInput({ id: 'accent_color', maxLength: 7, value: colorToHex(entity.builder.accentColor), placeholder: '#F1C40F' })
      })
    );
}

export function buildAddBlockModal(type, entity, scope) {
  const id = `builder_add_modal:${type}:${scopePart(scope)}`;
  switch (type) {
    case 'text':
      return new ModalBuilder().setCustomId(id).setTitle('Tilføj tekst').addLabelComponents(
        makeLabel({
          label: 'Markdown-tekst',
          description: 'Discord Markdown er understøttet.',
          input: makeInput({ id: 'content', style: TextInputStyle.Paragraph, maxLength: 4_000, placeholder: '# Overskrift\nBeskrivelse…' })
        })
      );
    case 'image':
      return new ModalBuilder().setCustomId(id).setTitle('Tilføj billede').addLabelComponents(
        makeLabel({ label: 'Billed-URL', input: makeInput({ id: 'url', maxLength: 1_000, placeholder: 'https://.../banner.png' }) }),
        makeLabel({ label: 'Beskrivelse / alt text', input: makeInput({ id: 'description', required: false, maxLength: 1_000, placeholder: 'Valgfri beskrivelse' }) })
      );
    case 'open':
      return new ModalBuilder().setCustomId(id).setTitle('Tilføj Open-knap').addLabelComponents(
        makeLabel({ label: 'Tekst ved knappen', input: makeInput({ id: 'text', style: TextInputStyle.Paragraph, maxLength: 1_500, placeholder: '🔗 • **Information**' }) }),
        makeLabel({ label: 'Button label', input: makeInput({ id: 'label', maxLength: 80, value: 'Open' }) }),
        makeLabel({ label: 'Ephemeral overskrift', input: makeInput({ id: 'response_title', required: false, maxLength: 180, placeholder: 'Information' }) }),
        makeLabel({ label: 'Ephemeral svar', input: makeInput({ id: 'response', style: TextInputStyle.Paragraph, maxLength: 3_700, placeholder: 'Teksten som kun den klikkende bruger ser.' }) })
      );
    case 'link':
      return new ModalBuilder().setCustomId(id).setTitle('Tilføj link-knap').addLabelComponents(
        makeLabel({ label: 'Tekst ved knappen', input: makeInput({ id: 'text', style: TextInputStyle.Paragraph, maxLength: 1_500, placeholder: '🔗 • **Website**' }) }),
        makeLabel({ label: 'Button label', input: makeInput({ id: 'label', maxLength: 80, value: 'Open' }) }),
        makeLabel({ label: 'URL', input: makeInput({ id: 'url', maxLength: 1_000, placeholder: 'https://...' }) })
      );
    case 'select':
      return new ModalBuilder().setCustomId(id).setTitle('Tilføj select box').addLabelComponents(
        makeLabel({ label: 'Placeholder', input: makeInput({ id: 'placeholder', maxLength: 150, value: 'Vælg en mulighed…' }) }),
        makeLabel({
          label: 'Options',
          description: 'Én pr. linje: Label | Svar. Brug \\n for linjeskift i svaret.',
          input: makeInput({ id: 'options', style: TextInputStyle.Paragraph, maxLength: 4_000, placeholder: 'FHD | Din FHD tekst\nQHD | Din QHD tekst' })
        })
      );
    case 'profile_select':
      return new ModalBuilder().setCustomId(id).setTitle('MerfinUI profile select').addLabelComponents(
        makeLabel({ label: 'Placeholder', input: makeInput({ id: 'placeholder', maxLength: 150, value: 'Vælg class og opløsning…' }) })
      );
    default:
      throw new Error(`Block-typen ${type} bruger ikke en formular.`);
  }
}

export function buildEditBlockModal(entity, scope, block) {
  const id = `builder_edit_modal:${scopePart(scope)}:${block.id}`;
  const action = block.actionId ? entity.builder.actions[block.actionId] : null;

  switch (block.type) {
    case 'text':
      return new ModalBuilder().setCustomId(id).setTitle('Rediger tekst').addLabelComponents(
        makeLabel({ label: 'Markdown-tekst', input: makeInput({ id: 'content', style: TextInputStyle.Paragraph, maxLength: 4_000, value: block.content }) })
      );
    case 'image':
      return new ModalBuilder().setCustomId(id).setTitle('Rediger billede').addLabelComponents(
        makeLabel({ label: 'Billed-URL', input: makeInput({ id: 'url', maxLength: 1_000, value: block.url }) }),
        makeLabel({ label: 'Beskrivelse / alt text', input: makeInput({ id: 'description', required: false, maxLength: 1_000, value: block.description }) })
      );
    case 'open':
      return new ModalBuilder().setCustomId(id).setTitle('Rediger Open-knap').addLabelComponents(
        makeLabel({ label: 'Tekst ved knappen', input: makeInput({ id: 'text', style: TextInputStyle.Paragraph, maxLength: 1_500, value: block.text }) }),
        makeLabel({ label: 'Button label', input: makeInput({ id: 'label', maxLength: 80, value: block.label || 'Open' }) }),
        makeLabel({ label: 'Ephemeral overskrift', input: makeInput({ id: 'response_title', required: false, maxLength: 180, value: action?.title }) }),
        makeLabel({ label: 'Ephemeral svar', input: makeInput({ id: 'response', style: TextInputStyle.Paragraph, maxLength: 3_700, value: action?.content }) })
      );
    case 'link':
      return new ModalBuilder().setCustomId(id).setTitle('Rediger link-knap').addLabelComponents(
        makeLabel({ label: 'Tekst ved knappen', input: makeInput({ id: 'text', style: TextInputStyle.Paragraph, maxLength: 1_500, value: block.text }) }),
        makeLabel({ label: 'Button label', input: makeInput({ id: 'label', maxLength: 80, value: block.label || 'Open' }) }),
        makeLabel({ label: 'URL', input: makeInput({ id: 'url', maxLength: 1_000, value: block.url }) })
      );
    case 'select': {
      const specification = serializeSelectOptions(block, entity.builder.actions);
      if (specification.length > 4_000) {
        throw new Error('Denne importerede select er for stor til Discords modal-editor. Eksporter JSON og rediger den dér.');
      }
      return new ModalBuilder().setCustomId(id).setTitle('Rediger select box').addLabelComponents(
        makeLabel({ label: 'Placeholder', input: makeInput({ id: 'placeholder', maxLength: 150, value: block.placeholder || 'Vælg en mulighed…' }) }),
        makeLabel({
          label: 'Options',
          description: 'Én pr. linje: Label | Svar. Brug \\n for linjeskift i svaret.',
          input: makeInput({ id: 'options', style: TextInputStyle.Paragraph, maxLength: 4_000, value: specification })
        })
      );
    }
    case 'profile_select':
      return new ModalBuilder().setCustomId(id).setTitle('Rediger MerfinUI select').addLabelComponents(
        makeLabel({ label: 'Placeholder', input: makeInput({ id: 'placeholder', maxLength: 150, value: block.placeholder || 'Vælg class og opløsning…' }) })
      );
    default:
      throw new Error('Denne block-type har ingen redigerbare felter.');
  }
}

export function buildProfileEditModal(entity, scope, blockId, classKey, resolutionKey, currentValue) {
  const wowClass = findClass(classKey);
  const resolution = findResolution(resolutionKey);
  if (!wowClass || !resolution) throw new Error('Ugyldig class eller opløsning.');
  if (currentValue.length > 4_000) {
    throw new Error('Denne streng er over 4.000 tegn. Brug /profil importer til at erstatte den.');
  }

  return new ModalBuilder()
    .setCustomId(`builder_profile_modal:${scopePart(scope)}:${blockId}:${profilePart(classKey, resolutionKey)}`)
    .setTitle(`${wowClass.name} — ${resolution.name}`)
    .addLabelComponents(
      makeLabel({
        label: 'TXT-indhold for denne dropdown-option',
        description: 'Gemmer direkte i MerfinUI profile storage.',
        input: makeInput({
          id: 'generated_string',
          style: TextInputStyle.Paragraph,
          maxLength: 4_000,
          value: currentValue,
          placeholder: '!GenereretTextString'
        })
      })
    );
}
