#!/usr/bin/env node

import { db } from '@/server/prisma'

async function main() {
  console.log('📝 Analyzing Lyrics Length distributions...\n')

  const songsWithLyrics = await db.song.findMany({
    where: {
      lyrics: { not: null },
    },
    select: {
      id: true,
      title: true,
      lyrics: true,
    },
  })

  console.log(`Total Songs with Lyrics: ${songsWithLyrics.length}\n`)

  const stats = {
    less20: 0,
    less50: 0,
    less100: 0,
    less150: 0,
    less200: 0,
    more200: 0,
  }

  const examples = {
    less20: [] as string[],
  }

  for (const song of songsWithLyrics) {
    if (!song.lyrics) continue

    // Simple whitespace split counting
    const wordCount = song.lyrics.trim().split(/\s+/).length

    if (wordCount < 20) {
      stats.less20++
      if (examples.less20.length < 10)
        examples.less20.push(`${song.title} (${wordCount} words)`)
    } else if (wordCount < 50) {
      stats.less50++
    } else if (wordCount < 100) {
      stats.less100++
    } else if (wordCount < 150) {
      stats.less150++
    } else if (wordCount < 200) {
      stats.less200++
    } else {
      stats.more200++
    }
  }

  console.log('| Word Count | Number of Songs |')
  console.log('|---|---|')
  console.log(`| < 20 words | ${stats.less20} |`)
  console.log(`| < 50 words | ${stats.less50} |`)
  console.log(`| < 100 words | ${stats.less100} |`)
  console.log(`| < 150 words | ${stats.less150} |`)
  console.log(`| < 200 words | ${stats.less200} |`)
  console.log(`| > 200 words | ${stats.more200} |`)

  console.log('\n🔍 Examples of < 20 words:')
  examples.less20.forEach((e) => console.log(`- ${e}`))
}

main().catch(console.error)
