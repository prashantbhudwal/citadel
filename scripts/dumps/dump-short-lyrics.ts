#!/usr/bin/env node

import { db } from '@/server/prisma'
import fs from 'fs'
import path from 'path'

async function main() {
  console.log('📦 Generating Data Dump for Lyrics (50-100 words)...\n')

  const songsWithLyrics = await db.song.findMany({
    where: {
      lyrics: { not: null },
      instrumental: false,
    },
    select: {
      id: true,
      title: true,
      lyrics: true,
      url: true,
      album: { select: { name: true } },
    },
  })

  const shortSongs = []

  for (const song of songsWithLyrics) {
    if (!song.lyrics) continue
    const wordCount = song.lyrics.trim().split(/\s+/).length

    if (wordCount >= 50 && wordCount < 100) {
      shortSongs.push({ ...song, wordCount })
    }
  }

  // Sort by word count (shortest first)
  shortSongs.sort((a, b) => a.wordCount - b.wordCount)

  let md = `# Data Dump: Lyrics (50-100 words)\n\n`
  md += `> Found ${shortSongs.length} tracks with 50-100 words (excluding marked instrumentals).\n`
  md += `> Generated: ${new Date().toISOString()}\n\n`

  md += `| ID | Title | Words | Album | URL |\n`
  md += `|---|---|---|---|---|\n`

  for (const s of shortSongs) {
    const albumName = s.album?.name || '_(No Album)_'
    md += `| ${s.id} | **${s.title}** | ${s.wordCount} | ${albumName} | [Link](${s.url}) |\n`
  }

  md += `\n## Content Preview\n\n`

  for (const s of shortSongs) {
    md += `### [${s.wordCount} words] ${s.title}\n`
    md += `**Album**: ${s.album?.name || 'N/A'} | **ID**: ${s.id}\n\n`
    md += `\`\`\`text\n${s.lyrics}\n\`\`\`\n\n`
    md += `---\n\n`
  }

  const outPath = path.resolve(process.cwd(), 'data/lyrics-50-100-dump.md')
  fs.writeFileSync(outPath, md)
  console.log(`✅ Dump saved to: ${outPath}`)
}

main().catch(console.error)
