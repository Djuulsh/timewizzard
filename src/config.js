import path from 'node:path';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  clientId: required('CLIENT_ID'),
  token: required('DISCORD_TOKEN'),
  guildId: required('GUILD_ID'),
  dataDir: path.resolve(process.env.DATA_DIR?.trim() || './data'),
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'production'
};
