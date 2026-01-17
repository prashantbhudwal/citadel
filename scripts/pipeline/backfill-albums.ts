#!/usr/bin/env node

/**
 * Re-fetches metadata for false-positive songs to populate Album data.
 */

import { db } from '@/server/prisma'
import { fetchSongMetadata } from '@/server/lyrics/genius-api'
import { persistSongMetadata } from '@/server/lyrics/db/db'

const IDS_TO_REFETCH = [
  8092176, // Without Me (Olly James Festival Bootleg)
  12461600, // Keys To The City [Unreleased]
  12279927, // Rhymes With "Silver" (Post on X)
  9369552, // Jimmy, Brian & Mike [V1]
  3413354, // Cleanin' Out My Closet (Drum & Bass Remix)
  3883379, // Interview With Hot 97
  1790623, // Man With Van (Skit)
  4755260, // Without Me (Instrumental)
  9473105, // Without Me (Hardwell & Maddix Remix)
  188961, // Rhyme Time With Eminem
  12277268, // Without Me (Russian Cover)
  3209304, // Take 87 & A Half
  10588531, // Liner #1
  12809808, // Murder, Murder (Original Demo Version)
  11772179, // Infinite Shout Outs
  5257234, // Lose Yourself (Live)
  11359679, // Killer (Demo Version)
  8039129, // Lose Yourself (Movie Demo)
  6286339, // Thus Far (Interlude)
  49803, // It's Been Real (Outro)
  59348, // Phone Tap (Freestyle)
  8617034, // Just Lose It (Acapella)
  12325552, // Pill Pop Symphony
  268736, // 8 Mile: Maurice Grant vs B-Rabbit
  654323, // The Interview Elderly Freestyle
  5518294, // One-Handed Juggler (Original)
  8039040, // Brain Damage (Live)
  140754, // Em Calls Paul (Skit)
  12010318, // I Am Eminem 2 (Skit)
  739384, // Brain Damage (Snippet)
  5817443, // Benzino Diss Interlude
  414562, // The Slim Shady Show Freestyle
]

async function main() {
  console.log(
    '🔄 Re-fetching metadata for false positives to backfill albums...\n',
  )

  let count = 0
  for (const id of IDS_TO_REFETCH) {
    try {
      console.log(`[${++count}/${IDS_TO_REFETCH.length}] Fetching ${id}...`)
      const { metadata } = await fetchSongMetadata({ songId: id })
      await persistSongMetadata(id, metadata)
    } catch (e) {
      console.error(`❌ Error fetching ${id}:`, e)
    }
    // minimal delay to check nice
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  console.log('\n✅ Backfill complete.')
  await db.$disconnect()
}

main().catch(console.error)
