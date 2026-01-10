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

const DELIMITED_VARIANTS_REGEX = /[\(\[\{]\s*(clean|dirty)\s*[\)\]\}]/i
const ANY_DELIMITER_REGEX = /[\(\[\{].*?[\)\]\}]/

async function main() {
  console.log(
    '📦 Extracting Strict Solo Studio Songs with Delimited Titles to JSON...\n',
  )

  const allSongs = await db.song.findMany({
    include: {
      primaryArtists: true,
      featuredArtists: true,
      album: true,
    },
  })

  // Apply the same final pipeline logic (240 set)
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
      if (DELIMITED_VARIANTS_REGEX.test(s.title)) return false
      if (titleLower.includes('freestyle')) return false

      if (!s.lyrics) return false
      const count = s.lyrics.trim().split(/\s+/).length
      if (count < 300) return false

      // Target: Must have ANY delimiter pair
      return ANY_DELIMITER_REGEX.test(s.title)
    })
    .map((s) => ({
      id: s.id,
      title: s.title,
      wordCount: s.lyrics!.trim().split(/\s+/).length,
      album: s.album?.name || null,
      url: s.url,
    }))

  const outPath = path.resolve(
    process.cwd(),
    'data/delimited-titles-filtered.json',
  )
  fs.writeFileSync(outPath, JSON.stringify(filtered, null, 2))

  console.log(
    `✅ Identified ${filtered.length} songs with delimiters in title.`,
  )
  console.log(`📂 Saved to: ${outPath}`)

  if (filtered.length > 0) {
    console.log('\n--- Examples ---')
    filtered.forEach((s) => console.log(`- ${s.title} (ID: ${s.id})`))
  }
}

main().catch(console.error)
