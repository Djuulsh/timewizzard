import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';

const WEB_ONLY_BLOCKS = new Set([
  'container', 'youtube',
  'heading', 'callout', 'checklist', 'steps', 'facts', 'button_row', 'event', 'countdown', 'code', 'progress'
]);

function webButton(config, label = 'Åbn Web Builder') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(`${config.publicBaseUrl}/auth/discord`)
  );
}

export function installNativeV14Support(BotController) {
  const previousBuilderButton = BotController.prototype.handleBuilderButton;
  BotController.prototype.handleBuilderButton = async function handleBuilderButtonV15(interaction, parts) {
    const [action, kind, id, blockId] = parts;
    if (action === 'builder_block_edit' && blockId) {
      const resolved = this.getScopedEntity(kind, id);
      const roots = resolved?.entity?.builder?.blocks || [];
      let block = roots.find((item) => item.id === blockId) || null;
      if (!block) {
        for (const root of roots) {
          if (root?.type !== 'container') continue;
          block = (root.children || []).find((item) => item.id === blockId) || null;
          if (block) break;
        }
      }
      if (WEB_ONLY_BLOCKS.has(block?.type)) {
        await interaction.update({
          content: [
            `## ${block?.type === 'container' ? '🧱 Container' : '🧩 Smart Block'} · Web Builder`,
            'Timewizzard v1.5 bruger et hierarkisk POST → Container → Blocks layout og flere avancerede smart blocks.',
            'Denne block-type redigeres i Web Builder, så struktur, timestamps, knaprækker og specialfelter ikke bliver fladet ud af Discord-modalbegrænsningerne.'
          ].join('\n'),
          components: this.config.webEnabled ? [webButton(this.config)] : [],
          allowedMentions: { parse: [] }
        });
        return;
      }
    }
    return previousBuilderButton.call(this, interaction, parts);
  };

  BotController.prototype.showWebBuilder = async function showWebBuilderV15(interaction) {
    if (!this.config.webEnabled) {
      await interaction.reply({
        content: 'Web Builder er ikke aktiveret endnu. Tilføj `DISCORD_CLIENT_SECRET` og `PUBLIC_BASE_URL` og genstart botten.',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      });
      return;
    }
    await interaction.reply({
      content: '## Timewizzard Web Builder v1.5.0\nHierarkisk POST → Container → Blocks editor, kategoriserede templates, 10 smart blocks, Smart YouTube, Discord Insert, revisionshistorik og Repair/Re-create.',
      components: [webButton(this.config)],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  };

  BotController.prototype.showHelp = async function showHelpV15(interaction) {
    const content = [
      '## Timewizzard Info Bot v1.5.0',
      '',
      '**Web Builder v1.5**',
      'Nye posts kan være almindelige root posts eller bruge farvede **Containers**. Template-browseren kan filtreres efter kategori og søges.',
      'Smart blocks inkluderer Heading, Callout, Checklist, Steps, Facts, Button Row, Event, Countdown, Code Snippet og Progress.',
      '',
      '**Post Builder**',
      '`/post opret` — lav en kladde til forum-, tekst- eller announcement-kanal.',
      '`/post rediger` — åbn Discord-builderen. Containers og smart blocks redigeres bedst i Web Builder.',
      '`/post opdater` — publicer ændringer eller genskab et slettet Discord-target.',
      '`/post klon` / `eksporter` / `importer` / `slet` / `liste` — administrér Builder-data.',
      '',
      '**Profiler**',
      '`/profil gem` / `importer` / `vis` / `slet` / `liste` — administrér MerfinUI-profiler.',
      '',
      this.config.webEnabled ? `Web Builder: ${this.config.publicBaseUrl}/builder` : 'Web Builder er ikke aktiveret.'
    ].join('\n');
    await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
  };
}
