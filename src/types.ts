export type MappingEntry = {
  oldCode: string;
  newCode: string;
  description?: string;
};

export type TranslationHit = {
  code: string;
  normalizedCode: string;
  replacement?: string;
  description?: string;
  count: number;
};

export type DocumentParseResult = {
  rawText: string;
  extractionMethod: string;
  pageCount?: number;
};
