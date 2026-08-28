import { ChannelFlags, ChannelType } from 'discord.js';

const NORMAL_CHANNEL_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement
]);

export function destinationTypeForChannel(channel) {
  if (!channel) return null;
  if (channel.type === ChannelType.GuildForum) return 'forum';
  if (NORMAL_CHANNEL_TYPES.has(channel.type)) return 'channel';
  return null;
}

export function validateDestination(channel, tagId = null) {
  const type = destinationTypeForChannel(channel);
  if (!type) {
    return 'Vælg en forum-kanal, tekstkanal eller announcement-kanal.';
  }

  if (type === 'forum') {
    if (tagId && !channel.availableTags.some((tag) => tag.id === tagId)) {
      return 'Det valgte tag findes ikke længere i forum-kanalen.';
    }
    if (channel.flags.has(ChannelFlags.RequireTag) && !tagId) {
      const tags = channel.availableTags.map((tag) => `• ${tag.name}`).join('\n') || 'Ingen tags fundet.';
      return `Forum-kanalen kræver et tag. Vælg et tag i kommandoen:\n${tags}`;
    }
  } else if (tagId) {
    return 'Forum-tags kan kun bruges, når destinationen er en forum-kanal.';
  }

  return null;
}

export function getDestinationType(entity) {
  if (entity?.destinationType === 'forum' || entity?.destinationType === 'channel') {
    return entity.destinationType;
  }
  // Legacy records used forumId/forumChannelId exclusively and are therefore forums.
  return 'forum';
}

export function getDestinationChannelId(entity) {
  return entity?.destinationChannelId || entity?.forumChannelId || entity?.forumId || null;
}

export function getManagedPostId(post) {
  return post?.postId || post?.threadId || post?.starterMessageId || null;
}

export function destinationLabel(entity) {
  return getDestinationType(entity) === 'forum' ? 'Forum' : 'Kanal';
}

export function isNormalMessageDestination(channel) {
  return destinationTypeForChannel(channel) === 'channel';
}
