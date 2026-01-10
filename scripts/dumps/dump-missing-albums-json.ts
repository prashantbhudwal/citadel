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
    '📦 Extracting Dense Solo Studio Songs Missing Album Data to JSON...\n',
  )

  const allSongs = await db.song.findMany({
    include: {
      primaryArtists: true,
      featuredArtists: true,
      album: true,
    },
  })

  // Apply the same 300-word pipeline logic
  const filtered = allSongs
    .filter((s) => {
      if (s.primaryArtistId !== TARGET_ARTIST_ID) return false
      if (s.instrumental !== false) return false
      if (s.isMusic === false) return false
      if (s.lyricsState !== 'complete') return false
      if (s.primaryArtists.length !== 1 || s.featuredArtists.length !== 0)
        return false

      const titleLower = s.title.toLowerCase()
      if (SUSPICIOUS_KEYWORDS.some((k) => titleLower.includes(k))) return false
      if (titleLower.includes('freestyle')) return false

      if (!s.lyrics) return false
      const count = s.lyrics.trim().split(/\s+/).length
      if (count < 300) return false

      // Filter for missing album
      return !s.album
    })
    .map((s) => ({
      id: s.id,
      title: s.title,
      fullTitle: s.fullTitle,
      wordCount: s.lyrics!.trim().split(/\s+/).length,
      url: s.url,
      lyricsPreview: s.lyrics!.slice(0, 200) + '...',
    }))

  const outPath = path.resolve(
    process.cwd(),
    'data/missing-albums-dense-solo.json',
  )
  fs.writeFileSync(outPath, JSON.stringify(filtered, null, 2))

  console.log(`✅ Extracted ${filtered.length} songs.`)
  console.log(`📂 Saved to: ${outPath}`)
}

main().catch(console.error)
