import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { DEFAULT_COLOR, RESOLUTIONS, WOW_CLASSES, getClass, getResolution } from './constants.js';
import { createPost, deletePost, updatePost } from './postService.js';

function adminReply(content, extra = {}) {
  return { content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] }, ...extra };
}

function profileLabel(classKey, resolutionKey) {
  const wowClass = getClass(classKey);
  const resolution = getResolution(resolutionKey);
  return `${wowClass?.name ?? classKey} — ${resolution?.name ?? resolutionKey.toUpperCase()}`;
}

async function replyProfile(interaction, storage, classKey, resolutionKey) {
  const profile = storage.getProfile(classKey, resolutionKey);
  const label = profileLabel(classKey, resolutionKey);

  if (!profile?.text) {
    await interaction.reply(adminReply(`**${label}**\n\nDenne profiltekst er ikke oprettet endnu.`));
    return;
  }

  const text = profile.text;
  if (text.length <= 1750 && !text.includes('```')) {
    await interaction.reply(adminReply(`## ${label}\n\n\`\`\`text\n${text}\n\`\`\``));
    return;
  }

  const fileName = `${classKey}-${resolutionKey}.txt`;
  await interaction.reply(adminReply(`## ${label}\n\nTekststrengen er vedhæftet som TXT.`, {
    files: [{ attachment: Buffer.from(text, 'utf8'), name: fileName }]
  }));
}

function addModalField(modal, id, label, style, value = '', required = true, maxLength = 4000) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required)
    .setMaxLength(maxLength);
  if (value) input.setValue(value.slice(0, maxLength));
  modal.addComponents(new ActionRowBuilder().addComponents(input));
}

function postModal(customId, title, record = {}) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
  addModalField(modal, 'forumTitle', 'Forum post title', TextInputStyle.Short, record.forumTitle || '', true, 100);
  addModalField(modal, 'heading', 'Heading inside the post', TextInputStyle.Short, record.heading || '', true, 256);
  addModalField(modal, 'description', 'Description', TextInputStyle.Paragraph, record.description || '', true, 4000);
  addModalField(modal, 'bannerUrl', 'Header banner URL (optional)', TextInputStyle.Short, record.bannerUrl || '', false, 1000);
  addModalField(modal, 'color', 'Accent color, e.g. #F1C40F', TextInputStyle.Short, record.color ? `#${record.color.toString(16).padStart(6, '0').toUpperCase()}` : '#F1C40F', true, 7);
  return modal;
}

function parseColor(value) {
  const cleaned = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return DEFAULT_COLOR;
  return Number.parseInt(cleaned, 16);
}

