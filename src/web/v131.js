import { ChannelType } from 'discord.js';
import { getDestinationChannelId, getDestinationType } from '../destinations.js';

const SNOWFLAKE = /^\d{16,22}$/;

export function normalizeMentionPolicy(value) {
  const mode = value?.mode === 'selected' ? 'selected' : 'display';
  const users = [...new Set((Array.isArray(value?.users) ? value.users : []).map(String).filter((id) => SNOWFLAKE.test(id)))].slice(0, 100);
  const roles = [...new Set((Array.isArray(value?.roles) ? value.roles : []).map(String).filter((id) => SNOWFLAKE.test(id)))].slice(0, 100);
  return { mode, users, roles };
}

export function discordPostUrl(guildId, post) {
  if (!guildId || !post) return null;
  const channelId = getDestinationType(post) === 'forum'
    ? post.threadId || post.postId
    : getDestinationChannelId(post);
  const messageId = post.starterMessageId || post.postId || post.threadId;
  if (!channelId || !messageId) return null;
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

export function postInsertToken(guildId, post) {
  if (getDestinationType(post) === 'forum' && post.threadId) return `<#${post.threadId}>`;
  const url = discordPostUrl(guildId, post);
  return url ? `[${String(post.title || 'Discord post').replaceAll(']', '\\]')}](${url})` : null;
}

function channelKind(channel) {
  if (channel.type === ChannelType.GuildForum) return 'forum';
  if (channel.type === ChannelType.GuildAnnouncement) return 'announcement';
  if (channel.type === ChannelType.GuildVoice) return 'voice';
  if (channel.type === ChannelType.GuildStageVoice) return 'stage';
  if (channel.type === ChannelType.GuildCategory) return 'category';
  return 'text';
}

export async function getBotIdentity(client, guildId) {
  const guild = await client.guilds.fetch(guildId);
  const member = guild.members.me || await guild.members.fetchMe();
  return {
    id: client.user?.id || null,
    username: client.user?.username || null,
    tag: client.user?.tag || null,
    avatarUrl: client.user?.displayAvatarURL({ extension: 'png', size: 256 }) || null,
    serverNickname: member?.nickname || '',
    serverDisplayName: member?.displayName || client.user?.username || null,
    guildId: guild.id,
    guildName: guild.name
  };
}

export async function updateBotIdentity(client, guildId, input) {
  const guild = await client.guilds.fetch(guildId);
  const member = guild.members.me || await guild.members.fetchMe();

  if (Object.hasOwn(input || {}, 'serverNickname')) {
    const nickname = String(input.serverNickname ?? '').trim();
    if (nickname.length > 32) throw Object.assign(new Error('Server display name må højst være 32 tegn.'), { statusCode: 400 });
    await member.setNickname(nickname || null, 'Timewizzard Web Builder identity update');
  }

  if (input?.applyGlobal === true) {
    const username = String(input.globalUsername ?? '').trim();
    if (username && username !== client.user?.username) {
      if (username.length < 2 || username.length > 32) throw Object.assign(new Error('Global bot username skal være 2-32 tegn.'), { statusCode: 400 });
      await client.user.setUsername(username);
    }

    const avatarDataUrl = String(input.avatarDataUrl ?? '').trim();
    if (avatarDataUrl) {
      if (!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(avatarDataUrl)) {
        throw Object.assign(new Error('Logoet skal være PNG, JPG, GIF eller WEBP.'), { statusCode: 400 });
      }
      if (avatarDataUrl.length > 3_500_000) throw Object.assign(new Error('Logo-filen er for stor. Brug et billede under ca. 2 MB.'), { statusCode: 413 });
      await client.user.setAvatar(avatarDataUrl);
    }
  }

  return getBotIdentity(client, guildId);
}

export async function buildDiscordPickerData({ client, guildId, store, session }) {
  const guild = await client.guilds.fetch(guildId);
  const [channelsCollection, rolesCollection, emojisCollection, identity] = await Promise.all([
    guild.channels.fetch(),
    guild.roles.fetch(),
    guild.emojis.fetch(),
    getBotIdentity(client, guildId)
  ]);

  const users = new Map();
  const addUser = (id, name, avatarUrl = null, bot = false) => {
    if (!id) return;
    users.set(String(id), { id: String(id), name: String(name || id), avatarUrl, bot: Boolean(bot) });
  };
  const sessionAvatarUrl = session?.user?.avatar && session?.user?.id
    ? `https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png?size=64`
    : null;
  addUser(session?.user?.id, session?.user?.username, sessionAvatarUrl, false);
  if (client.user) addUser(client.user.id, identity.serverDisplayName || client.user.username, identity.avatarUrl, true);
  for (const member of guild.members.cache.values()) {
    addUser(member.id, member.displayName || member.user?.username || member.id, member.user?.displayAvatarURL?.({ extension: 'png', size: 64 }) || null, member.user?.bot);
  }

  const channels = [...channelsCollection.values()]
    .filter((channel) => channel && channel.type !== ChannelType.GuildCategory)
    .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0) || a.name.localeCompare(b.name))
    .map((channel) => ({ id: channel.id, name: channel.name, kind: channelKind(channel), insert: `<#${channel.id}>` }));

  const roles = [...rolesCollection.values()]
    .filter((role) => role && role.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .map((role) => ({ id: role.id, name: role.name, color: role.hexColor || null, managed: role.managed, insert: `<@&${role.id}>` }));

  const emojis = [...emojisCollection.values()]
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((emoji) => ({
      id: emoji.id,
      name: emoji.name,
      animated: Boolean(emoji.animated),
      url: emoji.imageURL({ extension: emoji.animated ? 'gif' : 'webp', size: 64 }),
      insert: `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`
    }));

  const posts = store.listPosts().map((post) => ({
    id: String(post.builderId || post.threadId),
    title: post.title,
    destinationType: getDestinationType(post),
    url: discordPostUrl(guildId, post),
    insert: postInsertToken(guildId, post),
    deleted: post.discordState?.status === 'deleted'
  })).filter((post) => post.insert || post.url);

  return {
    identity,
    users: [...users.values()].sort((a, b) => a.name.localeCompare(b.name)),
    peopleLimited: guild.memberCount > users.size,
    memberCount: guild.memberCount,
    channels,
    roles,
    emojis,
    posts
  };
}
