#!/usr/bin/env node

import { db } from '@/server/prisma'
import fs from 'fs'
import path from 'path'

const TARGET_ARTIST_ID = 45 // Eminem
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
  'a cappella',
  'slowed',
  'reverb',
  'bass boosted',
]

// Regex to catch clean/dirty/acapella/version variants in any common delimiters
const DELIMITED_VARIANTS_REGEX =
  /[\(\[\{]\s*(clean|dirty|acapella|a cappella|v\d+)\s*[\)\]\}]/i

async function main() {
  console.log('💿 Grouping Strict Solo Studio Songs by Album...\n')

  const allSongs = await db.song.findMany({
    include: {
      primaryArtists: true,
      featuredArtists: true,
      album: true,
    },
  })

  // Apply Strict Solo Studio Filter (v2.1)
  const filtered = allSongs.filter((s) => {
    if (s.primaryArtistId !== TARGET_ARTIST_ID) return false
    if (s.instrumental !== false) return false
    if (s.isMusic === false) return false
    if (s.lyricsState !== 'complete') return false
    if (s.primaryArtists.length !== 1 || s.featuredArtists.length !== 0)
      return false

    const titleLower = s.title.toLowerCase()

    // Check standard blacklist
    const hasBlacklistKeyword = SUSPICIOUS_KEYWORDS.some((k) =>
      titleLower.includes(k),
    )
    if (hasBlacklistKeyword) return false

    // Check delimited variants
    if (DELIMITED_VARIANTS_REGEX.test(s.title)) return false

    // Freestyle filter
    if (titleLower.includes('freestyle')) return false

    // Word count filter
    if (!s.lyrics) return false
    const count = s.lyrics.trim().split(/\s+/).length
    return count >= 300
  })

  console.log(`Total Filtered Songs: ${filtered.length}`)

  // Group by Album
  const byAlbum: Record<string, { count: number; songs: string[] }> = {}

  for (const s of filtered) {
    const albumName = s.album?.name || '_(No Album)_'
    if (!byAlbum[albumName]) {
      byAlbum[albumName] = { count: 0, songs: [] }
    }
    byAlbum[albumName].count++
    byAlbum[albumName].songs.push(s.title)
  }

  // Convert to array and sort by count descending
  const sortedAlbums = Object.entries(byAlbum)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)

  const output = {
    totalSongs: filtered.length,
    albumCount: sortedAlbums.length,
    albums: sortedAlbums,
  }

  const outPath = path.resolve(process.cwd(), 'data/songs-by-album.json')
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))

  console.log(`✅ Grouped into ${sortedAlbums.length} albums.`)
  console.log(`📂 Saved to: ${outPath}`)

  console.log('\n--- Top 10 Albums by Solo Song Count ---')
  sortedAlbums.slice(0, 10).forEach((a) => {
    console.log(`${a.count.toString().padEnd(4)} | ${a.name}`)
  })
}

main().catch(console.error)
