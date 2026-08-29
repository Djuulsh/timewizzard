import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';
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
        .setURL(`${this.config.publicBaseUrl}/auth/discord`)
    );

    await interaction.reply({
      content: [
        `## Timewizzard Web Builder v${VERSION}`,
        'Åbn den sikre Discord OAuth-beskyttede builder.',
        '',
        '**Flyt blocks:** Træk hele block-rækken på computer, eller klik/tap `::` og vælg destination.',
        '**Redigér blocks:** Et almindeligt klik på blockets indhold åbner det i Inspector.',
        '**Markdown:** Én fælles toolbar følger nu det aktive Markdown-felt og Discord Insert arbejder på samme aktive felt.',
        '**Responsive UX:** Heading, Facts, Button Row og øvrige Inspector-felter tilpasser sig Inspectorens faktiske bredde på computer, iPad og mobil.',
        '**Header:** Add block, Save, Publish, Undo og Redo forbliver direkte tilgængelige; sekundære handlinger flyttes til More på smallere skærme uden horisontal scroll.',
        '**Search:** Block- og template-søgning søger globalt på tværs af alle kategorier.',
        '**Preview & safety:** Publish Review, canonical Discord payload validation og local crash recovery er en del af v1.6.2.'
      ].join('\n'),
      components: [row],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  };
}
