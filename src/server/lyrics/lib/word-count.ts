import { normalizeLyricsForWordCount } from './normalize'

export function countLyricsWords(raw: string): number {
  const s = normalizeLyricsForWordCount(raw)

  // count "words" as Unicode letter/digit runs with optional internal apostrophes (don't, I'm)
  const words = s.match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu)
  return words?.length ?? 0
}
