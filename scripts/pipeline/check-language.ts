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
  console.log('🌍 Checking Language Field in Strict Solo Studio Dataset...\n')

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

  // Filter for non-'en' language
  const nonEnglish = filtered.filter((s) => s.language !== 'en')

  const output = nonEnglish.map((s) => ({
    id: s.id,
    title: s.title,
    language: s.language, // Can be null
    url: s.url,
  }))

  const outPath = path.resolve(process.cwd(), 'data/non-english-songs.json')
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))

  console.log(`✅ Analysis Complete.`)
  console.log(
    `- Songs marked as 'en':   ${filtered.length - nonEnglish.length}`,
  )
  console.log(`- Songs NOT marked as 'en': ${nonEnglish.length}`)

  if (nonEnglish.length > 0) {
    console.log('\n--- Potential Foreign Language / Missing Language Songs ---')
    nonEnglish.forEach((s) => console.log(`- ${s.title} (Lang: ${s.language})`))
  }
}

main().catch(console.error)
