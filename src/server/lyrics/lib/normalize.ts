import { createHash } from 'crypto'

/**
 * Canonicalize line endings: \r\n and \r → \n
 */
export function canonicalizeNewlines(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/**
 * Strip invisible/zero-width characters (BOM, zero-width spaces, etc.)
 */
export function stripInvisibleChars(s: string): string {
  // BOM, zero-width space, zero-width non-joiner, zero-width joiner, word joiner
  return s.replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, '')
}

/**
 * Strip diacritics/combining marks via NFD decomposition
 */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Normalize curly quotes/apostrophes to ASCII equivalents
 */
export function normalizeQuotes(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // single curly → '
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // double curly → "
}

/**
 * Normalize dashes (en-dash, em-dash, etc.) to hyphen
 */
export function normalizeDashes(s: string): string {
  return s.replace(/[\u2013\u2014\u2015]/g, '-')
}

export function normalizeLyricsForHash(raw: string): string {
  let s = raw

  // 1. Strip invisible chars
  s = stripInvisibleChars(s)

  // 2. NFKC (fold compatibility chars like full-width letters, ligatures)
  s = s.normalize('NFKC')

  // 3. Lowercase
  s = s.toLowerCase()

  // 4. Strip diacritics
  s = stripDiacritics(s)

  // 5. Normalize quotes and dashes
  s = normalizeQuotes(s)
  s = normalizeDashes(s)

  // 6. Replace any run of non-letter/non-digit chars with single space
  s = s.replace(/[^a-z0-9]+/g, ' ')

  // 7. Collapse whitespace and trim
  s = s.replace(/ +/g, ' ').trim()

  return s
}

export function normalizeLyricsForWordCount(raw: string): string {
  let s = raw

  // 1. Strip invisible chars
  s = stripInvisibleChars(s)

  // 2. NFKC
  s = s.normalize('NFKC')

  // 3. Lowercase
  s = s.toLowerCase()

  // 4. Strip diacritics
  s = stripDiacritics(s)

  // 5. Normalize quotes (so apostrophes are consistent)
  s = normalizeQuotes(s)

  // 6. Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim()

  return s
}

export function normalizeLyricsForEmbedding(raw: string): string {
  let s = raw

  // 1. Strip invisible chars
  s = stripInvisibleChars(s)

  // 2. Canonicalize newlines
  s = canonicalizeNewlines(s)

  // 3. Normalize spaces/tabs within lines (not newlines)
  s = s.replace(/[^\S\n]+/g, ' ')

  // 4. Collapse excessive blank lines (3+ → 2)
  s = s.replace(/\n{3,}/g, '\n\n')

  // 5. Trim each line and overall
  s = s
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()

  return s
}


