#!/usr/bin/env node

/**
 * script to analyze songs that passed 'isSolo' but might be non-songs
 * (skits, remixes, etc.)
 */

import { db } from '@/server/prisma'
import { isSolo } from '@/server/lyrics/solo-classifier'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  console.log('🔍 Analyzing "escaped" solo songs...\n')

  const TARGET_ARTIST_ID = 45 // Eminem

  // 1. Fetch ALL songs for the artist
  // We want to be thorough, not just the sample
  const allSongs = await db.song.findMany({
    where: {
      primaryArtistId: TARGET_ARTIST_ID,
    },
    include: {
      primaryArtists: true,
      featuredArtists: true,
    },
    orderBy: { title: 'asc' },
  })

  console.log(`Total songs for artist: ${allSongs.length}`)

  // 2. Filter for technically "Solo" tracks
  const soloSongs = allSongs.filter((s) => isSolo(s, TARGET_ARTIST_ID))
  console.log(`Classified as Solo: ${soloSongs.length}`)

  // 3. Define "Suspicious" Keywords
  const suspiciousKeywords = [
    'skit',
    'remix',
    'interview',
    'live',
    'instrumental',
    'acapella',
    'freestyle',
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

  // 4. Find matches
  const escapedResults: any[] = []

  for (const song of soloSongs) {
    const titleLower = song.title.toLowerCase()

    // Check if any keyword hits
    const hit = suspiciousKeywords.find((k) => titleLower.includes(k))

    if (hit) {
      escapedResults.push({
        song,
        reason: hit,
      })
    }
  }

  // 5. Generate Markdown
  const mdLines = [
    '# "Escaped" Solo Songs Analysis (v2 - with Album Data)',
    '',
    `> Generated: ${new Date().toISOString()}`,
    `> Searched ${soloSongs.length} solo tracks for keywords`,
    '',
    '## Correlation: Suspicious Content vs. Missing Album',
    '',
  ]

  let suspiciousAndNoAlbum = 0
  let suspiciousButHasAlbum = 0
  let cleanAndNoAlbum = 0
  let cleanButHasAlbum = 0

  // Re-loop to tally
  for (const song of soloSongs) {
    const isSuspicious = suspiciousKeywords.some((k) =>
      song.title.toLowerCase().includes(k),
    )
    const hasAlbum = !!song.albumId

    if (isSuspicious && !hasAlbum) suspiciousAndNoAlbum++
    if (isSuspicious && hasAlbum) suspiciousButHasAlbum++
    if (!isSuspicious && !hasAlbum) cleanAndNoAlbum++
    if (!isSuspicious && hasAlbum) cleanButHasAlbum++
  }

  mdLines.push(`| Category | Has Album | No Album |`)
  mdLines.push(`|---|---|---|`)
  mdLines.push(
    `| **Suspicious** (Skit, Remix, etc) | ${suspiciousButHasAlbum} | ${suspiciousAndNoAlbum} |`,
  )
  mdLines.push(
    `| **Clean** (No keywords) | ${cleanButHasAlbum} | ${cleanAndNoAlbum} |`,
  )

  mdLines.push('')
  mdLines.push('## Detailed List of Suspicious Tracks')
  mdLines.push('')
  mdLines.push('| ID | Title | Flagged | Has Album? | URL |')
  mdLines.push('|----|-------|---------|------------|-----|')

  for (const res of escapedResults) {
    mdLines.push(
      `| ${res.song.id} | ${escapePipe(res.song.title)} | **${res.reason}** | ${res.song.albumId ? '✅' : '❌'} | [Link](${res.song.url}) |`,
    )
  }

  const outputPath = path.join(
    process.cwd(),
    'data',
    'escaped-songs-analysis.md',
  )
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, mdLines.join('\n'))

  console.log(`🚩 Flagged ${escapedResults.length} suspicious tracks.`)
  console.log(`📄 Saved to: ${outputPath}`)

  await db.$disconnect()
}

function escapePipe(str: string) {
  return str.replace(/\|/g, '\\|')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
