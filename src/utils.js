import crypto from 'node:crypto';

export function createNonce(length = 16) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

export function extractSnowflake(input) {
  if (!input) return null;
  const matches = String(input).match(/\d{17,20}/g);
  return matches?.at(-1) ?? null;
}

export function parseHexColor(input, fallback) {
  const value = String(input || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return fallback;
  return Number.parseInt(value, 16);
}

export function colorToHex(color) {
  return `#${Number(color).toString(16).padStart(6, '0').toUpperCase()}`;
}

export function normalizeGeneratedString(value) {
  return String(value ?? '').replace(/^\uFEFF/, '').trim();
}

export function isPublicHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function safeFileName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'profile';
}

export function truncate(value, maxLength) {
  const text = String(value ?? '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function formatError(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}
