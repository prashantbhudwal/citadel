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

// Regex to catch clean/dirty/acapella/version variants in any common delimiters
const DELIMITED_VARIANTS_REGEX =
  /[\(\[\{]\s*(clean|dirty|acapella|v\d+)\s*[\)\]\}]/i

async function main() {
  console.log(
    '🕵️‍♀️ Scanning for Trojan Features in Strict Solo Studio Dataset...\n',
  )

  const allSongs = await db.song.findMany({
    include: {
      primaryArtists: true,
      featuredArtists: true,
      album: true,
    },
  })

  // Apply the exact filtering logic (234 set)
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

  // Trojan Analysis
  // Looking for: [ ... Eminem ... (and|&|+|-|with) ... ] ignoring case
  // The header must contain "Eminem" AND a connector.
  const TROJAN_REGEX =
    /\[.*eminem.*(\s+and\s+|\s+&\s+|\s+\+\s+|\s+-\s+|\s+with\s+).+\]/i

  // Also check for headers that explicitly name another artist WITHOUT mentioning Eminem?
  // User asked for: "inside the delimiters there is Eminem along with 'and' keyword, or & sign or + -"
  const STRICT_TROJAN_REGEX =
    /[\[\(].*eminem.*(\s+and\s+|&|\+|\s+-\s+).*[\]\)]/i

  const trojanSongs = []

  for (const s of filtered) {
    if (!s.lyrics) continue

    const lines = s.lyrics.split('\n')
    const trojanHeaders = lines.filter((line) => STRICT_TROJAN_REGEX.test(line))

    if (trojanHeaders.length > 0) {
      trojanSongs.push({
        id: s.id,
        title: s.title,
        headers: trojanHeaders,
        url: s.url,
      })
    }
  }

  const outPath = path.resolve(process.cwd(), 'data/trojan-features.json')
  fs.writeFileSync(outPath, JSON.stringify(trojanSongs, null, 2))

  console.log(`✅ Found ${trojanSongs.length} Potential Trojan Features.`)
  console.log(`📂 Saved to: ${outPath}`)

  if (trojanSongs.length > 0) {
    console.log('\n--- Detected Trojan Headers ---')
    trojanSongs.forEach((s) => {
      console.log(`\n🎵 ${s.title} (ID: ${s.id})`)
      s.headers.forEach((h) => console.log(`   ${h}`))
    })
  }
}

main().catch(console.error)
