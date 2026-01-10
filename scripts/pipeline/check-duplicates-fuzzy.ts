#!/usr/bin/env node

import { db } from '@/server/prisma'

const TARGET_ARTIST_ID = 45

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\((clean|dirty|explicit|radio edit|edit|version)\)\s*/g, '')
    .replace(/\s*\[(clean|dirty|explicit|radio edit|edit|version)\]\s*/g, '')
    .trim()
}

async function main() {
  console.log('🔍 Running Fuzzy Duplicate Detection...\n')

  const allSongs = await db.song.findMany({
    where: {
      primaryArtistId: TARGET_ARTIST_ID,
      instrumental: false,
      lyricsState: 'complete',
    },
    select: { id: true, title: true },
  })

  const suspiciousIds = [
    873, 1936, 671185, 2982910, 10588506, 11991478, 12345064,
  ]
  const suspiciousSongs = allSongs.filter((s) => suspiciousIds.includes(s.id))

  console.log(
    '| Suspicious Track | ID | Normalized Title | Potential Matches (IDs) |',
  )
  console.log('|---|---|---|---|')

  for (const s of suspiciousSongs) {
    const norm = normalizeTitle(s.title)
    const matches = allSongs.filter(
      (other) => other.id !== s.id && normalizeTitle(other.title) === norm,
    )

    const matchStr =
      matches.length > 0
        ? matches.map((m) => `${m.title} (${m.id})`).join(', ')
        : '_No matches_'

    console.log(`| ${s.title} | ${s.id} | ${norm} | ${matchStr} |`)
  }
}

main().catch(console.error)
