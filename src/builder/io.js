import { validateBuilder } from './validate.js';

export const BUILDER_EXPORT_FORMAT = 'timewizzard-builder';
export const BUILDER_EXPORT_VERSION = 2;
export const MAX_BUILDER_IMPORT_BYTES = 20_000_000;
const LEGACY_EXPORT_FORMATS = new Set(['shrouded-info-builder']);

export function exportDefinition(entity) {
  return {
    format: BUILDER_EXPORT_FORMAT,
    version: BUILDER_EXPORT_VERSION,
    title: entity.title,
    builder: structuredClone(entity.builder)
  };
}

export function exportBuffer(entity) {
  return Buffer.from(`${JSON.stringify(exportDefinition(entity), null, 2)}\n`, 'utf8');
}

export function parseBuilderDefinition(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('The file does not contain valid Builder JSON.');
  if (input.format && input.format !== BUILDER_EXPORT_FORMAT && !LEGACY_EXPORT_FORMATS.has(input.format)) {
    throw new Error('The JSON file uses an unknown Builder format.');
  }

  const builder = validateBuilder(input.builder ?? input);
  const title = typeof input.title === 'string' && input.title.trim()
    ? input.title.trim().slice(0, 100)
    : 'Imported information post';

  return { builder, title };
}

export async function readBuilderAttachment(attachment) {
  if (!attachment) throw new Error('A JSON file is required.');
  if (attachment.size > MAX_BUILDER_IMPORT_BYTES) throw new Error('The JSON file is too large. Maximum size is 20 MB.');

  const response = await fetch(attachment.url);
  if (!response.ok) throw new Error(`Could not download the JSON file (${response.status}).`);

  let parsed;
  try {
    parsed = JSON.parse(await response.text());
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  return parseBuilderDefinition(parsed);
}
