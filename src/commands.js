import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { RESOLUTIONS, WOW_CLASSES } from './constants.js';
import { POST_TEMPLATES } from './builder/templates.js';

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

function addForumOption(subcommand) {
  return subcommand.addChannelOption((option) =>
    option
      .setName('forum')
      .setDescription('Forum-kanalen hvor opslaget senere skal publiceres')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildForum)
  );
}

function addTagOption(subcommand) {
  return subcommand.addStringOption((option) =>
    option
      .setName('tag')
      .setDescription('Valgfrit forum-tag')
      .setRequired(false)
      .setAutocomplete(true)
  );
}

const postCommand = new SlashCommandBuilder()
  .setName('post')
  .setDescription('Byg, publicer og administrer informationsopslag')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) => {
    subcommand
      .setName('opret')
      .setDescription('Opret en ny kladde og åbn Post Builder');
    addForumOption(subcommand);
    subcommand.addStringOption((option) =>
      option
        .setName('titel')
        .setDescription('Forum-postens titel')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(100)
    );
    subcommand.addStringOption((option) =>
      option
        .setName('template')
        .setDescription('Start med en tom builder eller en færdig skabelon')
        .setRequired(false)
        .addChoices(...POST_TEMPLATES)
    );
    addTagOption(subcommand);
    return subcommand;
  })
  .addSubcommand((subcommand) =>
    subcommand
      .setName('rediger')
      .setDescription('Åbn Post Builder for en kladde eller publiceret post')
      .addStringOption((option) =>
        option
          .setName('post')
          .setDescription('Kladde-ID, forum-post ID, kanalhenvisning eller Discord-link')
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('opdater')
      .setDescription('Publicer gemte builder-ændringer til en eksisterende forum-post')
      .addStringOption((option) =>
        option
          .setName('post')
          .setDescription('Forum-postens ID, kanalhenvisning eller Discord-link')
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('slet')
      .setDescription('Slet en kladde eller en publiceret forum-post')
      .addStringOption((option) =>
        option
          .setName('post')
          .setDescription('Kladde-ID, forum-post ID, kanalhenvisning eller Discord-link')
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
          .setDescription('Kladde-ID, forum-post ID, kanalhenvisning eller Discord-link')
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
          .setDescription('Kladde-ID, forum-post ID, kanalhenvisning eller Discord-link')
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) => {
    subcommand
      .setName('importer')
      .setDescription('Importer en builder-JSON som ny kladde');
    addForumOption(subcommand);
    subcommand.addAttachmentOption((option) =>
      option
        .setName('fil')
        .setDescription('JSON-fil eksporteret fra Shrouded Info Bot')
        .setRequired(true)
    );
    subcommand.addStringOption((option) =>
      option
        .setName('titel')
        .setDescription('Valgfri ny forum-titel (ellers bruges titlen fra JSON)')
        .setRequired(false)
        .setMinLength(1)
        .setMaxLength(100)
    );
    addTagOption(subcommand);
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
  .setDescription('Åbn v1.2 Web Builder med drag-and-drop')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const commands = [postCommand, profileCommand, helpCommand, webBuilderCommand];
