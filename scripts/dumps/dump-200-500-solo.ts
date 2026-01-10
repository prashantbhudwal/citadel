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
  console.log('📦 Extracting Solo Studio Songs (200-500 words) to JSON...\n')

  const allSongs = await db.song.findMany({
    include: {
      primaryArtists: true,
      featuredArtists: true,
      album: true,
    },
  })

  // Apply the same 8-stage pipeline logic
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
      return count >= 200 && count <= 500
    })
    .map((s) => ({
      id: s.id,
      title: s.title,
      fullTitle: s.fullTitle,
      wordCount: s.lyrics!.trim().split(/\s+/).length,
      album: s.album?.name || null,
      releaseDate: s.releaseDateYear
        ? `${s.releaseDateYear}-${String(s.releaseDateMonth).padStart(2, '0')}-${String(s.releaseDateDay).padStart(2, '0')}`
        : null,
      url: s.url,
      lyrics: s.lyrics,
    }))

  // Sort descending
  filtered.sort((a, b) => b.wordCount - a.wordCount)

  const outPath = path.resolve(process.cwd(), 'data/solo-studio-200-500.json')
  fs.writeFileSync(outPath, JSON.stringify(filtered, null, 2))

  console.log(`✅ Extracted ${filtered.length} songs.`)
  console.log(`📂 Saved to: ${outPath}`)
}

main().catch(console.error)
