import crypto from 'node:crypto';

export function makeShortId(bytes = 4) {
  return crypto.randomBytes(bytes).toString('hex');
}
