import { normalizeLyricsForHash } from "./normalize";
import { createHash } from "crypto";
export function getLyricsHash(raw: string): string {
  const normalized = normalizeLyricsForHash(raw)
  return createHash('md5').update(normalized).digest('hex')
}