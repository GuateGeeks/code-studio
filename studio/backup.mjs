const FORMAT = 'gg-backup';
const VERSION = 1;

export function exportBackup(records, at = Date.now()) {
  return JSON.stringify({format: FORMAT, v: VERSION, at, records});
}

const validRecord = record => record?.key && record.student && record.ggId && record.project?.header?.id && typeof record.project.text === 'object';

export function parseBackup(text) {
  const invalid = {ok: false, reason: 'Este archivo no es una copia válida de Code Studio.'};
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    return invalid;
  }
  if (backup?.format !== FORMAT || backup.v !== VERSION || !Array.isArray(backup.records) || !backup.records.every(validRecord)) return invalid;
  return {ok: true, records: backup.records};
}

export function mergeRecords(existing, incoming) {
  // A deleted record never blocks recovering the live copy.
  const newest = new Map(existing.filter(record => !record.project.header.isDeleted).map(record => [record.key, record.at]));
  const records = incoming.filter(record => !(newest.get(record.key) > record.at));
  return {records, skipped: incoming.length - records.length};
}
