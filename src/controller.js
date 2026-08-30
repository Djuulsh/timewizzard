import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelFlags,
  ChannelType,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import {
  MAX_PROFILE_FILE_BYTES,
  RESOLUTIONS,
  WOW_CLASSES,
  findClass,
  findResolution
} from './constants.js';
import { buildProfileReply } from './render.js';
import {
  createManagedPost,
  deleteManagedPost,
  updateManagedPost
} from './postService.js';
import {
  extractSnowflake,
  formatError,
  normalizeGeneratedString,
  safeFileName,
  truncate
} from './utils.js';
import {
  makeImageBlock,
  makeLinkBlock,
  makeOpenBlock,
  makeProfileOpenListBlock,
  makeProfileSelectBlock,
  makeSelectBlock,
  makeSeparatorBlock,
  makeTextBlock,
  parseSelectOptions,
  duplicateBuilderBlock
} from './builder/blocks.js';
import { makeShortId } from './builder/ids.js';
import { exportBuffer, readBuilderAttachment } from './builder/io.js';
import { buildBuilderPayloads, getBuilderStats } from './builder/render.js';
import { createBuilderTemplate } from './builder/templates.js';
import {
  buildAddBlockModal,
  buildAddBlockPicker,
  buildBlockManager,
  buildBlockPicker,
  buildBuilderPanel,
  buildEditBlockModal,
  buildMovePicker,
  buildProfileClearConfirmation,
  buildProfileEditModal,
  buildProfileManager,
  buildProfilePicker,
  buildSettingsModal
} from './builder/ui.js';
import { parseStrictHexColor, validateBuilder } from './builder/validate.js';
import {
  buildGenericActionReply,
  resolveGenericAction,
  resolveStringSelect
} from './builder/actions.js';

function textInput({ id, style = TextInputStyle.Short, required = true, maxLength, value, placeholder }) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setStyle(style)
    .setRequired(required);

  if (maxLength) input.setMaxLength(maxLength);
  if (value !== undefined && value !== null && String(value).length > 0) input.setValue(String(value));
  if (placeholder) input.setPlaceholder(placeholder);
  return input;
}

function modalLabel({ label, description, input }) {
  const component = new LabelBuilder()
    .setLabel(label)
    .setTextInputComponent(input);

  if (description) component.setDescription(description);
  return component;
}

function buildProfileModal(classKey, resolutionKey, currentValue) {
  const wowClass = findClass(classKey);
  const resolution = findResolution(resolutionKey);
  const canPrefill = currentValue.length <= 4_000;

  return new ModalBuilder()
    .setCustomId(`profile_set:${classKey}:${resolutionKey}`)
    .setTitle(`${wowClass.name} — ${resolution.name}`)
    .addLabelComponents(
      modalLabel({
        label: 'Genereret tekststreng',
        description: 'Brug /profil importer til strenge over 4.000 tegn.',
        input: textInput({
          id: 'generated_string',
          style: TextInputStyle.Paragraph,
          maxLength: 4_000,
          value: canPrefill ? currentValue : undefined,
          placeholder: canPrefill
            ? '!GenereretTextString'
            : 'Den nuværende streng er over 4000 tegn. Brug /profil importer.'
        })
      })
    );
}

