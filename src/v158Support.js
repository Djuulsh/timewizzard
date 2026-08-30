import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';
import { buildHelpContent, buildWebBuilderOverview } from './controller.js';
import { VERSION } from './version.js';

export function installV158Support(ControllerClass) {
  ControllerClass.prototype.showWebBuilder = async function showWebBuilderV158(interaction) {
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
        .setLabel(`Åbn Web Builder · v${VERSION}`)
        .setStyle(ButtonStyle.Link)
        .setURL(`${this.config.publicBaseUrl}/auth/discord`),
      new ButtonBuilder()
        .setLabel('Dansk guide')
        .setStyle(ButtonStyle.Link)
        .setURL('https://github.com/Djuulsh/timewizzard/blob/main/GUIDE_DA.md'),
      new ButtonBuilder()
        .setLabel('English guide')
        .setStyle(ButtonStyle.Link)
        .setURL('https://github.com/Djuulsh/timewizzard/blob/main/GUIDE_EN.md')
    );

    await interaction.reply({
      content: buildWebBuilderOverview(),
      components: [row],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  };

  ControllerClass.prototype.showHelp = async function showHelpCurrent(interaction) {
    await interaction.reply({
      content: buildHelpContent(),
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  };
}
