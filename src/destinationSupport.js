import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js';
import { makeShortId } from './builder/ids.js';
import { readBuilderAttachment } from './builder/io.js';
import { buildBuilderPanel } from './builder/ui.js';
import { createBuilderTemplate } from './builder/templates.js';
import {
  destinationLabel,
  destinationTypeForChannel,
  getDestinationChannelId,
  getDestinationType,
  validateDestination
} from './destinations.js';
import { createManagedPost, deleteManagedPost, updateManagedPost } from './postService.js';
import { truncate } from './utils.js';

function messageLink(config, post) {
  const channelId = getDestinationChannelId(post);
  const messageId = post.starterMessageId;
  return channelId && messageId
    ? `https://discord.com/channels/${config.guildId}/${channelId}/${messageId}`
    : null;
}

function postReference(config, post) {
  if (getDestinationType(post) === 'forum') return `<#${post.threadId}>`;
  const link = messageLink(config, post);
  return link ? `[Åbn besked](${link})` : `Kanal <#${getDestinationChannelId(post)}>`;
}

function canAdmin(interaction) {
  return interaction.guildId && interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

export function installDestinationSupport(BotController) {
  BotController.prototype.validateForumDestination = function validateBuilderDestination(channel, tagId) {
    return validateDestination(channel, tagId);
  };

  BotController.prototype.cloneToDraft = async function cloneToDraft(entity, scope, userId, titleOverride = null) {
    const destinationChannelId = getDestinationChannelId(entity);
    if (!destinationChannelId) throw new Error('Opslaget har ingen gemt destination og kan ikke klones automatisk.');
    const now = new Date().toISOString();
    const draft = {
      id: makeShortId(4),
      title: (titleOverride || `${entity.title} (kopi)`).slice(0, 100),
      // Keep forumId as a compatibility alias used by the existing Discord builder.
      forumId: destinationChannelId,
      destinationType: entity.destinationType || (scope.kind === 'p' ? getDestinationType(entity) : 'forum'),
      destinationChannelId,
      appliedTagIds: [...(entity.appliedTagIds ?? [])],
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      clonedFrom: { kind: scope.kind, id: scope.id },
      builder: structuredClone(entity.builder)
    };
    await this.store.saveDraft(draft);
    return draft;
  };

  const originalPostCommand = BotController.prototype.handlePostCommand;
  BotController.prototype.handlePostCommand = async function handlePostCommandWithChannels(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'opret') {
      const channel = interaction.options.getChannel('forum', true);
      if (destinationTypeForChannel(channel) === 'channel') {
        const title = interaction.options.getString('titel', true).trim();
        const template = interaction.options.getString('template', false) || 'blank';
        const tagId = interaction.options.getString('tag', false);
        const error = validateDestination(channel, tagId);
        if (error) {
          await interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
          return;
        }
        const now = new Date().toISOString();
        const draft = {
          id: makeShortId(4),
          title,
          forumId: channel.id,
          destinationType: 'channel',
          destinationChannelId: channel.id,
          appliedTagIds: [],
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
    }

    if (subcommand === 'importer') {
      const channel = interaction.options.getChannel('forum', true);
      if (destinationTypeForChannel(channel) === 'channel') {
        const attachment = interaction.options.getAttachment('fil', true);
        const overrideTitle = interaction.options.getString('titel', false)?.trim();
        const tagId = interaction.options.getString('tag', false);
        const error = validateDestination(channel, tagId);
        if (error) {
          await interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
          return;
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const imported = await readBuilderAttachment(attachment);
        const now = new Date().toISOString();
        const draft = {
          id: makeShortId(4),
          title: overrideTitle || imported.title,
          forumId: channel.id,
          destinationType: 'channel',
          destinationChannelId: channel.id,
          appliedTagIds: [],
          createdBy: interaction.user.id,
          createdAt: now,
          updatedAt: now,
          builder: imported.builder
        };
        await this.store.saveDraft(draft);
        await interaction.editReply(buildBuilderPanel(draft, { kind: 'd', id: draft.id }));
        return;
      }
    }

    if (subcommand === 'liste') {
      const drafts = this.store.listDrafts();
      const posts = this.store.listPosts();
      const draftLines = drafts.map((draft) => {
        const type = draft.destinationType || 'forum';
        return `• **${draft.title}** — ${type === 'forum' ? 'Forum' : 'Kanal'} <#${getDestinationChannelId(draft)}> — ID: \`${draft.id}\``;
      });
      const postLines = posts.map((post) =>
        `• ${postReference(this.config, post)} — **${post.title}** — ${destinationLabel(post)} — ID: \`${post.threadId}\``
      );
      await interaction.reply({
        content: truncate([
          '## Kladder',
          draftLines.length ? draftLines.join('\n') : 'Ingen kladder.',
          '',
          '## Publicerede posts',
          postLines.length ? postLines.join('\n') : 'Ingen publicerede posts.'
        ].join('\n'), 1_950),
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      });
      return;
    }

    if (subcommand === 'opdater') {
      const input = interaction.options.getString('post', true);
      const resolved = this.resolveEntityInput(input);
      if (resolved?.scope.kind === 'p' && getDestinationType(resolved.entity) === 'channel') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const updated = await updateManagedPost({ client: this.client, post: resolved.entity, store: this.store });
        const link = messageLink(this.config, updated);
        await interaction.editReply(link
          ? `✅ Opslaget er opdateret: ${link}`
          : '✅ Opslaget er opdateret i Discord-kanalen.');
        return;
      }
    }

    return originalPostCommand.call(this, interaction);
  };

  const originalBuilderButton = BotController.prototype.handleBuilderButton;
  BotController.prototype.handleBuilderButton = async function handleBuilderButtonWithChannels(interaction, parts) {
    const action = parts[0];
    const kind = parts[1];
    const id = parts[2];

    if (action === 'builder_publish' && kind === 'd') {
      const resolved = this.getScopedEntity(kind, id);
      if (resolved) {
        const destinationId = getDestinationChannelId(resolved.entity);
        const channel = await this.client.channels.fetch(destinationId).catch(() => null);
        if (channel && destinationTypeForChannel(channel) === 'channel') {
          const error = validateDestination(channel, null);
          if (error) throw new Error(error);
          await interaction.update({ content: 'Publicerer opslaget i kanalen…', components: [] });
          const post = await createManagedPost({ destination: channel, draft: resolved.entity, store: this.store });
          const link = messageLink(this.config, post);
          await interaction.editReply({
            content: `✅ **${post.title}** er publiceret${link ? `: ${link}` : '.'}\nBrug \`/post rediger post:${post.threadId}\` for at åbne builderen igen.`,
            components: [],
            allowedMentions: { parse: [] }
          });
          return;
        }
      }
    }

    return originalBuilderButton.call(this, interaction, parts);
  };

  BotController.prototype.buildDeleteConfirmation = function buildGenericDeleteConfirmation(entity, scope, userId) {
    const published = scope.kind === 'p';
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`entity_delete_confirm:${scope.kind}:${scope.id}:${userId}`)
        .setLabel(published ? 'Slet opslag' : 'Slet kladde')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`entity_delete_cancel:${scope.kind}:${scope.id}:${userId}`)
        .setLabel('Annuller')
        .setStyle(ButtonStyle.Secondary)
    );

    return {
      content: published
        ? `⚠️ Slet **${entity.title}** fra Builder og forsøg at slette Discord-indholdet? Hvis kanalen/tråden allerede er slettet, fjernes Builder-posten stadig.`
        : `⚠️ Slet kladden **${entity.title}** (\`${scope.id}\`)?`,
      components: [row],
      allowedMentions: { parse: [] }
    };
  };

  const originalHandleButton = BotController.prototype.handleButton;
  BotController.prototype.handleButton = async function handleButtonWithResilientDelete(interaction) {
    if (!interaction.customId.startsWith('entity_delete_confirm:') && !interaction.customId.startsWith('entity_delete_cancel:')) {
      return originalHandleButton.call(this, interaction);
    }

    if (!canAdmin(interaction)) {
      await interaction.reply({ content: 'Du mangler tilladelsen Administrer server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const [action, kind, id, userId] = interaction.customId.split(':');
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
    if (kind === 'd') {
      await this.store.removeDraft(id);
      await interaction.editReply('✅ Kladden er slettet.');
      return;
    }

    const result = await deleteManagedPost({ client: this.client, post: resolved.entity, store: this.store });
    if (result.destinationMissing) {
      await interaction.editReply('✅ Posten er fjernet fra Builder. Discord-kanalen/tråden var allerede slettet eller utilgængelig.');
    } else if (result.warning) {
      await interaction.editReply(`✅ Posten er fjernet fra Builder. Discord-indholdet kunne ikke slettes automatisk: ${result.warning}`);
    } else {
      await interaction.editReply('✅ Opslaget er slettet fra Discord og Builder.');
    }
  };
}
