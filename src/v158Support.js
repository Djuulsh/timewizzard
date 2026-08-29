import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';

const VERSION = '1.5.13';

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
        .setURL(`${this.config.publicBaseUrl}/auth/discord`)
    );

    await interaction.reply({
      content: [
        `## Timewizzard Web Builder v${VERSION}`,
        'Åbn den sikre Discord OAuth-beskyttede builder.',
        '',
        '**Flyt blocks:** Træk hele block-rækken på computer, eller klik/tap `::` og vælg destination.',
        '**Redigér blocks:** Et almindeligt klik på blockets indhold åbner det i Inspector.',
        '**Facts / Key Values:** Brug strukturerede Label/Value-rækker med Discord Insert i Value-felter.'
      ].join('\n'),
      components: [row],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  };
}
