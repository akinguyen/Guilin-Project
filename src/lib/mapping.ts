import * as XLSX from 'xlsx';
import type { MappingEntry, TranslationHit } from '../types';

const OLD_CODE_HEADERS = ['User Code', 'USER CODE', 'Old Code', 'OLD CODE'];
const NEW_CODE_HEADERS = [
  'MATCHING CODE GUILIN',
  'Matching code guilin',
  'New Code',
  'NEW CODE',
];
const DESCRIPTION_HEADERS = ['Description', 'DESCRIPTION'];

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function getFirstMatch(record: Record<string, unknown>, headers: string[]): string {
  for (const header of headers) {
    const value = record[header];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

export function parseWorkbook(fileData: ArrayBuffer): MappingEntry[] {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const entries: MappingEntry[] = [];

  for (const row of rows) {
    const oldCode = getFirstMatch(row, OLD_CODE_HEADERS);
    const newCode = getFirstMatch(row, NEW_CODE_HEADERS);
    const description = getFirstMatch(row, DESCRIPTION_HEADERS);

    if (!oldCode || !newCode) {
      continue;
    }

    entries.push({
      oldCode,
      newCode,
      description: description || undefined,
    });
  }

  return entries;
}

export function buildLookup(entries: MappingEntry[]) {
  const lookup = new Map<string, MappingEntry>();

  for (const entry of entries) {
    lookup.set(normalizeCode(entry.oldCode), entry);
  }

  return lookup;
}

export function extractCandidateCodes(text: string): string[] {
  const matches = text.match(/[A-Z0-9][A-Z0-9-]{1,}/gi) ?? [];

  return matches
    .map((match) => match.trim())
    .filter((match) => /\d/.test(match) && /[A-Z]/i.test(match));
}

export function translateText(text: string, lookup: Map<string, MappingEntry>): TranslationHit[] {
  const counts = new Map<string, number>();

  for (const token of extractCandidateCodes(text)) {
    const normalized = normalizeCode(token);
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([normalizedCode, count]) => {
      const mapped = lookup.get(normalizedCode);

      return {
        code: mapped?.oldCode ?? normalizedCode,
        normalizedCode,
        replacement: mapped?.newCode,
        description: mapped?.description,
        count,
      };
    })
    .sort((left, right) => {
      if (Boolean(left.replacement) !== Boolean(right.replacement)) {
        return left.replacement ? -1 : 1;
      }

      return left.normalizedCode.localeCompare(right.normalizedCode);
    });
}
