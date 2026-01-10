#!/usr/bin/env node

import { db } from '@/server/prisma'

const SUSPICIOUS_KEYWORDS = [
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

async function main() {
  console.log('🧪 Testing Keyword Filter Logic...\n')

  // 1. Fetch ALL currently classified "Solo" songs (Current Logic: P=1, F=0)
  const allSoloSongs = await db.song.findMany({
    where: {
      primaryArtists: { every: { id: 45 } }, // Only Eminem primary
      // primaryArtistId: 45 // redundant but safe
      featuredArtists: { none: {} },
    },
    select: { id: true, title: true, albumId: true },
  })

  // 2. Shuffle and Take 50
  const sample = allSoloSongs
    .map((val) => ({ val, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ val }) => val)
    .slice(0, 50)

  console.log(`Checking ${sample.length} random solo tracks:\n`)

  const kept = []
  const dropped = []

  for (const song of sample) {
    const titleLower = song.title.toLowerCase()
    const matchedKeyword = SUSPICIOUS_KEYWORDS.find((k) =>
      titleLower.includes(k),
    )

    if (matchedKeyword) {
      dropped.push({ ...song, reason: matchedKeyword })
    } else {
      kept.push(song)
    }
  }

  console.log('❌ WOULD BE DROPPED (Potential False Positives?):')
  if (dropped.length === 0) console.log('  (None in this sample)')
  for (const s of dropped) {
    console.log(
      `  - [${s.reason}] "${s.title}" ${s.albumId ? '(Has Album)' : '(No Album)'}`,
    )
  }

  console.log('\n✅ WOULD BE KEPT:')
  for (const s of kept) {
    console.log(`  - "${s.title}"`)
  }

  console.log(`\nStats: Dropped ${dropped.length} / Kept ${kept.length}`)
}

main().catch(console.error)
