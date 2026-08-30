import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { VERSION } from './version.js';

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
            `Timewizzard v${VERSION} bruger et hierarkisk POST → Container → Blocks layout og flere avancerede smart blocks.`,
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
}
