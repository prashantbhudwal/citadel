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
]

const DELIMITED_VARIANTS_REGEX =
  /[\(\[\{]\s*(clean|dirty|acapella|v\d+)\s*[\)\]\}]/i

async function main() {
  console.log('✍️  Analyzing Writer Artists in Strict Solo Studio Dataset...\n')

  const allSongs = await db.song.findMany({
    include: {
      primaryArtists: true,
      featuredArtists: true,
      writerArtists: true, // Fetch writers
      album: true,
    },
  })

  // Apply Strict Solo Studio Filter (234 set)
  const filtered = allSongs.filter((s) => {
    if (s.primaryArtistId !== TARGET_ARTIST_ID) return false
    if (s.instrumental !== false) return false
    if (s.isMusic === false) return false
    if (s.lyricsState !== 'complete') return false
    if (s.primaryArtists.length !== 1 || s.featuredArtists.length !== 0)
      return false

    const titleLower = s.title.toLowerCase()
    const hasBlacklistKeyword = SUSPICIOUS_KEYWORDS.some((k) =>
      titleLower.includes(k),
    )
    if (hasBlacklistKeyword) return false
    if (DELIMITED_VARIANTS_REGEX.test(s.title)) return false
    if (titleLower.includes('freestyle')) return false

    if (!s.lyrics) return false
    const count = s.lyrics.trim().split(/\s+/).length
    return count >= 300
  })

  console.log(`Dataset Size: ${filtered.length} songs\n`)

  // Analysis 1: Multiple Writers
  const multipleWriters = filtered.filter((s) => s.writerArtists.length > 1)

  // Analysis 2: Eminem NOT in writers
  const missingEminem = filtered.filter(
    (s) => !s.writerArtists.some((w) => w.id === TARGET_ARTIST_ID),
  )

  const output = {
    multipleWritersCount: multipleWriters.length,
    missingEminemCount: missingEminem.length,
    missingEminem: missingEminem.map((s) => ({
      id: s.id,
      title: s.title,
      writers: s.writerArtists.map((w) => w.name),
    })),
    multipleWriters: multipleWriters.map((s) => ({
      id: s.id,
      title: s.title,
      writerCount: s.writerArtists.length,
      writers: s.writerArtists.map((w) => w.name),
    })),
  }

  const outPath = path.resolve(process.cwd(), 'data/writer-analysis.json')
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))

  console.log(`✅ Analysis Complete.`)
  console.log(`- Songs with >1 Writer:   ${multipleWriters.length}`)
  console.log(`- Songs MISSING Eminem:   ${missingEminem.length}`)

  if (missingEminem.length > 0) {
    console.log('\n--- Songs Where Eminem Is Not A Writer ---')
    missingEminem.forEach((s) =>
      console.log(
        `- ${s.title} (Writers: ${s.writerArtists.map((w) => w.name).join(', ') || 'None'})`,
      ),
    )
  }
}

main().catch(console.error)
