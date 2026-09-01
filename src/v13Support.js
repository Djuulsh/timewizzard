import { MessageFlags } from 'discord.js';
import { buildGenericActionReply, resolveGenericAction } from './builder/actions.js';
import { recreateManagedPost, refreshManagedPostState } from './postService.js';

export function installV13Support(BotController) {
  const originalHandleButton = BotController.prototype.handleButton;
  BotController.prototype.handleButton = async function handleButtonV13(interaction) {
    if (interaction.customId.startsWith('info_action:')) {
      const [, kind, id, actionId] = interaction.customId.split(':');
      const resolved = resolveGenericAction(this.store, kind, id, actionId);
      if (!resolved) {
        await interaction.reply({ content: 'Denne interaction findes ikke længere.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply(buildGenericActionReply(resolved.action, { kind, id }));
      return;
    }
    return originalHandleButton.call(this, interaction);
  };

  const originalStringSelect = BotController.prototype.handleStringSelect;
  BotController.prototype.handleStringSelect = async function handleStringSelectV13(interaction) {
    if (interaction.customId.startsWith('info_nested_select:')) {
      const [, kind, id] = interaction.customId.split(':');
      const value = interaction.values[0] || '';
      const actionId = value.startsWith('action:') ? value.slice('action:'.length) : '';
      const resolved = actionId ? resolveGenericAction(this.store, kind, id, actionId) : null;
      if (!resolved) {
        await interaction.reply({ content: 'Denne nested option findes ikke længere.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply(buildGenericActionReply(resolved.action, { kind, id }));
      return;
    }
    return originalStringSelect.call(this, interaction);
  };

  const originalBuilderButton = BotController.prototype.handleBuilderButton;
  BotController.prototype.handleBuilderButton = async function handleBuilderButtonV13(interaction, parts) {
    const [action, kind, id] = parts;
    if (action === 'builder_publish' && kind === 'p') {
      const resolved = this.getScopedEntity(kind, id);
      if (resolved) {
        const refreshed = await refreshManagedPostState({ client: this.client, post: resolved.entity, store: this.store });
        if (refreshed?.discordState?.status === 'deleted') {
          await interaction.update({ content: 'Genskaber opslaget på Discord…', components: [] });
          const recreated = await recreateManagedPost({ client: this.client, post: refreshed, store: this.store });
          await interaction.editReply({
            content: `✅ **${recreated.title}** er genskabt på Discord. Builder-data og historik er bevaret.`,
            components: [],
            allowedMentions: { parse: [] }
          });
          return;
        }
      }
    }
    return originalBuilderButton.call(this, interaction, parts);
  };

  const originalPostCommand = BotController.prototype.handlePostCommand;
  BotController.prototype.handlePostCommand = async function handlePostCommandV13(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'opdater') {
      const input = interaction.options.getString('post', true);
      const resolved = this.resolveEntityInput(input);
      if (resolved?.scope?.kind === 'p') {
        const refreshed = await refreshManagedPostState({ client: this.client, post: resolved.entity, store: this.store });
        if (refreshed?.discordState?.status === 'deleted') {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          try {
            const recreated = await recreateManagedPost({ client: this.client, post: refreshed, store: this.store });
            await interaction.editReply(`✅ **${recreated.title}** var slettet på Discord og er nu genskabt.`);
          } catch (error) {
            await interaction.editReply(`⚠️ Builder-data er bevaret, men opslaget kan ikke genskabes automatisk: ${error.message}`);
          }
          return;
        }
      }
    }
    return originalPostCommand.call(this, interaction);
  };
}
