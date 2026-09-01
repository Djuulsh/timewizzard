export async function fetchGuildMembers(guild) {
  const cached = guild?.members?.cache;
  if (!cached) return new Map();
  if (guild.memberCount && cached.size >= guild.memberCount) return cached;
  try {
    return await guild.members.fetch();
  } catch (error) {
    console.warn('Could not fetch the complete Discord member list; using cached members:', error.message);
    return cached;
  }
}
