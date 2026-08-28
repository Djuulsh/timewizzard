import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder
} from 'discord.js';
import { DEFAULT_COLOR, RESOLUTIONS, WOW_CLASSES } from './constants.js';

export function buildInfoMessage(post) {
  const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  const description = [
    post.description?.trim(),
    divider,
    'Select your class and resolution below.'
  ].filter(Boolean).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(post.color ?? DEFAULT_COLOR)
    .setTitle(post.heading || post.forumTitle || 'Information')
    .setDescription(description);

  if (post.bannerUrl) embed.setImage(post.bannerUrl);

  const select = new StringSelectMenuBuilder()
    .setCustomId('profile_select')
    .setPlaceholder('Choose class and resolution...')
    .setMinValues(1)
    .setMaxValues(1);

  for (const wowClass of WOW_CLASSES) {
    for (const resolution of RESOLUTIONS) {
      select.addOptions({
        label: `${wowClass.name} — ${resolution.name}`,
        value: `profile:${wowClass.key}:${resolution.key}`,
        emoji: wowClass.emoji
      });
    }
  }

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select)],
    allowedMentions: { parse: [] }
  };
}