export async function handleInteraction(interaction, { client, storage, config }) {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'status') {
        const profileCount = Object.keys(storage.listProfiles()).length;
        const postCount = storage.listPosts().length;
        await interaction.reply(adminReply([
          '**Timewizzard Info Bot**',
          `Status: ✅ Online`,
          `Ping: ${client.ws.ping} ms`,
          `Profiles: ${profileCount}/18`,
          `Posts: ${postCount}`,
          `Guild: ${config.guildId}`
        ].join('\n')));
        return;
      }

      if (interaction.commandName === 'profil') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'liste') {
          const lines = WOW_CLASSES.map((wowClass) => {
            const states = RESOLUTIONS.map((resolution) => {
              const profile = storage.getProfile(wowClass.key, resolution.key);
              return `${resolution.name}: ${profile?.text ? `✅ ${profile.text.length} tegn` : '❌ mangler'}`;
            }).join(' · ');
            return `**${wowClass.name}** — ${states}`;
          });
          await interaction.reply(adminReply(lines.join('\n')));
          return;
        }

        const classKey = interaction.options.getString('klasse', true);
        const resolutionKey = interaction.options.getString('oplosning', true);

        if (sub === 'gem') {
          const modal = new ModalBuilder()
            .setCustomId(`profile_set:${classKey}:${resolutionKey}`)
            .setTitle(`Gem ${profileLabel(classKey, resolutionKey)}`);
          addModalField(modal, 'text', 'TXT / generated string', TextInputStyle.Paragraph, storage.getProfile(classKey, resolutionKey)?.text || '', true, 4000);
          await interaction.showModal(modal);
          return;
        }

        if (sub === 'importer') {
          const attachment = interaction.options.getAttachment('fil', true);
          if (attachment.size > 1024 * 1024) throw new Error('TXT file must be 1 MB or smaller.');
          const response = await fetch(attachment.url);
          if (!response.ok) throw new Error('Could not download the attached TXT file.');
          const text = await response.text();
          await storage.setProfile(classKey, resolutionKey, text.replace(/^\uFEFF/, ''));
          await interaction.reply(adminReply(`✅ Gemte **${profileLabel(classKey, resolutionKey)}** (${text.length} tegn).`));
          return;
        }

        if (sub === 'vis') {
          await replyProfile(interaction, storage, classKey, resolutionKey);
          return;
        }

        if (sub === 'slet') {
          await storage.deleteProfile(classKey, resolutionKey);
          await interaction.reply(adminReply(`🗑️ Slettede **${profileLabel(classKey, resolutionKey)}**.`));
          return;
        }
      }

      if (interaction.commandName === 'post') {
        const sub = interaction.options.getSubcommand();

        if (sub === 'opret') {
          const forum = interaction.options.getChannel('forum', true);
          await interaction.showModal(postModal(`post_create:${forum.id}`, 'Create information post'));
          return;
        }

        if (sub === 'liste') {
          const posts = storage.listPosts();
          const text = posts.length
            ? posts.map((post) => `• **${post.forumTitle}** — \`${post.threadId}\``).join('\n')
            : 'Ingen posts er gemt endnu.';
          await interaction.reply(adminReply(text));
          return;
        }

        const threadId = interaction.options.getString('post', true).replace(/\D/g, '');
        const record = storage.getPost(threadId);
        if (!record) {
          await interaction.reply(adminReply('❌ Denne post findes ikke i bottens storage.'));
          return;
        }

        if (sub === 'rediger') {
          await interaction.showModal(postModal(`post_edit:${threadId}`, 'Edit information post', record));
          return;
        }

        if (sub === 'opdater') {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          await updatePost(client, storage, record);
          await interaction.editReply('✅ Posten er genopbygget.');
          return;
        }

        if (sub === 'slet') {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`post_delete_confirm:${threadId}`).setLabel('Slet permanent').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('post_delete_cancel').setLabel('Annuller').setStyle(ButtonStyle.Secondary)
          );
          await interaction.reply(adminReply(`⚠️ Slet **${record.forumTitle}** og hele forum-tråden?`, { components: [row] }));
          return;
        }
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('profile_set:')) {
        const [, classKey, resolutionKey] = interaction.customId.split(':');
        const text = interaction.fields.getTextInputValue('text');
        await storage.setProfile(classKey, resolutionKey, text);
        await interaction.reply(adminReply(`✅ Gemte **${profileLabel(classKey, resolutionKey)}** (${text.length} tegn).`));
        return;
      }

      if (interaction.customId.startsWith('post_create:')) {
        const forumId = interaction.customId.split(':')[1];
        const postData = {
          forumTitle: interaction.fields.getTextInputValue('forumTitle').trim(),
          heading: interaction.fields.getTextInputValue('heading').trim(),
          description: interaction.fields.getTextInputValue('description').trim(),
          bannerUrl: interaction.fields.getTextInputValue('bannerUrl').trim(),
          color: parseColor(interaction.fields.getTextInputValue('color'))
        };
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const record = await createPost(client, storage, forumId, postData);
        await interaction.editReply(`✅ Oprettede **${record.forumTitle}**. Thread ID: \`${record.threadId}\``);
        return;
      }

      if (interaction.customId.startsWith('post_edit:')) {
        const threadId = interaction.customId.split(':')[1];
        const current = storage.getPost(threadId);
        if (!current) throw new Error('Post not found in storage.');
        const updated = {
          ...current,
          forumTitle: interaction.fields.getTextInputValue('forumTitle').trim(),
          heading: interaction.fields.getTextInputValue('heading').trim(),
          description: interaction.fields.getTextInputValue('description').trim(),
          bannerUrl: interaction.fields.getTextInputValue('bannerUrl').trim(),
          color: parseColor(interaction.fields.getTextInputValue('color'))
        };
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await updatePost(client, storage, updated);
        await interaction.editReply('✅ Posten er opdateret.');
        return;
      }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'profile_select') {
      const [type, classKey, resolutionKey] = interaction.values[0].split(':');
      if (type !== 'profile') return;
      await replyProfile(interaction, storage, classKey, resolutionKey);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'post_delete_cancel') {
        await interaction.update({ content: 'Sletning annulleret.', components: [] });
        return;
      }

      if (interaction.customId.startsWith('post_delete_confirm:')) {
        const threadId = interaction.customId.split(':')[1];
        await interaction.update({ content: 'Sletter...', components: [] });
        await deletePost(client, storage, threadId);
        await interaction.editReply('✅ Posten er slettet.');
        return;
      }
    }
  } catch (error) {
    console.error('Interaction error:', error);
    const message = `❌ ${error.message || 'Ukendt fejl'}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message, components: [] }).catch(() => {});
    } else {
      await interaction.reply(adminReply(message)).catch(() => {});
    }
  }
}
