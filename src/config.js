import { loadEnvFile } from 'node:process';
import path from 'node:path';

const envFile = String(process.env.TIMEWIZZARD_ENV_FILE || '.env').trim();
try {
  loadEnvFile(envFile);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const required = ['CLIENT_ID', 'DISCORD_TOKEN', 'GUILD_ID'];
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

function normalizeBaseUrl(value) {
  const raw = String(value ?? '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('PUBLIC_BASE_URL must use http or https.');
  return url.toString().replace(/\/$/, '');
}

const publicBaseUrl = normalizeBaseUrl(process.env.PUBLIC_BASE_URL);
const clientSecret = String(process.env.DISCORD_CLIENT_SECRET ?? '').trim();
if ((publicBaseUrl && !clientSecret) || (!publicBaseUrl && clientSecret)) {
  throw new Error('PUBLIC_BASE_URL and DISCORD_CLIENT_SECRET must either both be set or both be omitted.');
}

export const config = Object.freeze({
  clientId: process.env.CLIENT_ID.trim(),
  token: process.env.DISCORD_TOKEN.trim(),
  guildId: process.env.GUILD_ID.trim(),
  dataDir: path.resolve(process.env.DATA_DIR?.trim() || './data'),
  port: Number.parseInt(process.env.PORT || '3000', 10),
  publicBaseUrl,
  clientSecret,
  webEnabled: Boolean(publicBaseUrl && clientSecret),
  nodeEnv: String(process.env.NODE_ENV || 'development'),
  envFile
});
