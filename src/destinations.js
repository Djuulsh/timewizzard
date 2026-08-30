import { ChannelFlags, ChannelType } from 'discord.js';

const NORMAL_CHANNEL_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement
]);

const THREAD_CHANNEL_TYPES = new Set([
  ChannelType.PublicThread,
  ChannelType.AnnouncementThread
]);

export function normalizeTagIds(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map((tagId) => String(tagId ?? '').trim()).filter(Boolean))];
}

export function destinationTypeForChannel(channel) {
  if (!channel) return null;
  if (channel.type === ChannelType.GuildForum) return 'forum';
  if (THREAD_CHANNEL_TYPES.has(channel.type)) return 'thread';
  if (NORMAL_CHANNEL_TYPES.has(channel.type)) return 'channel';
  return null;
}

export function validateDestination(channel, tagIds = []) {
  const type = destinationTypeForChannel(channel);
  if (!type) return 'Choose a forum, existing forum post, text channel or announcement channel.';

  const selectedTagIds = normalizeTagIds(tagIds);
  if (selectedTagIds.length > 5) return 'A forum post can have at most five tags.';

  if (type === 'forum') {
    const availableTagIds = new Set(channel.availableTags.map((tag) => tag.id));
    if (selectedTagIds.some((tagId) => !availableTagIds.has(tagId))) {
      return 'One or more selected tags no longer exist in this forum.';
    }
    if (channel.flags.has(ChannelFlags.RequireTag) && !selectedTagIds.length) {
      const tags = channel.availableTags.map((tag) => `• ${tag.name}`).join('\n') || 'No tags found.';
      return `This forum requires at least one tag. Choose a tag:\n${tags}`;
    }
  } else if (selectedTagIds.length) {
    return type === 'thread'
      ? 'Tags belong to the existing forum post and cannot be changed when adding a Timewizzard message inside it.'
      : 'Forum tags can only be used when creating a new forum post.';
  }

  return null;
}

export function getDestinationType(entity) {
  if (['forum', 'thread', 'channel'].includes(entity?.destinationType)) return entity.destinationType;
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
  const type = getDestinationType(entity);
  if (type === 'forum') return 'Forum';
  if (type === 'thread') return 'Forum post';
  return 'Channel';
}

export function isNormalMessageDestination(channel) {
  return ['channel', 'thread'].includes(destinationTypeForChannel(channel));
}
