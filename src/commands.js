import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { RESOLUTIONS, WOW_CLASSES } from './constants.js';
import { POST_TEMPLATES } from './builder/templates.js';

const SLASH_TEMPLATE_CHOICES = POST_TEMPLATES
  .slice(0, 25)
  .map(({ name, value }) => ({ name, value }));

function addClassOption(subcommand) {
  return subcommand.addStringOption((option) =>
    option
      .setName('klasse')
      .setDescription('World of Warcraft class')
      .setRequired(true)
      .addChoices(...WOW_CLASSES.map((wowClass) => ({
        name: wowClass.name,
        value: wowClass.key
      })))
  );
}

function addResolutionOption(subcommand) {
  return subcommand.addStringOption((option) =>
    option
      .setName('oplosning')
      .setDescription('FHD eller QHD')
      .setRequired(true)
      .addChoices(...RESOLUTIONS.map((resolution) => ({
        name: resolution.name,
        value: resolution.key
      })))
  );
}

// The option keeps the legacy name `forum` so existing controller/UI flows stay
// backwards compatible, but it now accepts both forum and normal message channels.
function addDestinationOption(subcommand) {
  return subcommand.addChannelOption((option) =>
    option
      .setName('forum')
      .setDescription('Destination: forum-, tekst- eller announcement-kanal')
      .setRequired(true)
      .addChannelTypes(
        ChannelType.GuildForum,
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
        ChannelType.PublicThread,
        ChannelType.AnnouncementThread
      )
  );
}

function addTagOptions(subcommand) {
  for (let index = 1; index <= 5; index += 1) {
    subcommand.addStringOption((option) =>
      option
        .setName(index === 1 ? 'tag' : `tag${index}`)
        .setDescription(index === 1 ? 'Optional forum tag' : `Optional forum tag ${index}`)
        .setRequired(false)
        .setAutocomplete(true)
    );
  }
  return subcommand;
}

const postCommand = new SlashCommandBuilder()
  .setName('post')
  .setDescription('Byg, publicer og administrer informationsopslag')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) => {
    subcommand
      .setName('opret')
      .setDescription('Opret en ny kladde og åbn Post Builder');
    addDestinationOption(subcommand);
    subcommand.addStringOption((option) =>
      option
        .setName('titel')
        .setDescription('Postens navn/titel i Builder')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(100)
    );
    subcommand.addStringOption((option) =>
      option
        .setName('template')
        .setDescription('Start med en tom builder eller en færdig skabelon')
        .setRequired(false)
        .addChoices(...SLASH_TEMPLATE_CHOICES)
    );
    addTagOptions(subcommand);
    return subcommand;
  })
  .addSubcommand((subcommand) =>
    subcommand
      .setName('rediger')
      .setDescription('Åbn Post Builder for en kladde eller publiceret post')
      .addStringOption((option) =>
        option
          .setName('post')
          .setDescription('Kladde-ID, post-ID, Discord-henvisning eller link')
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('opdater')
      .setDescription('Publicer gemte builder-ændringer til et eksisterende opslag')
      .addStringOption((option) =>
        option
          .setName('post')
          .setDescription('Post-ID, Discord-henvisning eller link')
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('slet')
      .setDescription('Slet en kladde eller et publiceret opslag')
      .addStringOption((option) =>
        option
          .setName('post')
          .setDescription('Kladde-ID, post-ID, Discord-henvisning eller link')
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('liste')
      .setDescription('Vis kladder og publicerede opslag')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('klon')
      .setDescription('Klon en kladde eller publiceret post til en ny kladde')
      .addStringOption((option) =>
        option
          .setName('post')
          .setDescription('Kladde-ID, post-ID, Discord-henvisning eller link')
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('titel')
          .setDescription('Valgfri titel på kopien')
          .setRequired(false)
          .setMinLength(1)
          .setMaxLength(100)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('eksporter')
      .setDescription('Eksporter et builder-opslag som JSON')
      .addStringOption((option) =>
        option
          .setName('post')
          .setDescription('Kladde-ID, post-ID, Discord-henvisning eller link')
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) => {
    subcommand
      .setName('importer')
      .setDescription('Importer en builder-JSON som ny kladde');
    addDestinationOption(subcommand);
    subcommand.addAttachmentOption((option) =>
      option
        .setName('fil')
        .setDescription('JSON-fil eksporteret fra Timewizzard')
        .setRequired(true)
    );
    subcommand.addStringOption((option) =>
      option
        .setName('titel')
        .setDescription('Valgfrit nyt Builder-navn (ellers bruges titlen fra JSON)')
        .setRequired(false)
        .setMinLength(1)
        .setMaxLength(100)
    );
    addTagOptions(subcommand);
    return subcommand;
  });

const profileCommand = new SlashCommandBuilder()
  .setName('profil')
  .setDescription('Administrer class- og opløsningsstrenge')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) => {
    subcommand
      .setName('gem')
      .setDescription('Gem en tekststreng via en Discord-formular');
    addClassOption(subcommand);
    addResolutionOption(subcommand);
    return subcommand;
  })
  .addSubcommand((subcommand) => {
    subcommand
      .setName('importer')
      .setDescription('Importer en lang tekststreng fra en .txt-fil');
    addClassOption(subcommand);
    addResolutionOption(subcommand);
    return subcommand.addAttachmentOption((option) =>
      option
        .setName('fil')
        .setDescription('UTF-8 tekstfil med den komplette streng')
        .setRequired(true)
    );
  })
  .addSubcommand((subcommand) => {
    subcommand
      .setName('vis')
      .setDescription('Vis den gemte tekststreng privat');
    addClassOption(subcommand);
    addResolutionOption(subcommand);
    return subcommand;
  })
  .addSubcommand((subcommand) => {
    subcommand
      .setName('slet')
      .setDescription('Slet den gemte tekststreng');
    addClassOption(subcommand);
    addResolutionOption(subcommand);
    return subcommand;
  })
  .addSubcommand((subcommand) =>
    subcommand
      .setName('liste')
      .setDescription('Vis status og længde for alle class-strenge')
  );

const helpCommand = new SlashCommandBuilder()
  .setName('hjaelp')
  .setDescription('Vis bottens kommandoer og Post Builder-arbejdsgang')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const webBuilderCommand = new SlashCommandBuilder()
  .setName('webbuilder')
  .setDescription('Åbn Web Builder med drag-and-drop')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const commands = [postCommand, profileCommand, helpCommand, webBuilderCommand];
