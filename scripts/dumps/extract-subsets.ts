#!/usr/bin/env node

import { db } from '@/server/prisma'

const TARGET_ARTIST_ID = 45
const SUSPICIOUS_KEYWORDS = [
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
]

async function main() {
  const songs = await db.song.findMany({
    include: { primaryArtists: true, featuredArtists: true },
  })

  const filtered = songs
    .filter((s) => {
      if (s.primaryArtistId !== TARGET_ARTIST_ID) return false
      if (s.instrumental !== false) return false
      if (s.isMusic === false) return false
      if (s.lyricsState !== 'complete') return false
      if (s.primaryArtists.length !== 1 || s.featuredArtists.length !== 0)
        return false

      const titleLower = s.title.toLowerCase()
      if (SUSPICIOUS_KEYWORDS.some((k) => titleLower.includes(k))) return false

      if (!s.lyrics) return false
      const count = s.lyrics.trim().split(/\s+/).length
      return count >= 50
    })
    .map((s) => ({
      title: s.title,
      count: s.lyrics!.trim().split(/\s+/).length,
      id: s.id,
    }))

  console.log('--- SONGS UNDER 100 WORDS ---')
  filtered
    .filter((s) => s.count < 100)
    .sort((a, b) => a.count - b.count)
    .forEach((s) => console.log(`${s.count} words: ${s.title} (ID: ${s.id})`))

  console.log('\n--- SONGS OVER 1000 WORDS ---')
  filtered
    .filter((s) => s.count > 1000)
    .sort((a, b) => b.count - a.count)
    .forEach((s) => console.log(`${s.count} words: ${s.title} (ID: ${s.id})`))
}

main().catch(console.error)
