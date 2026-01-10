#!/usr/bin/env node

/**
 * Integration test for solo classifier.
 * Samples real data, runs classification, and saves results to Markdown.
 *
 * Usage: npx tsx scripts/test-solo-classifier.ts
 */

import { db } from '@/server/prisma'
import { isSolo } from '@/server/lyrics/solo-classifier'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  console.log(
    '🧪 Running solo classifier integration test (Target: Eminem)...\n',
  )

  const TARGET_ARTIST_ID = 45 // Eminem
  const TARGET_ARTIST_NAME = 'Eminem'

  // 1. Fetch songs where Eminem is a primary artist
  // We want to see how we classify HIS songs
  const allSongs = await db.song.findMany({
    where: {
      primaryArtistId: TARGET_ARTIST_ID,
    },
    include: {
      primaryArtists: true,
      featuredArtists: true,
    },
    orderBy: { id: 'desc' },
  })

  // Shuffle and take 500
  const songs = allSongs
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
    .slice(0, 500)

  const results = {
    total: songs.length,
    soloCount: 0,
    collabCount: 0,
    details: [] as Array<{
      id: number
      title: string
      primary: string[]
      featured: string[]
      isSolo: boolean
      reason: string
    }>,
  }

  // 2. Classify each
  for (const song of songs) {
    const solo = isSolo(song, TARGET_ARTIST_ID)
    if (solo) results.soloCount++
    else results.collabCount++

    let reason = 'Solo'

    // Check mismatch specifically
    const isTargetPrimary = song.primaryArtists.some(
      (a) => a.id === TARGET_ARTIST_ID,
    )
    const isSinglePrimary = song.primaryArtists.length === 1

    if (!isTargetPrimary) reason = `Not ${TARGET_ARTIST_NAME}`
    else if (!isSinglePrimary) reason = 'Multi-Primary'
    else if (song.featuredArtists.length > 0) reason = 'Has Features'

    results.details.push({
      id: song.id,
      title: song.title,
      primary: song.primaryArtists.map((a) => a.name),
      featured: song.featuredArtists.map((a) => a.name),
      isSolo: solo,
      reason,
    })
  }

  // 3. Generate Markdown
  const mdLines = [
    '# Solo Classification Test Results',
    '',
    `> Generated: ${new Date().toISOString()}`,
    `> Target Artist: ${TARGET_ARTIST_NAME} (ID: ${TARGET_ARTIST_ID})`,
    '',
    '## Summary',
    '',
    `| Metric | Count | % |`,
    `|--------|-------|---|`,
    `| Total Sampled | ${results.total} | 100% |`,
    `| classified as **${TARGET_ARTIST_NAME} Solo** | ${results.soloCount} | ${((results.soloCount / results.total) * 100).toFixed(1)}% |`,
    `| Other / Collab | ${results.collabCount} | ${((results.collabCount / results.total) * 100).toFixed(1)}% |`,
    '',
    '## Classification Details',
    '',
    '| ID | Title | Primary Artists | Featured | Result | Reason |',
    '|----|-------|-----------------|----------|--------|--------|',
  ]

  for (const r of results.details) {
    const primary = r.primary.join(', ')
    const featured = r.featured.length > 0 ? r.featured.join(', ') : '(none)'
    const resultIcon = r.isSolo ? '✅ Solo' : '🤝 Collab'

    mdLines.push(
      `| ${r.id} | ${escapePipe(r.title)} | ${escapePipe(primary)} | ${escapePipe(featured)} | ${resultIcon} | ${r.reason} |`,
    )
  }

  // Write to file
  const outputPath = path.join(
    process.cwd(),
    'data',
    'solo-classification-results.md',
  )
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, mdLines.join('\n'))

  console.log(`✅ Analyzed ${songs.length} songs.`)
  console.log(
    `TYPE: ${((results.soloCount / results.total) * 100).toFixed(1)}% Solo`,
  )
  console.log(`📄 Results saved to: ${outputPath}`)

  await db.$disconnect()
}

function escapePipe(str: string) {
  return str.replace(/\|/g, '\\|')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
