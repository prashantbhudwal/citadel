/**
 * Configuration constants for song labeling and filtering
 */

// TODO: Add your configuration constants

export const TARGET_ARTIST_ID = 45 // Eminem
export const SUSPICIOUS_KEYWORDS = [
  'skit',
  'remix',
  'interview',
  'live',
  'instrumental',
  'acapella',
  'demo',
  'intro',
  'outro',
  'interlude',
  'edit',
  'mix',
  'version',
  'bootleg',
  'mashup',
  'cover',
  'parody',
  'session',
  'snippet',
  'a cappella',
  'slowed',
  'reverb',
  'bass boosted',
]

export const DELIMITED_VARIANTS_REGEX =
  /[\(\[\{]\s*(clean|dirty|acapella|a cappella|leaked|v\d+)\s*[\)\]\}]/i
