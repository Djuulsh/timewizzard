import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';

const VERSION = '1.5.17';

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
        '**Facts / Key Values:** Labels publiceres som faste 18-tegns inline-code felter; Values beholder normal Discord Markdown og Discord Insert.',
        '**Button Row:** Bygges nu med separate Label- og URL-felter i stedet for `Label | URL`-tekstlinjer.'
      ].join('\n'),
      components: [row],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  };
}
