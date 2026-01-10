#!/usr/bin/env node

import { db } from '@/server/prisma'
import fs from 'fs'
import path from 'path'

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
  console.log(
    '🔍 Searching for "Clean" and "Dirty" titles in the filtered dataset...\n',
  )

  const allSongs = await db.song.findMany({
    include: {
      primaryArtists: true,
      featuredArtists: true,
      album: true,
    },
  })

  // Apply the same filtering pipeline logic (Stage 1-8 but without keyword filter for clean/dirty for a moment to see if they were already excluded)
  const filtered = allSongs
    .filter((s) => {
      if (s.primaryArtistId !== TARGET_ARTIST_ID) return false
      if (s.instrumental !== false) return false
      if (s.isMusic === false) return false
      if (s.lyricsState !== 'complete') return false
      if (s.primaryArtists.length !== 1 || s.featuredArtists.length !== 0)
        return false

      // Note: We normally filter out SUSPICIOUS_KEYWORDS.
      // Let's see if any "Clean" or "Dirty" tracks survived the keyword filter.
      const titleLower = s.title.toLowerCase()
      const hasBlacklistKeyword = SUSPICIOUS_KEYWORDS.some((k) =>
        titleLower.includes(k),
      )
      if (hasBlacklistKeyword) return false
      if (titleLower.includes('freestyle')) return false

      if (!s.lyrics) return false
      const count = s.lyrics.trim().split(/\s+/).length
      if (count < 50) return false

      // Identify targets
      return titleLower.includes('clean') || titleLower.includes('dirty')
    })
    .map((s) => ({
      id: s.id,
      title: s.title,
      wordCount: s.lyrics!.trim().split(/\s+/).length,
      album: s.album?.name || null,
      url: s.url,
    }))

  const outPath = path.resolve(process.cwd(), 'data/clean-dirty-titles.json')
  fs.writeFileSync(outPath, JSON.stringify(filtered, null, 2))

  console.log(`✅ Found ${filtered.length} songs.`)
  console.log(`📂 Saved to: ${outPath}`)

  if (filtered.length > 0) {
    filtered.forEach((s) => console.log(`- ${s.title} (ID: ${s.id})`))
  }
}

main().catch(console.error)
