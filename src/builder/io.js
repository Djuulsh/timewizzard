import { validateBuilder } from './validate.js';

const MAX_IMPORT_BYTES = 1_000_000;

export function exportDefinition(entity) {
  return {
    format: 'shrouded-info-builder',
    version: 1,
    title: entity.title,
    builder: structuredClone(entity.builder)
  };
}

export function exportBuffer(entity) {
  return Buffer.from(`${JSON.stringify(exportDefinition(entity), null, 2)}\n`, 'utf8');
}

export async function readBuilderAttachment(attachment) {
  if (!attachment) throw new Error('Der mangler en JSON-fil.');
  if (attachment.size > MAX_IMPORT_BYTES) throw new Error('JSON-filen er for stor. Maksimum er 1 MB.');

  const response = await fetch(attachment.url);
  if (!response.ok) throw new Error(`Kunne ikke hente JSON-filen (${response.status}).`);

  let parsed;
  try {
    parsed = JSON.parse(await response.text());
  } catch {
    throw new Error('Filen er ikke gyldig JSON.');
  }

  if (parsed.format && parsed.format !== 'shrouded-info-builder') {
    throw new Error('JSON-filen bruger et ukendt builder-format.');
  }

  const builder = validateBuilder(parsed.builder ?? parsed);
  const title = typeof parsed.title === 'string' && parsed.title.trim()
    ? parsed.title.trim().slice(0, 100)
    : 'Importeret informationsopslag';

  return { builder, title };
}
