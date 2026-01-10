#!/usr/bin/env node

import { db } from '@/server/prisma'
import fs from 'fs'
import path from 'path'
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

const DELIMITED_VARIANTS_REGEX =
  /[\(\[\{]\s*(clean|dirty|acapella|a cappella|v\d+)\s*[\)\]\}]/i

function normalizeTitle(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
}

function normalizeLyrics(s: string) {
  // Aggressive: lowercase, remove all non-alphanumeric chars (inc punctuation/spaces)
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function main() {
  console.log(
    '🕵️‍♀️ Running Hash-Based Duplicate Detection on Strict Solo Studio Dataset...\n',
  )

  const allSongs = await db.song.findMany({
    include: {
      primaryArtists: true,
      featuredArtists: true,
      album: true,
    },
  })

  // Apply Strict Solo Studio Filter (v2.1 = 231 songs)
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

  console.log(`Analyzing ${filtered.length} songs...\n`)

  // --- Title Collision Analysis ---
  const titleMap = new Map<string, typeof filtered>()
  filtered.forEach((s) => {
    const hash = normalizeTitle(s.title)
    if (!titleMap.has(hash)) titleMap.set(hash, [])
    titleMap.get(hash)!.push(s)
  })

  const titleDuplicates = Array.from(titleMap.entries())
    .filter(([_, songs]) => songs.length > 1)
    .map(([hash, songs]) => ({
      hash,
      songs: songs.map((s) => `"${s.title}" (ID: ${s.id})`),
    }))

  // --- Lyrics Collision Analysis ---
  const lyricsMap = new Map<string, typeof filtered>()
  filtered.forEach((s) => {
    if (!s.lyrics) return
    // Hash the normalized lyrics to save memory
    const norm = normalizeLyrics(s.lyrics)
    const hash = crypto.createHash('md5').update(norm).digest('hex')

    if (!lyricsMap.has(hash)) lyricsMap.set(hash, [])
    lyricsMap.get(hash)!.push(s)
  })

  const lyricsDuplicates = Array.from(lyricsMap.entries())
    .filter(([_, songs]) => songs.length > 1)
    .map(([hash, songs]) => ({
      hash,
      count: songs.length,
      songs: songs.map((s) => `"${s.title}" (ID: ${s.id})`),
    }))

  // --- Output ---
  const output = {
    titleDuplicateGroups: titleDuplicates,
    lyricsDuplicateGroups: lyricsDuplicates,
  }

  const outPath = path.resolve(process.cwd(), 'data/hash-duplicates.json')
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))

  console.log('--- Title Duplicates ---')
  if (titleDuplicates.length === 0) console.log('✅ No title collisions found.')
  else
    titleDuplicates.forEach((g) => {
      console.log(`⚠️  "${g.hash}": ${g.songs.join(', ')}`)
    })

  console.log('\n--- Lyrics Duplicates ---')
  if (lyricsDuplicates.length === 0)
    console.log('✅ No lyrics collisions found.')
  else
    lyricsDuplicates.forEach((g) => {
      console.log(`⚠️  Same Content (${g.count}): ${g.songs.join(', ')}`)
    })

  console.log(`\n📂 Full Report: ${outPath}`)
}

main().catch(console.error)
