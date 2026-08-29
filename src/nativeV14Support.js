import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';

function webButton(config, label = 'Åbn Web Builder') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(`${config.publicBaseUrl}/auth/discord`)
  );
}

export function installNativeV14Support(BotController) {
  const previousBuilderButton = BotController.prototype.handleBuilderButton;
  BotController.prototype.handleBuilderButton = async function handleBuilderButtonV14(interaction, parts) {
    const [action, kind, id, blockId] = parts;
    if (action === 'builder_block_edit' && blockId) {
      const resolved = this.getScopedEntity(kind, id);
      const block = resolved?.entity?.builder?.blocks?.find((item) => item.id === blockId);
      if (block?.type === 'container' || block?.type === 'youtube') {
        await interaction.update({
          content: [
            `## ${block.type === 'container' ? '🧱 Container' : '▶️ YouTube'} · Web Builder`,
            'Timewizzard v1.4 bruger et hierarkisk layout med POST-root og blocks inde i Containers.',
            'Redigering af Container-farve/children og Smart YouTube foregår i Web Builder, så hierarkiet ikke bliver fladet ud af Discord-modalbegrænsningerne.'
          ].join('\n'),
          components: this.config.webEnabled ? [webButton(this.config)] : [],
          allowedMentions: { parse: [] }
        });
        return;
      }
    }
    return previousBuilderButton.call(this, interaction, parts);
  };

  BotController.prototype.showWebBuilder = async function showWebBuilderV14(interaction) {
    if (!this.config.webEnabled) {
      await interaction.reply({
        content: 'Web Builder er ikke aktiveret endnu. Tilføj `DISCORD_CLIENT_SECRET` og `PUBLIC_BASE_URL` og genstart botten.',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      });
      return;
    }
    await interaction.reply({
      content: '## Timewizzard Web Builder v1.4.0\nHierarkisk POST → Container → Blocks editor, plain root posts, Smart YouTube, template gallery, Discord Insert, revisionshistorik og Repair/Re-create.',
      components: [webButton(this.config)],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  };

  BotController.prototype.showHelp = async function showHelpV14(interaction) {
    const content = [
      '## Timewizzard Info Bot v1.4.0',
      '',
      '**Web Builder v1.4**',
      'Nye posts starter som almindelige Components V2 posts. Tilføj kun en **Container**, når du ønsker en farvet embed-lignende sektion.',
      'Containers kan have egne blocks og egen accentfarve. Smart YouTube kræver kun en YouTube-URL.',
      '',
      '**Post Builder**',
      '`/post opret` — lav en kladde til forum-, tekst- eller announcement-kanal.',
      '`/post rediger` — åbn Discord-builderen. Hierarkiske Container/YouTube detaljer redigeres bedst i Web Builder.',
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
