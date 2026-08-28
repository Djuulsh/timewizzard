import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { RESOLUTIONS, WOW_CLASSES } from './constants.js';

function addClassChoices(option) {
  return option
    .setName('klasse')
    .setDescription('World of Warcraft class')
    .setRequired(true)
    .addChoices(...WOW_CLASSES.map((item) => ({ name: item.name, value: item.key })));
}

function addResolutionChoices(option) {
  return option
    .setName('oplosning')
    .setDescription('Resolution')
    .setRequired(true)
    .addChoices(...RESOLUTIONS.map((item) => ({ name: item.name, value: item.key })));
}

export const commandBuilders = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show bot status')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Manage class/resolution text strings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub
      .setName('gem')
      .setDescription('Save or replace a profile string')
      .addStringOption(addClassChoices)
      .addStringOption(addResolutionChoices))
    .addSubcommand((sub) => sub
      .setName('importer')
      .setDescription('Import a long profile string from a UTF-8 .txt file')
      .addStringOption(addClassChoices)
      .addStringOption(addResolutionChoices)
      .addAttachmentOption((option) => option
        .setName('fil')
        .setDescription('UTF-8 .txt file')
        .setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('vis')
      .setDescription('Preview one profile response')
      .addStringOption(addClassChoices)
      .addStringOption(addResolutionChoices))
    .addSubcommand((sub) => sub
      .setName('liste')
      .setDescription('Show which profile strings are configured'))
    .addSubcommand((sub) => sub
      .setName('slet')
      .setDescription('Delete one profile string')
      .addStringOption(addClassChoices)
      .addStringOption(addResolutionChoices)),

  new SlashCommandBuilder()
    .setName('post')
    .setDescription('Manage information forum posts')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub
      .setName('opret')
      .setDescription('Create a new information post')
      .addChannelOption((option) => option
        .setName('forum')
        .setDescription('Destination forum channel')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildForum)))
    .addSubcommand((sub) => sub
      .setName('rediger')
      .setDescription('Edit an existing bot-managed post')
      .addStringOption((option) => option
        .setName('post')
        .setDescription('Forum thread ID')
        .setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('opdater')
      .setDescription('Re-render an existing post')
      .addStringOption((option) => option
        .setName('post')
        .setDescription('Forum thread ID')
        .setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('liste')
      .setDescription('List posts managed by the bot'))
    .addSubcommand((sub) => sub
      .setName('slet')
      .setDescription('Delete a bot-managed forum post')
      .addStringOption((option) => option
        .setName('post')
        .setDescription('Forum thread ID')
        .setRequired(true)))
];

export const commandJson = commandBuilders.map((command) => command.toJSON());
