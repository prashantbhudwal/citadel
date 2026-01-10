#!/usr/bin/env node

/**
 * Dumps full song records for manually identified false positives.
 * These are tracks that passed "isSolo" but are not standard studio songs.
 */

import { db } from '@/server/prisma'
import * as fs from 'fs'
import * as path from 'path'

const IDS_TO_DUMP = [
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
  console.log('🔍 Dumping full records for suspected false positives...\n')

  const songs = await db.song.findMany({
    where: {
      id: { in: IDS_TO_DUMP },
    },
    include: {
      primaryArtists: true,
      featuredArtists: true,
      album: true,
    },
  })

  let md = `# False Positive "Solo" Songs Analysis\n\n`
  md += `> Analysis of ${songs.length} manually selected tracks that passed solo classification but shouldn't have.\n\n`

  for (const song of songs) {
    md += `## ${song.title} (ID: ${song.id})\n\n`
    md += `- **Full Title**: ${song.fullTitle}\n`
    md += `- **URL**: ${song.url}\n`
    md += `- **Release Date**: ${song.releaseDateYear}-${song.releaseDateMonth}-${song.releaseDateDay}\n`
    md += `- **Dataset**: \n`
    md += `  - Instrumental: ${song.instrumental}\n`
    md += `  - Is Music: ${song.isMusic}\n`
    md += `  - Recording Location: ${song.recordingLocation || 'N/A'}\n`
    md += `  - Language: ${song.language}\n`
    md += `  - Stats Hot: ${song.statsHot}\n`
    md += `- **Artists**:\n`
    md += `  - Artist Names (String): "${song.artistNames}"\n`
    md += `  - Primary (Relations): ${song.primaryArtists.map((a) => a.name).join(', ')}\n`
    md += `  - Featured (Relations): ${song.featuredArtists.map((a) => a.name).join(', ')}\n`

    if (song.album) {
      md += `- **Album**:\n`
      md += `  - ID: ${song.album.id}\n`
      md += `  - Name: ${song.album.name}\n`
      md += `  - Full Title: ${song.album.fullTitle}\n`
      md += `  - Release Date: ${song.album.releaseDateYear}-${song.album.releaseDateMonth}-${song.album.releaseDateDay}\n`
      md += `  - Artist: ${song.album.nameWithArtist} (ID: ${song.album.artistId})\n`
      md += `  - URL: ${song.album.url}\n`
    } else {
      md += `- **Album**: None (Single/Unlinked)\n`
    }

    md += `- **Lyrics Sample**: "${song.lyrics?.slice(0, 100).replace(/\n/g, ' ') || 'None'}..."\n`
    md += `\n---\n\n`
  }

  const outputPath = path.join(
    process.cwd(),
    'data',
    'false-positives-details.md',
  )
  fs.writeFileSync(outputPath, md)

  console.log(`✅ Dumped ${songs.length} records.`)
  console.log(`📄 Check file: ${outputPath}`)

  await db.$disconnect()
}

main().catch(console.error)
