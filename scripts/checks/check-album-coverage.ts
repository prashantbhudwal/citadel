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
    include: { primaryArtists: true, featuredArtists: true, album: true },
  })

  const filtered = songs.filter((s) => {
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

  const missingAlbum = filtered.filter((s) => !s.album)

  console.log('--- Album Data Coverage (Clean 337 Set) ---')
  console.log(`Total Clean Solo Songs:  ${filtered.length}`)
  console.log(
    `Has Album Data:          ${filtered.length - missingAlbum.length}`,
  )
  console.log(`Missing Album Data:      ${missingAlbum.length}`)

  if (missingAlbum.length > 0) {
    console.log('\n--- Examples of Songs Missing Albums ---')
    missingAlbum
      .slice(0, 15)
      .forEach((s) => console.log(`- ${s.title} (ID: ${s.id})`))
  }
}

main().catch(console.error)
