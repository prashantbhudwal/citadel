#!/usr/bin/env node

import { db } from '@/server/prisma'
import fs from 'fs'
import path from 'path'

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
  console.log('📦 Generating Full Data Dump for "KEPT" Songs...\n')

  // 1. Fetch potentially solo songs (P=1, F=0)
  // We fetch minimal data first to filter
  const candidates = await db.song.findMany({
    where: {
      primaryArtists: { every: { id: 45 } },
      featuredArtists: { none: {} },
    },
    select: { id: true, title: true },
  })

  // 2. Apply Filters to get "Kept" list
  const keptIds = candidates
    .filter(
      (s) =>
        !SUSPICIOUS_KEYWORDS.some((k) => s.title.toLowerCase().includes(k)),
    )
    .map((s) => s.id)

  // 3. Shuffle and pick 20 for deep inspection (User asked for "randomly test")
  // or should we dump ALL kept? "dump data... of the Kept list".
  // Let's dump a generous sample (50) to be safe but not overwhelm a single MD file if there are hundreds.
  // Actually, there are ~300 "Safe" songs. Let's dump 50 random ones.
  const sampleIds = keptIds
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
    .slice(0, 50)

  // 4. Fetch FULL data for the sample
  const fullSongs = await db.song.findMany({
    where: { id: { in: sampleIds } },
    include: {
      primaryArtists: true,
      featuredArtists: true,
      album: true,
      albums: {
        include: { artist: true },
      },
    },
  })

  // 5. Build Markdown
  let md = `# Data Dump: "Kept" Songs (Sample of ${fullSongs.length})\n\n`
  md += `> Logic: Primary=Eminem, Featured=None, No Suspicious Keywords \n`
  md += `> Generated: ${new Date().toISOString()}\n\n`

  for (const song of fullSongs) {
    md += `## 🎵 ${song.title} (ID: ${song.id})\n\n`

    md += `### 📄 Song Table Data\n`
    md += `| Field | Value |\n`
    md += `|---|---|\n`
    md += `| URL | ${song.url} |\n`
    md += `| Release Date | ${song.releaseDateYear}-${song.releaseDateMonth}-${song.releaseDateDay} |\n`
    md += `| Metadata Fetched | ${song.metadataFetchedAt?.toISOString() || '❌'} |\n`
    md += `| Lyrics State | ${song.lyricsState} |\n`

    md += `\n### 🎤 Primary Artists (Link Table)\n`
    if (song.primaryArtists.length > 0) {
      md += `| ID | Name | URL |\n`
      md += `|---|---|---|\n`
      for (const a of song.primaryArtists) {
        md += `| ${a.id} | **${a.name}** | ${a.url} |\n`
      }
    } else {
      md += `_(None)_\n`
    }

    md += `\n### 💿 Primary Album (FK)\n`
    if (song.album) {
      md += `| Field | Value |\n`
      md += `|---|---|\n`
      md += `| ID | ${song.album.id} |\n`
      md += `| Name | **${song.album.name}** |\n`
      md += `| Full Title | ${song.album.fullTitle} |\n`
      md += `| Release Date | ${song.album.releaseDateYear}-${song.album.releaseDateMonth}-${song.album.releaseDateDay} |\n`
    } else {
      md += `❌ **NO PRIMARY ALBUM LINKED**\n`
    }

    md += `\n### 📚 All Linked Albums (M2M)\n`
    if (song.albums.length > 0) {
      md += `| ID | Name | Artist |\n`
      md += `|---|---|---|\n`
      for (const a of song.albums) {
        md += `| ${a.id} | ${a.name} | ${a.artist.name} |\n`
      }
    } else {
      md += `_(None)_\n`
    }

    md += `\n---\n\n`
  }

  const outPath = path.resolve(process.cwd(), 'data/kept-songs-dump.md')
  fs.writeFileSync(outPath, md)
  console.log(`✅ Dump saved to: ${outPath}`)
}

main().catch(console.error)
