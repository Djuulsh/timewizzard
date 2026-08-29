import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';

const VERSION = '1.5.18';

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
        '**Facts / Key Values:** Den strukturerede row-editor beholdes, mens Discord-output viser Label over Value for sikker wrapping.',
        '**Search:** Block- og template-søgning søger nu globalt på tværs af alle kategorier.',
        '**Templates:** Web Builderen indeholder nu 35 skabeloner, inklusive 10 nye use-case templates.'
      ].join('\n'),
      components: [row],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  };
}
