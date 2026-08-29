import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';
import {
  makeGalleryBlock,
  makeThumbnailBlock,
  parseSelectOptions
} from './builder/blocks.js';
import { makeShortId } from './builder/ids.js';
import { refreshManagedPostState } from './postService.js';

function parseBoolean(value) {
  return /^(1|true|yes|y|ja|j|on|spoiler)$/i.test(String(value ?? '').trim());
}

function looksBoolean(value) {
  return /^(0|1|true|false|yes|no|y|n|ja|nej|j|on|off|spoiler)$/i.test(String(value ?? '').trim());
}

function parseGalleryItems(value) {
  const lines = String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) throw new Error('Media Gallery skal have mindst ét billede.');
  if (lines.length > 10) throw new Error('Media Gallery kan højst have 10 billeder.');

  return lines.map((line, index) => {
    const parts = line.split('|').map((part) => part.trim());
    const url = parts.shift() || '';
    let spoiler = false;
    if (parts.length && looksBoolean(parts.at(-1))) spoiler = parseBoolean(parts.pop());
    const description = parts.join('|').trim();
    if (!/^https?:\/\//i.test(url)) throw new Error(`Gallery item ${index + 1} mangler en gyldig http/https URL.`);
    return { url, description, spoiler };
  });
}

function deleteActionTree(builder, actionId, seen = new Set()) {
  if (!actionId || seen.has(actionId)) return;
  seen.add(actionId);
  const action = builder.actions?.[actionId];
  for (const child of action?.children ?? []) deleteActionTree(builder, child.actionId, seen);
  delete builder.actions[actionId];
}

export function installNativeV13Support(BotController) {
  const originalAddBlockFromModal = BotController.prototype.addBlockFromModal;
  BotController.prototype.addBlockFromModal = function addBlockFromModalV13(entity, type, interaction) {
    if (type === 'gallery') {
      entity.builder.blocks.push(makeGalleryBlock(parseGalleryItems(interaction.fields.getTextInputValue('items'))));
      return;
    }
    if (type === 'thumbnail') {
      entity.builder.blocks.push(makeThumbnailBlock({
        text: interaction.fields.getTextInputValue('text').trim(),
        url: interaction.fields.getTextInputValue('url').trim(),
        description: interaction.fields.getTextInputValue('description').trim(),
        spoiler: parseBoolean(interaction.fields.getTextInputValue('spoiler'))
      }));
      return;
    }
    return originalAddBlockFromModal.call(this, entity, type, interaction);
  };

  const originalEditBlockFromModal = BotController.prototype.editBlockFromModal;
  BotController.prototype.editBlockFromModal = function editBlockFromModalV13(entity, block, interaction) {
    if (block.type === 'gallery') {
      block.items = parseGalleryItems(interaction.fields.getTextInputValue('items'));
      return;
    }
    if (block.type === 'thumbnail') {
      block.text = interaction.fields.getTextInputValue('text').trim();
      block.url = interaction.fields.getTextInputValue('url').trim();
      block.description = interaction.fields.getTextInputValue('description').trim();
      block.spoiler = parseBoolean(interaction.fields.getTextInputValue('spoiler'));
      return;
    }
    if (block.type === 'select') {
      const definitions = parseSelectOptions(interaction.fields.getTextInputValue('options'));
      const oldActionIds = block.options.map((option) => option.actionId);
      const nextOptions = [];

      for (let index = 0; index < definitions.length; index += 1) {
        const definition = definitions[index];
        const actionId = oldActionIds[index] || makeShortId(4);
        const existing = entity.builder.actions[actionId];
        entity.builder.actions[actionId] = {
          ...(existing ?? {}),
          id: actionId,
          type: 'ephemeral_text',
          title: definition.label,
          content: definition.response,
          children: Array.isArray(existing?.children) ? existing.children : [],
          presentation: existing?.presentation === 'select' ? 'select' : 'buttons'
        };
        nextOptions.push({ label: definition.label, actionId });
      }

      for (const actionId of oldActionIds.slice(definitions.length)) deleteActionTree(entity.builder, actionId);

      block.placeholder = interaction.fields.getTextInputValue('placeholder').trim();
      block.options = nextOptions;
      return;
    }
    return originalEditBlockFromModal.call(this, entity, block, interaction);
  };

  const originalHandlePostCommand = BotController.prototype.handlePostCommand;
  BotController.prototype.handlePostCommand = async function handlePostCommandNativeV13(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'rediger' || subcommand === 'liste') {
      const posts = subcommand === 'liste'
        ? this.store.listPosts()
        : (() => {
            const input = interaction.options.getString('post', true);
            const resolved = this.resolveEntityInput(input);
            return resolved?.scope?.kind === 'p' ? [resolved.entity] : [];
          })();

      await Promise.all(posts.map((post) =>
        refreshManagedPostState({ client: this.client, post, store: this.store })
          .catch((error) => console.warn(`Could not refresh native Builder state: ${error.message}`))
      ));
    }
    return originalHandlePostCommand.call(this, interaction);
  };

  BotController.prototype.showWebBuilder = async function showWebBuilderV13(interaction) {
    if (!this.config.webEnabled) {
      await interaction.reply({
        content: 'Web Builder er ikke aktiveret endnu. Tilføj `DISCORD_CLIENT_SECRET` og `PUBLIC_BASE_URL` i Railway og redeploy.',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      });
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Åbn Web Builder').setStyle(ButtonStyle.Link).setURL(`${this.config.publicBaseUrl}/auth/discord`)
    );
    await interaction.reply({
      content: '## Timewizzard Web Builder v1.3.0\nÅbn den Discord OAuth-beskyttede builder med drag-and-drop, revisionshistorik, Repair/Re-create, Markdown toolbar og Components V2 media blocks.',
      components: [row],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  };

  BotController.prototype.showHelp = async function showHelpV13(interaction) {
    const content = [
      '## Timewizzard Info Bot v1.3.0',
      '',
      '**Post Builder**',
      '`/post opret` — lav en kladde til forum-, tekst- eller announcement-kanal.',
      '`/post rediger` — åbn Discord-builderen for en kladde eller publiceret post.',
      '`/post opdater` — publicer ændringer; slettede Discord-targets genskabes automatisk når destinationen stadig findes.',
      '`/post klon` / `eksporter` / `importer` / `slet` / `liste` — administrér Builder-data.',
      '',
      '**v1.3 blocks**',
      'Tekst/Markdown · Billede · Media Gallery · Thumbnail · Separator · Open + ephemeral · Link · Select + ephemeral · MerfinUI select · legacy Open-liste.',
      'Gallery-format i Discord-builderen: `URL | beskrivelse | ja/nej` — én fil pr. linje, maks. 10.',
      'Thumbnail har tekst, URL, alt-tekst og spoiler-indstilling.',
      '',
      '**Sikker redigering**',
      'Nested ephemeral flows bevares, når en Select redigeres i Discord-builderen. Selve nested flowet redigeres lettest i Web Builder.',
      'Hvis et opslag slettes direkte i Discord, bevares Builder-data og posten markeres som **Deleted on Discord** / **Genskab**.',
      '',
      '**Web Builder**',
      '`/webbuilder` — drag-and-drop, Undo/Redo, revisionshistorik, destination Repair/Re-create, Discord Markdown reference, `\\>>>` quote-stop, DiscoHook import og media blocks.',
      '',
      '**Profiler**',
      '`/profil gem` / `importer` / `vis` / `slet` / `liste` administrerer de 18 MerfinUI class/resolution-strenge.'
    ].join('\n');

    await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
  };
}
