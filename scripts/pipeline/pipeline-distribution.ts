#!/usr/bin/env node

import { db } from '@/server/prisma'
import crypto from 'crypto'

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
  /[\(\[\{]\s*(clean|dirty|acapella|a cappella|leaked|v\d+)\s*[\)\]\}]/i

function normalizeLyrics(s: string) {
  // Aggressive: lowercase, remove all non-alphanumeric chars (inc punctuation/spaces)
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function main() {
  console.log('🚀 Starting Filtering Pipeline (Strict Solo Studio)...\n')

  const allSongs = await db.song.findMany({
    include: {
      primaryArtists: true,
      featuredArtists: true,
      album: true,
    },
  })

  let currentSet = allSongs
  const stages: { name: string; count: number }[] = [
    { name: 'Total Initial Songs', count: allSongs.length },
  ]

  // 1. Primary artist target check
  currentSet = currentSet.filter((s) => s.primaryArtistId === TARGET_ARTIST_ID)
  stages.push({
    name: 'Stage 1: Target Artist (ID: 45)',
    count: currentSet.length,
  })

  // 2. Filter Instrumentals
  currentSet = currentSet.filter((s) => s.instrumental === false)
  stages.push({ name: 'Stage 2: Not Instrumental', count: currentSet.length })

  // 3. Filter isNotMusic
  currentSet = currentSet.filter((s) => s.isMusic !== false)
  stages.push({
    name: 'Stage 3: isMusic (Not False)',
    count: currentSet.length,
  })

  // 4. Lyrics State Complete
  currentSet = currentSet.filter((s) => s.lyricsState === 'complete')
  stages.push({
    name: 'Stage 4: Lyrics State Complete',
    count: currentSet.length,
  })

  // 5. Solo Filter (Topology)
  currentSet = currentSet.filter(
    (s) => s.primaryArtists.length === 1 && s.featuredArtists.length === 0,
  )
  stages.push({
    name: 'Stage 5: Solo (1 Primary, 0 Features)',
    count: currentSet.length,
  })

  // 6. Content Filter (Keywords)
  currentSet = currentSet.filter((s) => {
    const titleLower = s.title.toLowerCase()

    // Check standard blacklist
    const hasBlacklistKeyword = SUSPICIOUS_KEYWORDS.some((k) =>
      titleLower.includes(k),
    )
    if (hasBlacklistKeyword) return false

    // Check delimited variants like (Clean) or [Dirty]
    if (DELIMITED_VARIANTS_REGEX.test(s.title)) return false

    return true
  })
  stages.push({
    name: 'Stage 6: Keyword & Version Blacklist',
    count: currentSet.length,
  })

  // 7. Freestyle Filter
  currentSet = currentSet.filter((s) => {
    const titleLower = s.title.toLowerCase()
    return !titleLower.includes('freestyle')
  })
  stages.push({ name: 'Stage 7: Not Freestyle', count: currentSet.length })

  // 8. Short Song Filter (< 300 words)
  currentSet = currentSet.filter((s) => {
    if (!s.lyrics) return false
    const count = s.lyrics.trim().split(/\s+/).length
    return count >= 300
  })
  stages.push({ name: 'Stage 8: Word Count >= 300', count: currentSet.length })

  // 9. Content Deduplication (Hash Check)
  const seenHashes = new Set<string>()
  currentSet = currentSet.filter((s) => {
    if (!s.lyrics) return false
    const norm = normalizeLyrics(s.lyrics)
    const hash = crypto.createHash('md5').update(norm).digest('hex')

    if (seenHashes.has(hash)) return false // Duplicate content
    seenHashes.add(hash)
    return true
  })
  stages.push({
    name: 'Stage 9: Lyrics Content Deduplication',
    count: currentSet.length,
  })

  // Output Attrition
  console.log('📉 --- Attrition Report ---')
  stages.forEach((s) => {
    console.log(`${s.name.padEnd(45)} | ${s.count}`)
  })

  // Final Stats
  const finalCounts = currentSet.map(
    (s) => s.lyrics!.trim().split(/\s+/).length,
  )
  const totalWords = finalCounts.reduce((a, b) => a + b, 0)
  const avg = totalWords / finalCounts.length
  const sortedCounts = [...finalCounts].sort((a, b) => a - b)
  const median = sortedCounts[Math.floor(sortedCounts.length / 2)]

  const songsWithAlbum = currentSet.filter((s) => !!s.album).length
  const songsWithoutAlbum = currentSet.length - songsWithAlbum

  console.log('\n📈 --- Final Dataset Summary (Strict Solo Studio) ---')
  console.log(`Total Clean Solo Studio Songs: ${currentSet.length}`)
  console.log(`Average Word Count:           ${Math.round(avg)}`)
  console.log(`Median Word Count:            ${median}`)
  console.log(`Min Word Count:               ${sortedCounts[0]}`)
  console.log(
    `Max Word Count:               ${sortedCounts[sortedCounts.length - 1]}`,
  )
  console.log(
    `Has Album Data:               ${songsWithAlbum} (${Math.round((songsWithAlbum / currentSet.length) * 100)}%)`,
  )
  console.log(
    `Missing Album Data:           ${songsWithoutAlbum} (${Math.round((songsWithoutAlbum / currentSet.length) * 100)}%)`,
  )

  // Distribution
  console.log('\n📊 --- Final Word Count Distribution (Bucket: 50) ---')
  const bucketSize = 50
  const dist: Record<number, number> = {}
  for (const count of finalCounts) {
    const bucket = Math.floor(count / bucketSize) * bucketSize
    dist[bucket] = (dist[bucket] || 0) + 1
  }

  console.log('| Range | Count |')
  console.log('|---|---|')
  const buckets = Object.keys(dist)
    .map(Number)
    .sort((a, b) => a - b)
  for (const b of buckets) {
    console.log(`| ${b} - ${b + bucketSize} | ${dist[b]} |`)
  }
}

main().catch(console.error)
