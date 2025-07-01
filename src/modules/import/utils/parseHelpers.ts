/*
  File: src/modules/import/utils/parseHelpers.ts
  Description: Utilities for bank parser modules, including safe header access and fuzzy key matching.
*/

export function getField(row: Record<string, any>, ...candidates: string[]): string {
  for (const key of candidates) {
    const match = Object.keys(row).find(k => sanitizeString(k) === sanitizeString(key));
    if (match) return row[match];
  }
  return '';
}

export function sanitizeString(input: string): string {
  return input?.toLowerCase().replace(/[^a-z0-9]/gi, '').trim();
}