function hasAdminPermission(interaction) {
  return interaction.guildId &&
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

function formatPostInputError() {
  return 'Brug et kladde-ID, forum-postens ID, en kanalhenvisning som `<#123...>` eller hele Discord-linket.';
}

function appendActions(builder, actions) {
  for (const action of actions ?? []) builder.actions[action.id] = action;
}

function referencedActionIds(block) {
  const ids = [];
  if (block?.actionId) ids.push(block.actionId);
  for (const option of block?.options ?? []) if (option.actionId) ids.push(option.actionId);
  return ids;
}

function profileSelectValue(value) {
  const [, classKey, resolutionKey] = String(value).split(':');
  return { classKey, resolutionKey };
}

export class BotController {
  constructor({ client, store, config }) {
    this.client = client;
    this.store = store;
    this.config = config;
  }

  async handle(interaction) {
    try {
      if (interaction.guildId && interaction.guildId !== this.config.guildId) return;

      if (interaction.isAutocomplete()) {
        await this.handleAutocomplete(interaction);
        return;
      }

      if (interaction.isButton()) {
        await this.handleButton(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        await this.handleStringSelect(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        await this.handleModal(interaction);
        return;
      }

      if (interaction.isChatInputCommand()) {
        if (!hasAdminPermission(interaction)) {
          await interaction.reply({
            content: 'Du skal have tilladelsen **Administrer server** for at bruge denne kommando.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }
        await this.handleCommand(interaction);
      }
    } catch (error) {
      console.error('Interaction error:', error);
      const message = `Der opstod en fejl: ${formatError(error)}`;

      if (interaction.deferred) {
        await interaction.editReply({ content: message, components: [] }).catch(() => undefined);
      } else if (interaction.replied) {
        await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral }).catch(() => undefined);
      } else if (!interaction.isAutocomplete()) {
        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral }).catch(() => undefined);
      }
    }
  }

  async handleAutocomplete(interaction) {
    if (interaction.commandName !== 'post') {
      await interaction.respond([]);
      return;
    }

    const subcommand = interaction.options.getSubcommand(false);
    const focused = interaction.options.getFocused(true);
    if (!['opret', 'importer'].includes(subcommand) || focused.name !== 'tag') {
      await interaction.respond([]);
      return;
    }

    const forum = interaction.options.getChannel('forum', false);
    if (!forum || forum.type !== ChannelType.GuildForum) {
      await interaction.respond([]);
      return;
    }

    const search = String(focused.value).toLowerCase();
    const choices = forum.availableTags
      .filter((tag) => tag.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((tag) => ({ name: tag.name, value: tag.id }));
    await interaction.respond(choices);
  }

  async handleCommand(interaction) {
    switch (interaction.commandName) {
      case 'post':
        await this.handlePostCommand(interaction);
        break;
      case 'profil':
        await this.handleProfileCommand(interaction);
        break;
      case 'hjaelp':
        await this.showHelp(interaction);
        break;
      case 'webbuilder':
        await this.showWebBuilder(interaction);
        break;
      default:
        await interaction.reply({ content: 'Ukendt kommando.', flags: MessageFlags.Ephemeral });
    }
  }

  validateForumDestination(forum, tagId) {
    if (!forum || forum.type !== ChannelType.GuildForum) return 'Den valgte kanal er ikke en forum-kanal.';
    if (tagId && !forum.availableTags.some((tag) => tag.id === tagId)) return 'Det valgte tag findes ikke længere i forum-kanalen.';
    if (forum.flags.has(ChannelFlags.RequireTag) && !tagId) {
      const tags = forum.availableTags.map((tag) => `• ${tag.name}`).join('\n') || 'Ingen tags fundet.';
      return `Forum-kanalen kræver et tag. Vælg et tag i kommandoen:\n${tags}`;
    }
    return null;
  }

  resolveEntityInput(input) {
    const normalized = String(input ?? '').trim();
    if (!normalized) return null;

    const draft = this.store.getDraft(normalized);
    if (draft) return { scope: { kind: 'd', id: draft.id }, entity: draft };

    const threadId = extractSnowflake(normalized);
    if (threadId) {
      const post = this.store.getPost(threadId);
      if (post) return { scope: { kind: 'p', id: threadId }, entity: post };
    }

    return null;
  }

  getScopedEntity(kind, id) {
    const entity = kind === 'd' ? this.store.getDraft(id) : kind === 'p' ? this.store.getPost(id) : null;
    return entity ? { scope: { kind, id }, entity } : null;
  }

  async saveScopedEntity(scope, entity) {
    const saved = structuredClone(entity);
    saved.updatedAt = new Date().toISOString();
    saved.builder = validateBuilder(saved.builder);
    if (scope.kind === 'd') await this.store.saveDraft(saved);
    else if (scope.kind === 'p') await this.store.savePost(saved);
    else throw new Error('Ukendt builder-scope.');
    return saved;
  }

  async cloneToDraft(entity, scope, userId, titleOverride = null) {
    const forumId = scope.kind === 'd' ? entity.forumId : entity.forumChannelId;
    if (!forumId) throw new Error('Opslaget har ingen gemt forum-destination og kan ikke klones automatisk.');
    const now = new Date().toISOString();
    const draft = {
      id: makeShortId(4),
      title: (titleOverride || `${entity.title} (kopi)`).slice(0, 100),
      forumId,
      appliedTagIds: [...(entity.appliedTagIds ?? [])],
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      clonedFrom: { kind: scope.kind, id: scope.id },
      builder: validateBuilder(structuredClone(entity.builder))
    };
    await this.store.saveDraft(draft);
    return draft;
  }

  async handlePostCommand(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'opret') {
      const forum = interaction.options.getChannel('forum', true);
      const title = interaction.options.getString('titel', true).trim();
      const template = interaction.options.getString('template', false) || 'blank';
      const tagId = interaction.options.getString('tag', false);
      const destinationError = this.validateForumDestination(forum, tagId);
      if (destinationError) {
        await interaction.reply({ content: destinationError, flags: MessageFlags.Ephemeral });
        return;
      }

      const now = new Date().toISOString();
      const draft = {
        id: makeShortId(4),
        title,
        forumId: forum.id,
        appliedTagIds: tagId ? [tagId] : [],
        createdBy: interaction.user.id,
        createdAt: now,
        updatedAt: now,
        builder: createBuilderTemplate(template, title)
      };
      await this.store.saveDraft(draft);
      await interaction.reply({
        ...buildBuilderPanel(draft, { kind: 'd', id: draft.id }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'importer') {
      const forum = interaction.options.getChannel('forum', true);
      const attachment = interaction.options.getAttachment('fil', true);
      const overrideTitle = interaction.options.getString('titel', false)?.trim();
      const tagId = interaction.options.getString('tag', false);
      const destinationError = this.validateForumDestination(forum, tagId);
      if (destinationError) {
        await interaction.reply({ content: destinationError, flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const imported = await readBuilderAttachment(attachment);
      const now = new Date().toISOString();
      const draft = {
        id: makeShortId(4),
        title: overrideTitle || imported.title,
        forumId: forum.id,
        appliedTagIds: tagId ? [tagId] : [],
        createdBy: interaction.user.id,
        createdAt: now,
        updatedAt: now,
        builder: imported.builder
      };
      await this.store.saveDraft(draft);
      await interaction.editReply(buildBuilderPanel(draft, { kind: 'd', id: draft.id }));
      return;
    }

    if (subcommand === 'liste') {
      const drafts = this.store.listDrafts();
      const posts = this.store.listPosts();
      const sections = [];

      sections.push('## Kladder');
      sections.push(drafts.length
        ? drafts.map((draft) => `• **${draft.title}** — ID: \`${draft.id}\``).join('\n')
        : 'Ingen kladder.');
      sections.push('', '## Publicerede posts');
      sections.push(posts.length
        ? posts.map((post) => `• <#${post.threadId}> — **${post.title}** — ID: \`${post.threadId}\``).join('\n')
        : 'Ingen publicerede posts.');

      await interaction.reply({
        content: truncate(sections.join('\n'), 1_950),
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      });
      return;
    }

    const input = interaction.options.getString('post', true);
    const resolved = this.resolveEntityInput(input);
    if (!resolved) {
      await interaction.reply({
        content: `Opslaget blev ikke fundet. ${formatPostInputError()} Brug \`/post liste\` for at se ID'er.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const { entity, scope } = resolved;

    if (subcommand === 'klon') {
      const titleOverride = interaction.options.getString('titel', false)?.trim() || null;
      const draft = await this.cloneToDraft(entity, scope, interaction.user.id, titleOverride);
      await interaction.reply({
        ...buildBuilderPanel(draft, { kind: 'd', id: draft.id }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'rediger') {
      await interaction.reply({ ...buildBuilderPanel(entity, scope), flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === 'eksporter') {
      const fileName = `${safeFileName(entity.title)}-builder.json`;
      await interaction.reply({
        content: `Builder-JSON for **${entity.title}**.`,
        files: [{ attachment: exportBuffer(entity), name: fileName }],
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      });
      return;
    }

    if (subcommand === 'opdater') {
      if (scope.kind !== 'p') {
        await interaction.reply({ content: 'En kladde skal **Publiceres** fra Post Builder i stedet.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const updated = await updateManagedPost({ client: this.client, post: entity, store: this.store });
      await interaction.editReply(`✅ Opslaget <#${updated.threadId}> er opdateret fra den gemte builder.`);
      return;
    }

    if (subcommand === 'slet') {
      await interaction.reply({
        ...this.buildDeleteConfirmation(entity, scope, interaction.user.id),
        flags: MessageFlags.Ephemeral
      });
    }
  }

  buildDeleteConfirmation(entity, scope, userId) {
    const published = scope.kind === 'p';
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`entity_delete_confirm:${scope.kind}:${scope.id}:${userId}`)
        .setLabel(published ? 'Slet forum-post permanent' : 'Slet kladde')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`entity_delete_cancel:${scope.kind}:${scope.id}:${userId}`)
        .setLabel('Annuller')
        .setStyle(ButtonStyle.Secondary)
    );

    return {
      content: published
        ? `⚠️ Dette sletter **hele forum-posten** <#${scope.id}>. Handlingen kan ikke fortrydes.`
        : `⚠️ Slet kladden **${entity.title}** (\`${scope.id}\`)?`,
      components: [row],
      allowedMentions: { parse: [] }
    };
  }

  async handleProfileCommand(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'liste') {
      const lines = [];
      for (const wowClass of WOW_CLASSES) {
        const statuses = RESOLUTIONS.map((resolution) => {
          const value = this.store.getProfile(wowClass.key, resolution.key);
          return `${resolution.name}: ${value ? `✅ ${value.length} tegn` : '❌ mangler'}`;
        });
        lines.push(`**${wowClass.name}** — ${statuses.join(' · ')}`);
      }
      await interaction.reply({ content: lines.join('\n'), flags: MessageFlags.Ephemeral });
      return;
    }

    const classKey = interaction.options.getString('klasse', true);
    const resolutionKey = interaction.options.getString('oplosning', true);
    const wowClass = findClass(classKey);
    const resolution = findResolution(resolutionKey);
    if (!wowClass || !resolution) {
      await interaction.reply({ content: 'Ugyldig class eller opløsning.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === 'gem') {
      await interaction.showModal(buildProfileModal(classKey, resolutionKey, this.store.getProfile(classKey, resolutionKey)));
      return;
    }

    if (subcommand === 'importer') {
      const attachment = interaction.options.getAttachment('fil', true);
      if (!attachment.name.toLowerCase().endsWith('.txt')) {
        await interaction.reply({ content: 'Filen skal være en UTF-8 `.txt`-fil.', flags: MessageFlags.Ephemeral });
        return;
      }
      if (attachment.size > MAX_PROFILE_FILE_BYTES) {
        await interaction.reply({
          content: `Filen er for stor. Maksimum er ${MAX_PROFILE_FILE_BYTES.toLocaleString('da-DK')} bytes.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error(`Kunne ikke hente filen fra Discord (${response.status}).`);
      const value = normalizeGeneratedString(Buffer.from(await response.arrayBuffer()).toString('utf8'));
      if (!value) throw new Error('Tekstfilen var tom.');
      if (value.includes('\uFFFD')) throw new Error('Filen kunne ikke læses korrekt som UTF-8. Gem den som UTF-8 og prøv igen.');

      await this.store.setProfile(classKey, resolutionKey, value);
      await interaction.editReply(`✅ ${wowClass.name} — ${resolution.name} er importeret (${value.length} tegn).`);
      return;
    }

    if (subcommand === 'vis') {
      await interaction.reply(buildProfileReply(classKey, resolutionKey, this.store.getProfile(classKey, resolutionKey)));
      return;
    }

    if (subcommand === 'slet') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`profile_clear_confirm:${classKey}:${resolutionKey}:${interaction.user.id}`)
          .setLabel('Slet tekststrengen')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`profile_clear_cancel:${classKey}:${resolutionKey}:${interaction.user.id}`)
          .setLabel('Annuller')
          .setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({
        content: `Slet tekststrengen for **${wowClass.name} — ${resolution.name}**?`,
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    }
  }

  async handleButton(interaction) {
    // Public interactions must be handled before the admin permission gate.
    if (interaction.customId.startsWith('profile:')) {
      const [, classKey, resolutionKey] = interaction.customId.split(':');
      await interaction.reply(buildProfileReply(classKey, resolutionKey, this.store.getProfile(classKey, resolutionKey)));
      return;
    }

    if (interaction.customId.startsWith('info_action:')) {
      const [, kind, id, actionId] = interaction.customId.split(':');
      const resolved = resolveGenericAction(this.store, kind, id, actionId);
      if (!resolved) {
        await interaction.reply({ content: 'Denne interaction findes ikke længere.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply(buildGenericActionReply(resolved.action));
      return;
    }

    if (!hasAdminPermission(interaction)) {
      await interaction.reply({ content: 'Du mangler tilladelsen Administrer server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const parts = interaction.customId.split(':');
    const action = parts[0];

    if (action === 'profile_clear_confirm' || action === 'profile_clear_cancel') {
      const [, classKey, resolutionKey, userId] = parts;
      if (interaction.user.id !== userId) return;
      if (action === 'profile_clear_cancel') {
        await interaction.update({ content: 'Sletningen blev annulleret.', components: [] });
        return;
      }
      const wowClass = findClass(classKey);
      const resolution = findResolution(resolutionKey);
      await this.store.clearProfile(classKey, resolutionKey);
      await interaction.update({
        content: `✅ Tekststrengen for **${wowClass.name} — ${resolution.name}** er slettet.`,
        components: []
      });
      return;
    }

    if (action === 'entity_delete_confirm' || action === 'entity_delete_cancel') {
      const [, kind, id, userId] = parts;
      if (interaction.user.id !== userId) return;
      const resolved = this.getScopedEntity(kind, id);
      if (!resolved) {
        await interaction.update({ content: 'Opslaget findes ikke længere.', components: [] });
        return;
      }
      if (action === 'entity_delete_cancel') {
        await interaction.update(buildBuilderPanel(resolved.entity, resolved.scope));
        return;
      }
      await interaction.update({ content: 'Sletter…', components: [] });
      if (kind === 'd') await this.store.removeDraft(id);
      else await deleteManagedPost({ client: this.client, post: resolved.entity, store: this.store });
      await interaction.editReply(kind === 'd' ? '✅ Kladden er slettet.' : '✅ Forum-posten er slettet permanent.');
      return;
    }

    if (!action.startsWith('builder_')) {
      await interaction.reply({ content: 'Ukendt builder-handling.', flags: MessageFlags.Ephemeral });
      return;
    }

    await this.handleBuilderButton(interaction, parts);
  }

  async handleBuilderButton(interaction, parts) {
    const action = parts[0];
    const kind = parts[1];
    const id = parts[2];
    const blockId = parts[3] ?? null;
    const resolved = this.getScopedEntity(kind, id);
    if (!resolved) {
      await interaction.update({ content: 'Denne kladde/post findes ikke længere.', components: [] });
      return;
    }
    let { entity } = resolved;
    const scope = resolved.scope;

    if (action === 'builder_back') {
      await interaction.update(buildBuilderPanel(entity, scope));
      return;
    }
    if (action === 'builder_settings') {
      await interaction.showModal(buildSettingsModal(entity, scope));
      return;
    }
    if (action === 'builder_add') {
      await interaction.update(buildAddBlockPicker(entity, scope));
      return;
    }
    if (action === 'builder_blocks') {
      await interaction.update(buildBlockPicker(entity, scope));
      return;
    }
    if (action === 'builder_preview') {
      await this.sendPreview(interaction, entity, scope);
      return;
    }
    if (action === 'builder_export') {
      await interaction.reply({
        content: `Builder-JSON for **${entity.title}**.`,
        files: [{ attachment: exportBuffer(entity), name: `${safeFileName(entity.title)}-builder.json` }],
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      });
      return;
    }
    if (action === 'builder_clone') {
      const draft = await this.cloneToDraft(entity, scope, interaction.user.id);
      const draftScope = { kind: 'd', id: draft.id };
      const panel = buildBuilderPanel(draft, draftScope);
      await interaction.reply({
        ...panel,
        content: `✅ **${entity.title}** er klonet til en ny kladde.\n\n${panel.content}`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    if (action === 'builder_delete') {
      await interaction.update(this.buildDeleteConfirmation(entity, scope, interaction.user.id));
      return;
    }
    if (action === 'builder_publish') {
      await interaction.update({ content: scope.kind === 'd' ? 'Publicerer forum-posten…' : 'Opdaterer forum-posten…', components: [] });
      if (scope.kind === 'd') {
        const forum = await this.client.channels.fetch(entity.forumId);
        if (!forum || forum.type !== ChannelType.GuildForum) throw new Error('Forum-kanalen findes ikke længere.');
        const destinationError = this.validateForumDestination(forum, entity.appliedTagIds?.[0] ?? null);
        if (destinationError) throw new Error(destinationError);
        const post = await createManagedPost({ forum, draft: entity, store: this.store });
        await interaction.editReply({
          content: `✅ **${post.title}** er publiceret: <#${post.threadId}>\nBrug \`/post rediger post:${post.threadId}\` for at åbne builderen igen.`,
          components: [],
          allowedMentions: { parse: [] }
        });
      } else {
        const updated = await updateManagedPost({ client: this.client, post: entity, store: this.store });
        const panel = buildBuilderPanel(updated, scope);
        await interaction.editReply({ ...panel, content: `✅ Opslaget er opdateret på Discord.\n\n${panel.content}` });
      }
      return;
    }

    if (action === 'builder_manage_direct') {
      await interaction.update(buildBlockManager(entity, scope, blockId));
      return;
    }

    if (action === 'builder_profiles') {
      await interaction.update(buildProfilePicker(entity, scope, blockId, this.store));
      return;
    }

    if (action === 'builder_profile_edit') {
      const classKey = parts[4];
      const resolutionKey = parts[5];
      const currentValue = this.store.getProfile(classKey, resolutionKey);
      await interaction.showModal(buildProfileEditModal(entity, scope, blockId, classKey, resolutionKey, currentValue));
      return;
    }

    if (action === 'builder_profile_preview') {
      const classKey = parts[4];
      const resolutionKey = parts[5];
      await interaction.reply(buildProfileReply(classKey, resolutionKey, this.store.getProfile(classKey, resolutionKey)));
      return;
    }

    if (action === 'builder_profile_clear') {
      const classKey = parts[4];
      const resolutionKey = parts[5];
      await interaction.update(buildProfileClearConfirmation(entity, scope, blockId, classKey, resolutionKey));
      return;
    }

    if (action === 'builder_profile_clear_confirm') {
      const classKey = parts[4];
      const resolutionKey = parts[5];
      await this.store.clearProfile(classKey, resolutionKey);
      await interaction.update(buildProfileManager(entity, scope, blockId, classKey, resolutionKey, this.store));
      return;
    }

    if (action === 'builder_profile_return') {
      const classKey = parts[4];
      const resolutionKey = parts[5];
      await interaction.update(buildProfileManager(entity, scope, blockId, classKey, resolutionKey, this.store));
      return;
    }

    const index = entity.builder.blocks.findIndex((block) => block.id === blockId);
    if (index < 0) {
      await interaction.update(buildBlockPicker(entity, scope));
      return;
    }

    if (action === 'builder_block_edit') {
      await interaction.showModal(buildEditBlockModal(entity, scope, entity.builder.blocks[index]));
      return;
    }

    if (action === 'builder_block_move') {
      await interaction.update(buildMovePicker(entity, scope, blockId));
      return;
    }

    const updated = structuredClone(entity);
    let nextBlockId = blockId;
    if (action === 'builder_block_duplicate') {
      const copy = duplicateBuilderBlock(updated.builder, blockId);
      nextBlockId = copy.id;
    } else if (action === 'builder_block_delete') {
      const [removed] = updated.builder.blocks.splice(index, 1);
      for (const actionId of referencedActionIds(removed)) delete updated.builder.actions[actionId];
    } else {
      await interaction.update(buildBlockManager(entity, scope, blockId));
      return;
    }

    entity = await this.saveScopedEntity(scope, updated);
    if (action === 'builder_block_delete') {
      await interaction.update(entity.builder.blocks.length ? buildBlockPicker(entity, scope) : buildBuilderPanel(entity, scope));
    } else {
      await interaction.update(buildBlockManager(entity, scope, nextBlockId));
    }
  }

  async sendPreview(interaction, entity, scope) {
    const payloads = buildBuilderPayloads(entity, scope);
    const stats = getBuilderStats(entity, scope);
    await interaction.reply({
      content: [
        '## 👁 Preview',
        `**${entity.title}**`,
        `Blocks: **${stats.blockCount}** · Discord-beskeder ved publicering: **${stats.messageCount}**`,
        stats.messageCount > 1
          ? `⚠️ Discord-grænserne gør, at dette preview bliver delt over **${stats.messageCount} beskeder**.`
          : '✅ Dette layout kan publiceres som én Discord-besked.',
        '',
        'Previewet nedenfor er ephemeral og ændrer ikke det offentlige opslag.'
      ].join('\n'),
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
    for (const payload of payloads) {
      await interaction.followUp({
        ...payload,
        flags: payload.flags | MessageFlags.Ephemeral
      });
    }
  }

  async handleStringSelect(interaction) {
    if (interaction.customId.startsWith('info_select:')) {
      const [, kind, id, blockId] = interaction.customId.split(':');
      const value = interaction.values[0];
      if (value?.startsWith('profile:')) {
        const { classKey, resolutionKey } = profileSelectValue(value);
        await interaction.reply(buildProfileReply(classKey, resolutionKey, this.store.getProfile(classKey, resolutionKey)));
        return;
      }
      if (value?.startsWith('string:')) {
        const resolved = resolveStringSelect(this.store, kind, id, blockId, value.slice('string:'.length));
        if (!resolved) {
          await interaction.reply({ content: 'Denne string findes ikke længere.', flags: MessageFlags.Ephemeral });
          return;
        }
        await interaction.reply(buildGenericActionReply(resolved.action));
        return;
      }
      if (value?.startsWith('action:')) {
        const actionId = value.slice('action:'.length);
        const resolved = resolveGenericAction(this.store, kind, id, actionId, blockId);
        if (!resolved) {
          await interaction.reply({ content: 'Denne select-option findes ikke længere.', flags: MessageFlags.Ephemeral });
          return;
        }
        await interaction.reply(buildGenericActionReply(resolved.action));
        return;
      }
      await interaction.reply({ content: 'Ukendt select-værdi.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (!hasAdminPermission(interaction)) {
      await interaction.reply({ content: 'Du mangler tilladelsen Administrer server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const parts = interaction.customId.split(':');
    const action = parts[0];
    const kind = parts[1];
    const id = parts[2];
    const resolved = this.getScopedEntity(kind, id);
    if (!resolved) {
      await interaction.update({ content: 'Denne kladde/post findes ikke længere.', components: [] });
      return;
    }
    const { entity, scope } = resolved;

    if (action === 'builder_manage_select') {
      await interaction.update(buildBlockManager(entity, scope, interaction.values[0]));
      return;
    }

    if (action === 'builder_move_select') {
      const blockId = parts[3];
      const currentIndex = entity.builder.blocks.findIndex((block) => block.id === blockId);
      if (currentIndex < 0) {
        await interaction.update(buildBlockPicker(entity, scope));
        return;
      }
      const targetIndex = Number.parseInt(interaction.values[0], 10);
      if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= entity.builder.blocks.length) {
        throw new Error('Den valgte block-position er ugyldig.');
      }
      const updated = structuredClone(entity);
      const [moved] = updated.builder.blocks.splice(currentIndex, 1);
      updated.builder.blocks.splice(targetIndex, 0, moved);
      const saved = await this.saveScopedEntity(scope, updated);
      await interaction.update(buildBlockManager(saved, scope, blockId));
      return;
    }

    if (action === 'builder_profile_select') {
      const blockId = parts[3];
      const [classKey, resolutionKey] = String(interaction.values[0]).split(':');
      if (!findClass(classKey) || !findResolution(resolutionKey)) throw new Error('Ugyldig class eller opløsning.');
      await interaction.update(buildProfileManager(entity, scope, blockId, classKey, resolutionKey, this.store));
      return;
    }

    if (action !== 'builder_add_select') {
      await interaction.reply({ content: 'Ukendt builder-select.', flags: MessageFlags.Ephemeral });
      return;
    }

    const type = interaction.values[0];
    if (entity.builder.blocks.length >= 25) {
      await interaction.update({ content: 'Builderen kan højst have 25 blocks i v1.2.', components: [] });
      return;
    }

    if (type === 'separator' || type === 'profile_open_list') {
      const updated = structuredClone(entity);
      updated.builder.blocks.push(type === 'separator' ? makeSeparatorBlock() : makeProfileOpenListBlock());
      const saved = await this.saveScopedEntity(scope, updated);
      await interaction.update(buildBuilderPanel(saved, scope));
      return;
    }

    await interaction.showModal(buildAddBlockModal(type, entity, scope));
  }

  async handleModal(interaction) {
    if (!hasAdminPermission(interaction)) {
      await interaction.reply({ content: 'Du mangler tilladelsen Administrer server.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.customId.startsWith('profile_set:')) {
      const [, classKey, resolutionKey] = interaction.customId.split(':');
      const wowClass = findClass(classKey);
      const resolution = findResolution(resolutionKey);
      if (!wowClass || !resolution) throw new Error('Ugyldig class eller opløsning.');

      const value = normalizeGeneratedString(interaction.fields.getTextInputValue('generated_string'));
      if (!value) {
        await interaction.reply({ content: 'Tekststrengen må ikke være tom.', flags: MessageFlags.Ephemeral });
        return;
      }
      await this.store.setProfile(classKey, resolutionKey, value);
      await interaction.reply({
        content: `✅ ${wowClass.name} — ${resolution.name} er gemt (${value.length} tegn).`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const parts = interaction.customId.split(':');
    const action = parts[0];

    if (action === 'builder_profile_modal') {
      const kind = parts[1];
      const id = parts[2];
      const blockId = parts[3];
      const classKey = parts[4];
      const resolutionKey = parts[5];
      const resolved = this.getScopedEntity(kind, id);
      if (!resolved) throw new Error('Kladde/post findes ikke længere.');
      if (!findClass(classKey) || !findResolution(resolutionKey)) throw new Error('Ugyldig class eller opløsning.');
      const value = normalizeGeneratedString(interaction.fields.getTextInputValue('generated_string'));
      if (!value) throw new Error('Tekststrengen må ikke være tom. Brug Ryd-knappen hvis værdien skal fjernes.');
      await this.store.setProfile(classKey, resolutionKey, value);
      await interaction.reply({
        ...buildProfileManager(resolved.entity, resolved.scope, blockId, classKey, resolutionKey, this.store),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (action === 'builder_settings_modal') {
      const kind = parts[1];
      const id = parts[2];
      const resolved = this.getScopedEntity(kind, id);
      if (!resolved) throw new Error('Kladde/post findes ikke længere.');
      const updated = structuredClone(resolved.entity);
      updated.title = interaction.fields.getTextInputValue('post_title').trim();
      updated.builder.accentColor = parseStrictHexColor(interaction.fields.getTextInputValue('accent_color'));
      if (!updated.title) throw new Error('Forum-postens titel må ikke være tom.');
      const saved = await this.saveScopedEntity(resolved.scope, updated);
      await this.respondWithPanel(interaction, saved, resolved.scope);
      return;
    }

    if (action === 'builder_add_modal') {
      const type = parts[1];
      const kind = parts[2];
      const id = parts[3];
      const resolved = this.getScopedEntity(kind, id);
      if (!resolved) throw new Error('Kladde/post findes ikke længere.');
      const updated = structuredClone(resolved.entity);
      if (updated.builder.blocks.length >= 25) throw new Error('Builderen kan højst have 25 blocks.');
      this.addBlockFromModal(updated, type, interaction);
      const saved = await this.saveScopedEntity(resolved.scope, updated);
      await this.respondWithPanel(interaction, saved, resolved.scope);
      return;
    }

    if (action === 'builder_edit_modal') {
      const kind = parts[1];
      const id = parts[2];
      const blockId = parts[3];
      const resolved = this.getScopedEntity(kind, id);
      if (!resolved) throw new Error('Kladde/post findes ikke længere.');
      const updated = structuredClone(resolved.entity);
      const block = updated.builder.blocks.find((item) => item.id === blockId);
      if (!block) throw new Error('Blocket findes ikke længere.');
      this.editBlockFromModal(updated, block, interaction);
      const saved = await this.saveScopedEntity(resolved.scope, updated);
      await this.respondWithPanel(interaction, saved, resolved.scope);
      return;
    }

    await interaction.reply({ content: 'Ukendt formular.', flags: MessageFlags.Ephemeral });
  }

  addBlockFromModal(entity, type, interaction) {
    if (type === 'text') {
      entity.builder.blocks.push(makeTextBlock(interaction.fields.getTextInputValue('content').trim()));
      return;
    }
    if (type === 'image') {
      entity.builder.blocks.push(makeImageBlock(
        interaction.fields.getTextInputValue('url').trim(),
        interaction.fields.getTextInputValue('description').trim()
      ));
      return;
    }
    if (type === 'open') {
      const made = makeOpenBlock({
        text: interaction.fields.getTextInputValue('text').trim(),
        label: interaction.fields.getTextInputValue('label').trim(),
        title: interaction.fields.getTextInputValue('response_title').trim(),
        response: interaction.fields.getTextInputValue('response').trim()
      });
      entity.builder.blocks.push(made.block);
      appendActions(entity.builder, made.actions);
      return;
    }
    if (type === 'link') {
      entity.builder.blocks.push(makeLinkBlock({
        text: interaction.fields.getTextInputValue('text').trim(),
        label: interaction.fields.getTextInputValue('label').trim(),
        url: interaction.fields.getTextInputValue('url').trim()
      }));
      return;
    }
    if (type === 'select') {
      const made = makeSelectBlock({
        placeholder: interaction.fields.getTextInputValue('placeholder').trim(),
        specification: interaction.fields.getTextInputValue('options')
      });
      entity.builder.blocks.push(made.block);
      appendActions(entity.builder, made.actions);
      return;
    }
    if (type === 'profile_select') {
      const block = makeProfileSelectBlock();
      block.placeholder = interaction.fields.getTextInputValue('placeholder').trim();
      entity.builder.blocks.push(block);
      return;
    }
    throw new Error(`Ukendt block-type: ${type}`);
  }

  editBlockFromModal(entity, block, interaction) {
    if (block.type === 'text') {
      block.content = interaction.fields.getTextInputValue('content').trim();
      return;
    }
    if (block.type === 'image') {
      block.url = interaction.fields.getTextInputValue('url').trim();
      block.description = interaction.fields.getTextInputValue('description').trim();
      return;
    }
    if (block.type === 'open') {
      block.text = interaction.fields.getTextInputValue('text').trim();
      block.label = interaction.fields.getTextInputValue('label').trim();
      const action = entity.builder.actions[block.actionId];
      if (!action) throw new Error('Open-blocket mangler sin action.');
      action.title = interaction.fields.getTextInputValue('response_title').trim();
      action.content = interaction.fields.getTextInputValue('response').trim();
      return;
    }
    if (block.type === 'link') {
      block.text = interaction.fields.getTextInputValue('text').trim();
      block.label = interaction.fields.getTextInputValue('label').trim();
      block.url = interaction.fields.getTextInputValue('url').trim();
      return;
    }
    if (block.type === 'select') {
      const definitions = parseSelectOptions(interaction.fields.getTextInputValue('options'));
      const oldActionIds = block.options.map((option) => option.actionId);
      const nextOptions = [];
      for (let index = 0; index < definitions.length; index += 1) {
        const definition = definitions[index];
        const actionId = oldActionIds[index] || makeShortId(4);
        entity.builder.actions[actionId] = {
          id: actionId,
          type: 'ephemeral_text',
          title: definition.label,
          content: definition.response
        };
        nextOptions.push({ label: definition.label, actionId });
      }
      for (const actionId of oldActionIds.slice(definitions.length)) delete entity.builder.actions[actionId];
      block.placeholder = interaction.fields.getTextInputValue('placeholder').trim();
      block.options = nextOptions;
      return;
    }
    if (block.type === 'profile_select') {
      block.placeholder = interaction.fields.getTextInputValue('placeholder').trim();
      return;
    }
    throw new Error('Denne block-type kan ikke redigeres.');
  }

  async respondWithPanel(interaction, entity, scope) {
    const payload = buildBuilderPanel(entity, scope);
    if (typeof interaction.isFromMessage === 'function' && interaction.isFromMessage()) {
      await interaction.update(payload);
    } else {
      await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }
  }

  async showWebBuilder(interaction) {
    if (!this.config.webEnabled) {
      await interaction.reply({
        content: 'Web Builder er ikke aktiveret endnu. Tilføj `DISCORD_CLIENT_SECRET` og `PUBLIC_BASE_URL` i Railway og redeploy.',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      });
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Åbn Web Builder')
        .setStyle(ButtonStyle.Link)
        .setURL(`${this.config.publicBaseUrl}/auth/discord`)
    );
    await interaction.reply({
      content: '## Shrouded Web Builder v1.2.1\nÅbn den sikre Discord OAuth-beskyttede builder. Her kan du bruge ægte drag-and-drop og side-by-side preview.',
      components: [row],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  }

  async showHelp(interaction) {
    const content = [
      '## Shrouded Info Bot v1.2.1 — Discord + Web Builder',
      '',
      '**Post Builder**',
      '`/post opret` — lav en kladde, vælg destination og evt. template.',
      '`/post rediger` — åbn builderen for en kladde eller publiceret post.',
      '`/post opdater` — send gemte builder-ændringer til Discord.',
      '`/post eksporter` — download builderen som JSON.',
      '`/post importer` — indlæs en builder-JSON som ny kladde.',
      '`/post slet` — slet kladde eller forum-post med bekræftelse.',
      '`/post klon` — klon en kladde eller publiceret post til en ny kladde.',
      '`/post liste` — se kladder og publicerede posts.',
      '',
      '**Builder blocks**',
      'Tekst · Billede/banner · Separator · Open + ephemeral · Link · Select + ephemeral · MerfinUI compact select · legacy Open-liste.',
      'Vælg et block → **Rediger / Flyt / Duplikér / Slet**. Flyt vælger den endelige position direkte.',
      'På MerfinUI-blocks åbner **Profiler** den direkte editor for alle 18 class/resolution-strenge.',
      '',
      '**Class-strenge**',
      '`/profil gem` / `importer` / `vis` / `slet` / `liste` fungerer som før.',
      '',
      '',
      '**Web Builder**',
      '`/webbuilder` — åbner Railway-hostet drag-and-drop builder med Discord OAuth.',
      'Web Builder og Discord-builderen bruger det samme dataformat og samme Railway Volume.',
      '',
      'Tip: Erstat legacy **MerfinUI Open-liste** med **MerfinUI compact select** for at få alle 18 class/resolution-valg i én dropdown og normalt holde opslaget i én Discord-besked.'
    ].join('\n');

    await interaction.reply({
      content,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  }
}
